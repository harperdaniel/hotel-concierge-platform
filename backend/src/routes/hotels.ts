import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { importFromWebsite } from "../services/website-import";
import { guestChat } from "../services/guest-chat";
import {
  createHotelSchema,
  updateHotelSchema,
  createKnowledgeSchema,
  createMenuItemSchema,
  createServiceSchema,
  createBookingSchema,
} from "../utils/schemas";
import {
  listHotels, getHotel, createHotel, updateHotel, deleteHotel,
  createKnowledge, listKnowledge,
  createMenuItem, listMenuItems,
  createService, listServices, updateService, deleteService,
  createBooking, listBookings,
} from "../controllers/hotels";

const router = Router();

// All routes require authentication
router.use(authenticate);

import { prisma } from "../config/database";

// ── Wizard: apply confirmed suggestions to a hotel ──────────────
router.post("/:id/apply-import", async (req: any, res) => {
  const id = req.params.id as string;
  const hotel = await prisma.hotel.findFirst({ where: { id, userId: req.user.userId } });
  if (!hotel) {
    res.status(404).json({ error: "Hotel not found" });
    return;
  }
  const data = req.body || {};

  let venuesCreated = 0;
  let menuItemsCreated = 0;
  let servicesCreated = 0;
  let knowledgeCreated = 0;

  // Map venueName → venueId for items that reference a venue by name
  const venueByName = new Map<string, string>();

  if (Array.isArray(data.venues)) {
    for (const v of data.venues) {
      if (!v?.name) continue;
      const created = await prisma.venue.create({
        data: {
          hotelId: id,
          name: String(v.name).trim(),
          kind: ["restaurant", "bar", "lounge", "cafe", "room_service"].includes(v.kind) ? v.kind : "restaurant",
          description: v.description || null,
          hours: v.hours || null,
          location: v.location || null,
        },
      });
      venueByName.set(String(v.name).trim().toLowerCase(), created.id);
      venuesCreated++;
    }
  }

  if (Array.isArray(data.menuItems)) {
    for (const m of data.menuItems) {
      if (!m?.name) continue;
      const venueId = m.venueName ? venueByName.get(String(m.venueName).trim().toLowerCase()) : undefined;
      const priceOre = Math.round(Number(m.priceNok || 0) * 100);
      await prisma.menuItem.create({
        data: {
          hotelId: id,
          venueId: venueId || null,
          name: String(m.name).trim(),
          description: m.description || null,
          price: priceOre,
          category: m.category || "other",
          availableForRoomService: typeof m.availableForRoomService === "boolean" ? m.availableForRoomService : true,
        },
      });
      menuItemsCreated++;
    }
  }

  if (Array.isArray(data.services)) {
    for (const s of data.services) {
      if (!s?.name) continue;
      const validCats = ["spa_treatment", "spa_access", "transfer", "activity", "general"];
      await prisma.service.create({
        data: {
          hotelId: id,
          name: String(s.name).trim(),
          description: s.description || null,
          durationMin: typeof s.durationMin === "number" ? Math.round(s.durationMin) : null,
          price: typeof s.priceNok === "number" ? Math.round(s.priceNok * 100) : null,
          category: validCats.includes(s.category) ? s.category : "general",
        },
      });
      servicesCreated++;
    }
  }

  if (Array.isArray(data.knowledge)) {
    for (const k of data.knowledge) {
      if (!k?.content) continue;
      const validCats = ["amenities", "policies", "local_area", "general"];
      await prisma.knowledgeEntry.create({
        data: {
          hotelId: id,
          category: validCats.includes(k.category) ? k.category : "general",
          content: String(k.content).trim(),
        },
      });
      knowledgeCreated++;
    }
  }

  // Apply facility detail strings + flags via update
  if (data.facilityDetails || data.flags) {
    await prisma.hotel.update({
      where: { id },
      data: { ...(data.flags || {}), ...(data.facilityDetails || {}) },
    });
  }

  res.json({
    venuesCreated,
    menuItemsCreated,
    servicesCreated,
    knowledgeCreated,
  });
});

// ── Wizard: pull suggestions from a website / hotel name ──────────
// ── Guest demo chat (in-dashboard 'try as a guest') ───────────────
router.post("/:id/guest-demo-chat", async (req: any, res) => {
  const id = req.params.id as string;
  const hotel = await prisma.hotel.findFirst({ where: { id, userId: req.user.userId } });
  if (!hotel) {
    res.status(404).json({ error: "Hotel not found" });
    return;
  }
  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages required" });
    return;
  }
  const cleanHistory = messages
    .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content }));
  try {
    const result = await guestChat(id, cleanHistory);
    res.json(result);
  } catch (err: any) {
    console.error("Guest demo chat failed:", err);
    res.status(500).json({ error: err?.message || "Chat failed" });
  }
});

router.post("/website-import", async (req: any, res) => {
  const { url, hotelName, city } = req.body || {};
  if (!url && !hotelName) {
    res.status(400).json({ error: "Either `url` or `hotelName` is required" });
    return;
  }
  try {
    const suggestions = await importFromWebsite({ url, hotelName, city });
    res.json({ suggestions });
  } catch (err: any) {
    console.error("Website import failed:", err);
    res.status(500).json({ error: err?.message || "Import failed" });
  }
});

// Hotel CRUD
router.get("/", listHotels);
router.post("/", validate(createHotelSchema), createHotel);
router.get("/:id", getHotel);
router.put("/:id", validate(updateHotelSchema), updateHotel);
router.delete("/:id", deleteHotel);

// Knowledge base
router.get("/:id/knowledge", listKnowledge);
router.post("/:id/knowledge", validate(createKnowledgeSchema), createKnowledge);

// Menu items
router.get("/:id/menu", listMenuItems);
router.post("/:id/menu", validate(createMenuItemSchema), createMenuItem);

// Services
router.get("/:id/services", listServices);
router.post("/:id/services", validate(createServiceSchema), createService);
router.patch("/services/:id", updateService);
router.delete("/services/:id", deleteService);

// Bookings
router.get("/:id/bookings", listBookings);
router.post("/:id/bookings", validate(createBookingSchema), createBooking);

export default router;
