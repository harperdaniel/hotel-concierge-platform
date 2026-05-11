import { Request, Response } from "express";
import { prisma } from "../config/database";
import { provisionHotel } from "../services/provisioning";

// Helper to extract string param (Express 5 types)
const param = (req: Request, name: string): string => req.params[name] as string;

// Strip secret fields from hotel objects before sending to clients
function sanitizeHotel<T extends Record<string, any> | null | undefined>(hotel: T): T {
  if (!hotel) return hotel;
  // Remove smtpPass and any other future secrets here
  const { smtpPass: _smtpPass, ...rest } = hotel as any;
  return rest as T;
}

// ── CRUD ──────────────────────────────────────────────

export async function listHotels(req: Request, res: Response): Promise<void> {
  const hotels = await prisma.hotel.findMany({
    where: { userId: req.user!.userId },
    include: {
      _count: { select: { menuItems: true, services: true, knowledgeEntries: true, bookings: true } },
    },
  });

  res.json({ hotels: hotels.map(sanitizeHotel) });
}

export async function getHotel(req: Request, res: Response): Promise<void> {
  const hotel = await prisma.hotel.findFirst({
    where: { id: param(req, "id"), userId: req.user!.userId },
    include: {
      knowledgeEntries: true,
      menuItems: { where: { available: true } },
      services: { include: { integration: true } },
      telegramBot: true,
      openclawConfig: true,
      venues: {
        where: { active: true },
        include: { _count: { select: { menuItems: true } }, integration: true },
        orderBy: { createdAt: "asc" },
      },
      // Top-level: bookability of room service is derived from this link.
      roomServiceIntegration: true,
      // Whole list of configured integrations — used by the dashboard's
      // integration picker drop-downs. authBlob is intentionally NOT
      // selected; secrets must only travel via the dedicated routes.
      integrations: {
        select: {
          id: true, name: true, kind: true, endpoint: true, status: true,
          lastTestedAt: true, lastError: true, createdAt: true, updatedAt: true,
          hotelId: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!hotel) {
    res.status(404).json({ error: "Hotel not found" });
    return;
  }

  res.json({ hotel: sanitizeHotel(hotel) });
}

export async function createHotel(req: Request, res: Response): Promise<void> {
  const { initialKnowledge, ...hotelData } = req.body || {};

  const hotel = await prisma.hotel.create({
    data: { ...hotelData, userId: req.user!.userId },
  });

  // Seed knowledge entries based on facility flags so the concierge has
  // sensible answers from day one. Each flag becomes a short knowledge note.
  const facilityNotes: { category: string; content: string }[] = [];
  if (hotelData.hasRestaurant) facilityNotes.push({ category: "amenities", content: `${hotel.name} has an in-house restaurant where guests can dine.` });
  if (hotelData.hasRoomService) facilityNotes.push({ category: "amenities", content: `Room service / in-room dining is available at ${hotel.name}.` });
  if (hotelData.hasSpa) facilityNotes.push({ category: "amenities", content: `${hotel.name} has a spa with treatments available for booking.` });
  if (hotelData.hasPool) facilityNotes.push({ category: "amenities", content: `There is a pool / wellness area at ${hotel.name}.` });
  if (hotelData.hasGym) facilityNotes.push({ category: "amenities", content: `A gym is available for guests at ${hotel.name}.` });
  if (hotelData.hasBar) facilityNotes.push({ category: "amenities", content: `${hotel.name} has a bar / lounge area.` });
  if (hotelData.hasConference) facilityNotes.push({ category: "amenities", content: `${hotel.name} has conference / meeting rooms available.` });
  if (hotelData.hasTransfers) facilityNotes.push({ category: "amenities", content: `Airport transfers can be arranged through the concierge.` });
  if (hotelData.petFriendly) facilityNotes.push({ category: "policies", content: `${hotel.name} is pet-friendly.` });

  // Free-text knowledge from the wizard's last step
  if (initialKnowledge && typeof initialKnowledge === "string" && initialKnowledge.trim()) {
    facilityNotes.push({ category: "general", content: initialKnowledge.trim() });
  }

  if (facilityNotes.length > 0) {
    await prisma.knowledgeEntry.createMany({
      data: facilityNotes.map(n => ({ ...n, hotelId: hotel.id })),
    });
  }

  // Auto-provision the concierge agent so the AI Manager and 'Try as a guest'
  // panels work immediately. Failures are logged but don't block hotel creation —
  // the dashboard can re-trigger provisioning from the Bot Setup tab if needed.
  try {
    await provisionHotel(hotel.id);
  } catch (provisionErr) {
    console.warn(`[createHotel] auto-provision failed for hotel ${hotel.id}:`, provisionErr);
  }

  res.status(201).json({ hotel: sanitizeHotel(hotel) });
}

export async function updateHotel(req: Request, res: Response): Promise<void> {
  const id = param(req, "id");
  // Verify ownership
  const existing = await prisma.hotel.findFirst({
    where: { id, userId: req.user!.userId },
  });

  if (!existing) {
    res.status(404).json({ error: "Hotel not found" });
    return;
  }

  // If smtpPass is empty string, treat as "don't change it" rather than overwriting with empty
  const updateData = { ...req.body };
  if (updateData.smtpPass === "") {
    delete updateData.smtpPass;
  }

  // Validate roomServiceIntegrationId belongs to this hotel (or is null/'' to unlink).
  if ("roomServiceIntegrationId" in updateData) {
    if (updateData.roomServiceIntegrationId === "" || updateData.roomServiceIntegrationId === null) {
      updateData.roomServiceIntegrationId = null;
    } else {
      const integration = await prisma.integration.findUnique({ where: { id: updateData.roomServiceIntegrationId } });
      if (!integration || integration.hotelId !== id) {
        res.status(400).json({ error: "roomServiceIntegrationId does not belong to this hotel" });
        return;
      }
    }
  }

  const hotel = await prisma.hotel.update({
    where: { id },
    data: updateData,
  });

  res.json({ hotel: sanitizeHotel(hotel) });
}

export async function deleteHotel(req: Request, res: Response): Promise<void> {
  const id = param(req, "id");
  const existing = await prisma.hotel.findFirst({
    where: { id, userId: req.user!.userId },
  });

  if (!existing) {
    res.status(404).json({ error: "Hotel not found" });
    return;
  }

  await prisma.hotel.delete({ where: { id } });
  res.status(204).send();
}

// ── Knowledge Base ────────────────────────────────────

export async function createKnowledge(req: Request, res: Response): Promise<void> {
  const id = param(req, "id");
  const hotel = await prisma.hotel.findFirst({
    where: { id, userId: req.user!.userId },
  });
  if (!hotel) { res.status(404).json({ error: "Hotel not found" }); return; }

  const entry = await prisma.knowledgeEntry.create({
    data: { ...req.body, hotelId: id },
  });

  res.status(201).json({ entry });
}

export async function listKnowledge(req: Request, res: Response): Promise<void> {
  const entries = await prisma.knowledgeEntry.findMany({
    where: { hotel: { id: param(req, "id"), userId: req.user!.userId } },
  });
  res.json({ entries });
}

// ── Menu Items ────────────────────────────────────────

export async function createMenuItem(req: Request, res: Response): Promise<void> {
  const id = param(req, "id");
  const hotel = await prisma.hotel.findFirst({
    where: { id, userId: req.user!.userId },
  });
  if (!hotel) { res.status(404).json({ error: "Hotel not found" }); return; }

  const item = await prisma.menuItem.create({
    data: { ...req.body, hotelId: id },
  });

  res.status(201).json({ item });
}

export async function listMenuItems(req: Request, res: Response): Promise<void> {
  const items = await prisma.menuItem.findMany({
    where: { hotel: { id: param(req, "id"), userId: req.user!.userId } },
    orderBy: { category: "asc" },
  });
  res.json({ items });
}

// ── Services ──────────────────────────────────────────

export async function createService(req: Request, res: Response): Promise<void> {
  const id = param(req, "id");
  const hotel = await prisma.hotel.findFirst({
    where: { id, userId: req.user!.userId },
  });
  if (!hotel) { res.status(404).json({ error: "Hotel not found" }); return; }

  const service = await prisma.service.create({
    data: { ...req.body, hotelId: id },
  });

  res.status(201).json({ service });
}

export async function listServices(req: Request, res: Response): Promise<void> {
  const services = await prisma.service.findMany({
    where: { hotel: { id: param(req, "id"), userId: req.user!.userId } },
  });
  res.json({ services });
}

export async function updateService(req: Request, res: Response): Promise<void> {
  const id = param(req, "id");
  const service = await prisma.service.findUnique({
    where: { id },
    include: { hotel: true },
  });
  if (!service || service.hotel.userId !== req.user!.userId) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  const allowed = [
    "name", "description", "durationMin", "price", "category",
    "integrationId", "bookingInstructions",
  ];
  const updates: Record<string, any> = {};
  for (const k of allowed) if (k in (req.body || {})) updates[k] = req.body[k];
  if (typeof updates.price === "number") updates.price = Math.round(updates.price);
  if (typeof updates.durationMin === "number") updates.durationMin = Math.round(updates.durationMin);
  // Validate integration belongs to the same hotel; '' or null unlinks.
  if ("integrationId" in updates) {
    if (updates.integrationId === "" || updates.integrationId === null) {
      updates.integrationId = null;
    } else {
      const integration = await prisma.integration.findUnique({ where: { id: updates.integrationId } });
      if (!integration || integration.hotelId !== service.hotelId) {
        res.status(400).json({ error: "integrationId does not belong to this hotel" });
        return;
      }
    }
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No updates" });
    return;
  }
  const updated = await prisma.service.update({ where: { id }, data: updates });
  res.json({ service: updated });
}

export async function deleteService(req: Request, res: Response): Promise<void> {
  const id = param(req, "id");
  const service = await prisma.service.findUnique({
    where: { id },
    include: { hotel: true },
  });
  if (!service || service.hotel.userId !== req.user!.userId) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  await prisma.service.delete({ where: { id } });
  res.json({ deleted: true });
}

// ── Bookings ──────────────────────────────────────────

export async function createBooking(req: Request, res: Response): Promise<void> {
  const id = param(req, "id");
  const hotel = await prisma.hotel.findFirst({
    where: { id, userId: req.user!.userId },
  });
  if (!hotel) { res.status(404).json({ error: "Hotel not found" }); return; }

  const booking = await prisma.booking.create({
    data: { ...req.body, hotelId: id },
  });

  res.status(201).json({ booking });
}

export async function listBookings(req: Request, res: Response): Promise<void> {
  const bookings = await prisma.booking.findMany({
    where: { hotel: { id: param(req, "id"), userId: req.user!.userId } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ bookings });
}
