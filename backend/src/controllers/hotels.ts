import { Request, Response } from "express";
import { prisma } from "../config/database";

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
      services: true,
      telegramBot: true,
      openclawConfig: true,
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
