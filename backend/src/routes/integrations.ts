// CRUD + test endpoints for booking integrations.
//
// Conventions:
//   GET    /api/hotels/:id/integrations          \u2014 list (auth)
//   POST   /api/hotels/:id/integrations          \u2014 create (auth)
//   PATCH  /api/integrations/:id                 \u2014 update (auth)
//   DELETE /api/integrations/:id                 \u2014 delete (auth)
//   POST   /api/integrations/:id/test            \u2014 try a no-op call (auth)
//
// The `authBlob` is encrypted at rest. Responses NEVER return the
// plaintext blob; instead we return `authSummary` (a frontend-safe
// object indicating which fields are set, e.g. `{ hasApiKey: true }`).

import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { prisma } from "../config/database";
import { encryptJSON, summarizeAuth } from "../utils/crypto";

const router = Router();
router.use(authenticate);

const VALID_KINDS = [
  "manual_queue",
  "custom_webhook",
  "email",
  "opentable",
  "google_calendar",
] as const;
type IntegrationKind = (typeof VALID_KINDS)[number];

function isKind(s: unknown): s is IntegrationKind {
  return typeof s === "string" && (VALID_KINDS as readonly string[]).includes(s);
}

// Reshape a row for safe outbound serialization \u2014 strip authBlob, expose
// only a summary of which secret fields are set.
function publicShape(row: any) {
  const { authBlob, ...rest } = row;
  return { ...rest, authSummary: summarizeAuth(authBlob) };
}

async function ownsHotel(userId: string, hotelId: string) {
  return prisma.hotel.findFirst({ where: { id: hotelId, userId } });
}

async function loadOwnedIntegration(userId: string, id: string) {
  const integration = await prisma.integration.findUnique({
    where: { id },
    include: { hotel: { select: { userId: true } } },
  });
  if (!integration || integration.hotel.userId !== userId) return null;
  return integration;
}

// \u2500\u2500 List \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
router.get("/hotels/:id/integrations", async (req: any, res) => {
  const hotelId = req.params.id as string;
  if (!(await ownsHotel(req.user!.userId, hotelId))) {
    res.status(404).json({ error: "Hotel not found" });
    return;
  }
  const rows = await prisma.integration.findMany({
    where: { hotelId },
    include: {
      _count: { select: { venues: true, services: true, hotelsAsRoomService: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  res.json({ integrations: rows.map(publicShape) });
});

// \u2500\u2500 Create \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
router.post("/hotels/:id/integrations", async (req: any, res) => {
  const hotelId = req.params.id as string;
  if (!(await ownsHotel(req.user!.userId, hotelId))) {
    res.status(404).json({ error: "Hotel not found" });
    return;
  }
  const { name, kind, endpoint, auth } = req.body || {};
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "name is required" });
    return;
  }
  if (!isKind(kind)) {
    res.status(400).json({ error: `kind must be one of: ${VALID_KINDS.join(", ")}` });
    return;
  }
  // manual_queue doesn't need endpoint or auth. The others may need one or both.
  let authBlob: string | null = null;
  if (auth && typeof auth === "object" && Object.keys(auth).length > 0) {
    authBlob = encryptJSON(auth);
  }
  const created = await prisma.integration.create({
    data: {
      hotelId,
      name: name.trim(),
      kind,
      endpoint: typeof endpoint === "string" && endpoint.trim() ? endpoint.trim() : null,
      authBlob,
      status: "untested",
    },
  });
  res.status(201).json({ integration: publicShape(created) });
});

// \u2500\u2500 Update \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
router.patch("/integrations/:id", async (req: any, res) => {
  const id = req.params.id as string;
  const integration = await loadOwnedIntegration(req.user!.userId, id);
  if (!integration) {
    res.status(404).json({ error: "Integration not found" });
    return;
  }
  const { name, kind, endpoint, auth } = req.body || {};
  const updates: Record<string, any> = {};
  if (typeof name === "string" && name.trim()) updates.name = name.trim();
  if (kind !== undefined) {
    if (!isKind(kind)) {
      res.status(400).json({ error: `kind must be one of: ${VALID_KINDS.join(", ")}` });
      return;
    }
    updates.kind = kind;
  }
  if (endpoint !== undefined) {
    updates.endpoint = typeof endpoint === "string" && endpoint.trim() ? endpoint.trim() : null;
  }
  if (auth !== undefined) {
    if (auth === null) {
      updates.authBlob = null;
    } else if (typeof auth === "object" && Object.keys(auth).length > 0) {
      updates.authBlob = encryptJSON(auth);
    }
    // Any mutation of secrets resets the tested status.
    updates.status = "untested";
    updates.lastTestedAt = null;
    updates.lastError = null;
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No updates" });
    return;
  }
  const updated = await prisma.integration.update({ where: { id }, data: updates });
  res.json({ integration: publicShape(updated) });
});

// \u2500\u2500 Delete \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
router.delete("/integrations/:id", async (req: any, res) => {
  const id = req.params.id as string;
  const integration = await loadOwnedIntegration(req.user!.userId, id);
  if (!integration) {
    res.status(404).json({ error: "Integration not found" });
    return;
  }
  // ON DELETE SET NULL on venues/services/hotels keeps offerings around;
  // they revert to info-only automatically. We surface the count in the
  // response so the UI can show a confirmation.
  const counts = await prisma.$transaction([
    prisma.venue.count({ where: { integrationId: id } }),
    prisma.service.count({ where: { integrationId: id } }),
    prisma.hotel.count({ where: { roomServiceIntegrationId: id } }),
  ]);
  await prisma.integration.delete({ where: { id } });
  res.json({
    deleted: true,
    unlinked: {
      venues: counts[0],
      services: counts[1],
      roomService: counts[2],
    },
  });
});

// \u2500\u2500 Test \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// For kinds we haven't fully implemented yet we just do basic validation.
// manual_queue is always "ok". custom_webhook does a HEAD/OPTIONS to the
// configured URL. email validates the address format. opentable/gcal are
// stubs that return "ok" if endpoint is set.
router.post("/integrations/:id/test", async (req: any, res) => {
  const id = req.params.id as string;
  const integration = await loadOwnedIntegration(req.user!.userId, id);
  if (!integration) {
    res.status(404).json({ error: "Integration not found" });
    return;
  }
  let status: "ok" | "error" = "ok";
  let lastError: string | null = null;
  try {
    switch (integration.kind) {
      case "manual_queue":
        // No external system; always healthy.
        break;
      case "custom_webhook": {
        if (!integration.endpoint) throw new Error("Webhook URL is not set");
        try {
          new URL(integration.endpoint);
        } catch {
          throw new Error("Webhook URL is not a valid URL");
        }
        // Do a quick HEAD with a short timeout. We don't fail on non-2xx
        // (some endpoints only accept POST); we only fail on network errors.
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 5000);
        try {
          await fetch(integration.endpoint, { method: "HEAD", signal: controller.signal });
        } catch (err: any) {
          throw new Error(`Could not reach the webhook: ${err?.message || err}`);
        } finally {
          clearTimeout(t);
        }
        break;
      }
      case "email":
        if (!integration.endpoint || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(integration.endpoint)) {
          throw new Error("A valid email address is required in the endpoint field");
        }
        break;
      case "opentable":
      case "google_calendar":
        if (!integration.endpoint) {
          throw new Error("Account/calendar identifier is required in the endpoint field");
        }
        // TODO: implement real provider calls.
        break;
      default:
        throw new Error(`Unknown integration kind: ${integration.kind}`);
    }
  } catch (err: any) {
    status = "error";
    lastError = err?.message || String(err);
  }
  const updated = await prisma.integration.update({
    where: { id },
    data: { status, lastError, lastTestedAt: new Date() },
  });
  res.json({ integration: publicShape(updated) });
});

export default router;
