import { Router } from "express";
import { prisma } from "../config/database";
import { managerChat } from "../services/manager-chat";

const router = Router();

// ── Staff auth middleware ─────────────────────────────
//
// The manager bot calls these endpoints with an X-Staff-Token header
// containing the staffToken issued during provisioning.

async function staffAuth(req: any, res: any, next: any): Promise<void> {
  const token = (req.headers["x-staff-token"] || req.query.staffToken) as string | undefined;
  if (!token) {
    res.status(401).json({ error: "Missing X-Staff-Token header" });
    return;
  }
  const bot = await prisma.telegramBot.findFirst({
    where: { staffToken: token, active: true },
    include: { hotel: true },
  });
  if (!bot || !bot.hotel) {
    res.status(401).json({ error: "Invalid or revoked staff token" });
    return;
  }
  req.hotel = bot.hotel;
  req.staffBot = bot;
  next();
}

// ── Identify (decode start parameter) ─────────────────
//
// Public endpoint — no token required. Just maps deep-link `staff-{hotelId}-{tokenPrefix}`
// to the hotel record so the bot can confirm context. The bot must then use the
// matching staff token (issued separately at provisioning time) to actually mutate data.
//
// Format expected: `staff-{base64url(hotelId)}-{first8charsOfToken}` to avoid leaking the
// full token in the URL. The bot resolves the full token via this endpoint.

router.post("/identify", async (req, res) => {
  const { startParam } = req.body || {};
  if (!startParam || typeof startParam !== "string") {
    res.status(400).json({ error: "startParam required" });
    return;
  }
  if (!startParam.startsWith("staff-")) {
    res.status(400).json({ error: "Not a staff start parameter" });
    return;
  }
  // Format: staff-{b64HotelId}-{tokenPrefix}
  const remainder = startParam.slice("staff-".length);
  const lastDash = remainder.lastIndexOf("-");
  if (lastDash < 1) {
    res.status(400).json({ error: "Malformed staff start parameter" });
    return;
  }
  const b64HotelId = remainder.slice(0, lastDash);
  const tokenPrefix = remainder.slice(lastDash + 1);
  const hotelId = Buffer.from(b64HotelId, "base64url").toString("utf-8");

  const bot = await prisma.telegramBot.findFirst({
    where: { hotelId, active: true },
    include: { hotel: true },
  });
  if (!bot || !bot.staffToken || !bot.staffToken.startsWith(tokenPrefix) || !bot.hotel) {
    res.status(401).json({ error: "Invalid staff start parameter" });
    return;
  }

  res.json({
    hotelId: bot.hotel.id,
    hotelName: bot.hotel.name,
    staffToken: bot.staffToken,
  });
});

// ── All routes below require staff auth ───────────────

router.use(staffAuth);

// ── Get current hotel state ───────────────────────────

router.get("/hotel", async (req: any, res) => {
  const hotel = await prisma.hotel.findUnique({
    where: { id: req.hotel.id },
    include: {
      knowledgeEntries: true,
      menuItems: true,
      services: true,
    },
  });
  if (!hotel) {
    res.status(404).json({ error: "Hotel not found" });
    return;
  }
  // Strip secrets
  const { smtpPass: _smtpPass, ...rest } = hotel as any;
  res.json({ hotel: rest });
});

// ── Add a menu item ───────────────────────────────────

router.post("/menu-items", async (req: any, res) => {
  const { name, description, price, category } = req.body || {};
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "name is required" });
    return;
  }
  if (typeof price !== "number" || price < 0) {
    res.status(400).json({ error: "price (in cents/øre) is required, integer ≥ 0" });
    return;
  }
  if (!category || typeof category !== "string") {
    res.status(400).json({ error: "category is required" });
    return;
  }
  const item = await prisma.menuItem.create({
    data: {
      hotelId: req.hotel.id,
      name,
      description: description ?? null,
      price: Math.round(price),
      category,
    },
  });
  res.status(201).json({ item });
});

// ── Bulk add menu items (for PDF/URL flows) ───────────

router.post("/menu-items/bulk", async (req: any, res) => {
  const items = req.body?.items;
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "items[] is required" });
    return;
  }
  // Validate each item
  for (const it of items) {
    if (!it.name || typeof it.name !== "string") {
      res.status(400).json({ error: "Each item needs a name" });
      return;
    }
    if (typeof it.price !== "number" || it.price < 0) {
      res.status(400).json({ error: `Item "${it.name}" needs a numeric price` });
      return;
    }
    if (!it.category || typeof it.category !== "string") {
      res.status(400).json({ error: `Item "${it.name}" needs a category` });
      return;
    }
  }
  const created = await prisma.$transaction(
    items.map((it: any) =>
      prisma.menuItem.create({
        data: {
          hotelId: req.hotel.id,
          name: it.name,
          description: it.description ?? null,
          price: Math.round(it.price),
          category: it.category,
        },
      })
    )
  );
  res.status(201).json({ items: created, count: created.length });
});

// ── Add a service ─────────────────────────────────────

router.post("/services", async (req: any, res) => {
  const { name, description, durationMin, price } = req.body || {};
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const service = await prisma.service.create({
    data: {
      hotelId: req.hotel.id,
      name,
      description: description ?? null,
      durationMin: typeof durationMin === "number" ? Math.round(durationMin) : null,
      price: typeof price === "number" ? Math.round(price) : null,
    },
  });
  res.status(201).json({ service });
});

// ── Add a knowledge entry ─────────────────────────────

router.post("/knowledge", async (req: any, res) => {
  const { category, content } = req.body || {};
  const validCategories = ["amenities", "policies", "local_area", "general"];
  if (!category || !validCategories.includes(category)) {
    res.status(400).json({ error: `category must be one of: ${validCategories.join(", ")}` });
    return;
  }
  if (!content || typeof content !== "string" || !content.trim()) {
    res.status(400).json({ error: "content is required" });
    return;
  }
  const entry = await prisma.knowledgeEntry.create({
    data: {
      hotelId: req.hotel.id,
      category,
      content: content.trim(),
    },
  });
  res.status(201).json({ entry });
});

// ── Update hotel info ─────────────────────────────────

router.patch("/hotel", async (req: any, res) => {
  const allowed = ["name", "address", "phone", "email", "website", "timezone"];
  const updates: Record<string, any> = {};
  for (const k of allowed) {
    if (req.body && k in req.body) updates[k] = req.body[k];
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No allowed fields to update" });
    return;
  }
  const hotel = await prisma.hotel.update({
    where: { id: req.hotel.id },
    data: updates,
  });
  const { smtpPass: _smtpPass, ...rest } = hotel as any;
  res.json({ hotel: rest });
});

// ── Delete helpers (so the bot can correct mistakes) ───

router.delete("/menu-items/:id", async (req: any, res) => {
  const id = req.params.id as string;
  const item = await prisma.menuItem.findUnique({ where: { id } });
  if (!item || item.hotelId !== req.hotel.id) {
    res.status(404).json({ error: "Menu item not found" });
    return;
  }
  await prisma.menuItem.delete({ where: { id } });
  res.json({ deleted: true });
});

router.delete("/services/:id", async (req: any, res) => {
  const id = req.params.id as string;
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service || service.hotelId !== req.hotel.id) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  await prisma.service.delete({ where: { id } });
  res.json({ deleted: true });
});

router.delete("/knowledge/:id", async (req: any, res) => {
  const id = req.params.id as string;
  const entry = await prisma.knowledgeEntry.findUnique({ where: { id } });
  if (!entry || entry.hotelId !== req.hotel.id) {
    res.status(404).json({ error: "Knowledge entry not found" });
    return;
  }
  await prisma.knowledgeEntry.delete({ where: { id } });
  res.json({ deleted: true });
});

// ── Web chat (mirrors the Telegram manager bot) ──────────────────────────
//
// POST /api/manager/chat
// Body: { messages: [{ role: 'user' | 'assistant', content: string }, ...] }
//
// Calls DeepSeek with the same SOUL.md as the Telegram manager bot, plus tool-calling.
// The model can directly add menu items, services, knowledge, etc.

router.post("/chat", async (req: any, res) => {
  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages)) {
      res.status(400).json({ error: "messages array required" });
      return;
    }
    // Sanitize: only role + content, only user/assistant
    const cleanHistory = messages
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content }));

    if (cleanHistory.length === 0) {
      res.status(400).json({ error: "At least one message required" });
      return;
    }

    const result = await managerChat(req.hotel.id, cleanHistory);
    res.json(result);
  } catch (err: any) {
    console.error("Manager chat failed:", err);
    res.status(500).json({ error: err.message || "Chat failed" });
  }
});

export default router;
