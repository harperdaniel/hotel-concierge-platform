import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { prisma } from "../config/database";

const router = Router();
router.use(authenticate);

const VALID_KINDS = ["restaurant", "bar", "lounge", "room_service", "cafe"];

async function ownsHotel(userId: string, hotelId: string) {
  return prisma.hotel.findFirst({ where: { id: hotelId, userId } });
}

// ── List venues for a hotel ───────────────────────────

router.get("/hotels/:id/venues", async (req, res) => {
  const id = req.params.id as string;
  if (!(await ownsHotel(req.user!.userId, id))) {
    res.status(404).json({ error: "Hotel not found" });
    return;
  }
  const venues = await prisma.venue.findMany({
    where: { hotelId: id, active: true },
    include: { _count: { select: { menuItems: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json({ venues });
});

// ── Get single venue with its items ───────────────────

router.get("/venues/:id", async (req, res) => {
  const id = req.params.id as string;
  const venue = await prisma.venue.findUnique({
    where: { id },
    include: { hotel: true, menuItems: { orderBy: { category: "asc" } } },
  });
  if (!venue || venue.hotel.userId !== req.user!.userId) {
    res.status(404).json({ error: "Venue not found" });
    return;
  }
  res.json({ venue });
});

// ── Create a venue ────────────────────────────────────

router.post("/hotels/:id/venues", async (req, res) => {
  const id = req.params.id as string;
  if (!(await ownsHotel(req.user!.userId, id))) {
    res.status(404).json({ error: "Hotel not found" });
    return;
  }
  const { name, kind, description, hours, location } = req.body || {};
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const venue = await prisma.venue.create({
    data: {
      hotelId: id,
      name: name.trim(),
      kind: VALID_KINDS.includes(kind) ? kind : "restaurant",
      description: description ?? null,
      hours: hours ?? null,
      location: location ?? null,
    },
  });
  res.status(201).json({ venue });
});

// ── Update a venue ────────────────────────────────────

router.patch("/venues/:id", async (req, res) => {
  const id = req.params.id as string;
  const venue = await prisma.venue.findUnique({ where: { id }, include: { hotel: true } });
  if (!venue || venue.hotel.userId !== req.user!.userId) {
    res.status(404).json({ error: "Venue not found" });
    return;
  }
  const allowed = ["name", "kind", "description", "hours", "location", "active"];
  const updates: Record<string, any> = {};
  for (const k of allowed) if (k in (req.body || {})) updates[k] = req.body[k];
  if (updates.kind && !VALID_KINDS.includes(updates.kind)) {
    res.status(400).json({ error: "Invalid kind" });
    return;
  }
  const updated = await prisma.venue.update({ where: { id }, data: updates });
  res.json({ venue: updated });
});

// ── Delete a venue (and unlink its items) ─────────────

router.delete("/venues/:id", async (req, res) => {
  const id = req.params.id as string;
  const venue = await prisma.venue.findUnique({ where: { id }, include: { hotel: true } });
  if (!venue || venue.hotel.userId !== req.user!.userId) {
    res.status(404).json({ error: "Venue not found" });
    return;
  }
  await prisma.venue.delete({ where: { id } });
  res.json({ deleted: true });
});

// ── Add a menu item to a venue ────────────────────────

router.post("/venues/:id/menu-items", async (req, res) => {
  const id = req.params.id as string;
  const venue = await prisma.venue.findUnique({ where: { id }, include: { hotel: true } });
  if (!venue || venue.hotel.userId !== req.user!.userId) {
    res.status(404).json({ error: "Venue not found" });
    return;
  }
  const { name, description, price, category, availableForRoomService } = req.body || {};
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "name is required" });
    return;
  }
  if (typeof price !== "number" || price < 0) {
    res.status(400).json({ error: "price (in øre) is required" });
    return;
  }
  if (!category || typeof category !== "string") {
    res.status(400).json({ error: "category is required" });
    return;
  }
  const item = await prisma.menuItem.create({
    data: {
      hotelId: venue.hotelId,
      venueId: venue.id,
      name: name.trim(),
      description: description ?? null,
      price: Math.round(price),
      category,
      availableForRoomService:
        typeof availableForRoomService === "boolean" ? availableForRoomService : true,
    },
  });
  res.status(201).json({ item });
});

// ── Update a menu item (toggle room-service flag, move venue, etc.) ───

router.patch("/menu-items/:id", async (req, res) => {
  const id = req.params.id as string;
  const item = await prisma.menuItem.findUnique({
    where: { id },
    include: { hotel: true },
  });
  if (!item || item.hotel.userId !== req.user!.userId) {
    res.status(404).json({ error: "Menu item not found" });
    return;
  }
  const allowed = ["name", "description", "price", "category", "available", "availableForRoomService", "venueId"];
  const updates: Record<string, any> = {};
  for (const k of allowed) if (k in (req.body || {})) updates[k] = req.body[k];
  if (typeof updates.price === "number") updates.price = Math.round(updates.price);
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No updates" });
    return;
  }
  const updated = await prisma.menuItem.update({ where: { id }, data: updates });
  res.json({ item: updated });
});

// ── Delete a menu item ────────────────────────────────

router.delete("/menu-items/:id", async (req, res) => {
  const id = req.params.id as string;
  const item = await prisma.menuItem.findUnique({
    where: { id },
    include: { hotel: true },
  });
  if (!item || item.hotel.userId !== req.user!.userId) {
    res.status(404).json({ error: "Menu item not found" });
    return;
  }
  await prisma.menuItem.delete({ where: { id } });
  res.json({ deleted: true });
});

export default router;
