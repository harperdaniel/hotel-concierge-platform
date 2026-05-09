import { Router } from "express";
import { prisma } from "../config/database";

const router = Router();

// ── Get hotel data for the concierge agent ────────────

router.get("/hotels/:id/data", async (req, res) => {
  const hotel = await prisma.hotel.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      email: true,
      timezone: true,
      conciergeName: true,
      knowledgeEntries: true,
      menuItems: { where: { available: true }, orderBy: { category: "asc" } },
      services: true,
      venues: { include: { _count: { select: { menuItems: true } } } },
    },
  });

  if (!hotel) {
    res.status(404).json({ error: "Hotel not found" });
    return;
  }

  res.json({ hotel });
});

// ── Create a booking (from concierge agent) ───────────

router.post("/bookings", async (req, res) => {
  const { hotelId, type, guestName, guestRoom, details } = req.body;

  if (!hotelId || !type || !guestName || !details) {
    res.status(400).json({ error: "Missing required fields: hotelId, type, guestName, details" });
    return;
  }

  if (!["table", "room_service"].includes(type)) {
    res.status(400).json({ error: "Type must be 'table' or 'room_service'" });
    return;
  }

  // Verify hotel exists
  const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
  if (!hotel) {
    res.status(404).json({ error: "Hotel not found" });
    return;
  }

  const booking = await prisma.booking.create({
    data: { hotelId, type, guestName, guestRoom, details, status: "pending" },
  });

  console.log(`📅 New booking at "${hotel.name}": ${type} for ${guestName} — ${details}`);

  res.status(201).json({ booking });
});

// ── Identify hotel from start parameter ───────────────

router.post("/identify", async (req, res) => {
  const { startParam } = req.body;

  if (!startParam || typeof startParam !== "string") {
    res.status(400).json({ error: "startParam is required" });
    return;
  }

  try {
    // Format: hotel-{base64url(hotelId)}
    const prefix = "hotel-";
    if (!startParam.startsWith(prefix)) {
      res.status(400).json({ error: "Invalid start parameter format" });
      return;
    }

    const b64 = startParam.slice(prefix.length);
    const hotelId = Buffer.from(b64, "base64url").toString("utf-8");

    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { id: true, name: true, conciergeName: true },
    });

    if (!hotel) {
      res.status(404).json({ error: "Hotel not found for this link" });
      return;
    }

    res.json({ hotelId: hotel.id, hotelName: hotel.name, conciergeName: hotel.conciergeName });
  } catch {
    res.status(400).json({ error: "Invalid start parameter" });
  }
});

// ── List hotels (for discovery) ───────────────────────

router.get("/hotels", async (_req, res) => {
  const hotels = await prisma.hotel.findMany({
    select: { id: true, name: true },
  });

  res.json({ hotels });
});

export default router;
