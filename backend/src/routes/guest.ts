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
      roomServiceBookingNotes: true,
      hasRoomService: true,
      roomServiceIntegration: true,
      knowledgeEntries: true,
      menuItems: { where: { available: true }, orderBy: { category: "asc" } },
      services: { include: { integration: true } },
      venues: {
        include: {
          integration: true,
          _count: { select: { menuItems: true } },
        },
      },
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
  const { hotelId, type, guestName, guestRoom, details, venueId, serviceId } = req.body;

  if (!hotelId || !type || !guestName || !details) {
    res.status(400).json({ error: "Missing required fields: hotelId, type, guestName, details" });
    return;
  }

  if (!["table", "room_service", "service"].includes(type)) {
    res.status(400).json({ error: "Type must be 'table', 'room_service', or 'service'" });
    return;
  }

  // Verify hotel exists
  const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
  if (!hotel) {
    res.status(404).json({ error: "Hotel not found" });
    return;
  }

  // Bookability gate (defence in depth — the bot is also instructed not
  // to call this for INFO-ONLY items). An offering is bookable iff it
  // has an integration linked and the integration is not in error state.
  if (type === "room_service") {
    const hotelWithInt = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { roomServiceIntegration: true },
    });
    const integration = hotelWithInt?.roomServiceIntegration;
    if (!integration || integration.status === "error") {
      res.status(409).json({
        error: "room_service_not_bookable",
        message: "Room service is informational only at this hotel (no working integration is linked). Direct the guest to the front desk or kitchen extension to place the order.",
      });
      return;
    }
  }
  if (type === "table" && venueId) {
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      include: { integration: true },
    });
    if (!venue || venue.hotelId !== hotelId) {
      res.status(404).json({ error: "Venue not found" });
      return;
    }
    if (!venue.integration || venue.integration.status === "error") {
      res.status(409).json({
        error: "venue_not_bookable",
        message: `${venue.name} is informational only (no working integration is linked). Direct the guest to call the venue or the front desk.`,
      });
      return;
    }
  }
  if (type === "service" && serviceId) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { integration: true },
    });
    if (!service || service.hotelId !== hotelId) {
      res.status(404).json({ error: "Service not found" });
      return;
    }
    if (!service.integration || service.integration.status === "error") {
      res.status(409).json({
        error: "service_not_bookable",
        message: `${service.name} is informational only (no working integration is linked). Direct the guest to the appropriate human channel (front desk, spa reception, etc.).`,
      });
      return;
    }
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
