import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { provisionHotel, deprovisionHotel, getProvisioningStatus } from "../services/provisioning";
import { sendWelcomeEmail, renderWelcomeEmail } from "../services/email";
import { prisma } from "../config/database";

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Provision a hotel's concierge agent ───────────────

router.post("/:id/provision", async (req, res) => {
  try {
    const result = await provisionHotel(req.params.id as string);
    res.json({
      provisioned: true,
      agentId: result.agentId,
      workspacePath: result.workspacePath,
      telegramDeepLink: result.telegramDeepLink,
    });
  } catch (err: any) {
    console.error("Provisioning failed:", err);
    res.status(500).json({ error: err.message || "Provisioning failed" });
  }
});

// ── Deprovision ───────────────────────────────────────

router.post("/:id/deprovision", async (req, res) => {
  try {
    await deprovisionHotel(req.params.id as string);
    res.json({ deprovisioned: true });
  } catch (err: any) {
    console.error("Deprovisioning failed:", err);
    res.status(500).json({ error: err.message || "Deprovisioning failed" });
  }
});

// ── Check provisioning status ─────────────────────────

router.get("/:id/provision/status", async (req, res) => {
  try {
    const status = await getProvisioningStatus(req.params.id as string);
    res.json({ status });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to get provisioning status" });
  }
});

// ── Send a test welcome email ─────────────────────────

router.post("/:id/welcome-email/test", async (req, res) => {
  try {
    const id = req.params.id as string;
    const { to, guestName } = req.body as { to?: string; guestName?: string };

    if (!to || typeof to !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      res.status(400).json({ error: "A valid `to` email address is required" });
      return;
    }

    const hotel = await prisma.hotel.findFirst({
      where: { id, userId: req.user!.userId },
    });
    if (!hotel) {
      res.status(404).json({ error: "Hotel not found" });
      return;
    }

    const status = await getProvisioningStatus(id);
    const deepLink = status.telegramBot?.deepLink;
    if (!deepLink) {
      res.status(400).json({ error: "Hotel must be provisioned before sending a test email" });
      return;
    }

    const result = await sendWelcomeEmail({
      to,
      hotelName: hotel.name,
      guestName,
      telegramDeepLink: deepLink,
    });

    res.json({ sent: true, to, messageId: result.messageId });
  } catch (err: any) {
    console.error("Test welcome email failed:", err);
    res.status(500).json({ error: err.message || "Failed to send test email" });
  }
});

// ── Get rendered welcome email (for preview / copy) ───

router.get("/:id/welcome-email/preview", async (req, res) => {
  try {
    const id = req.params.id as string;
    const hotel = await prisma.hotel.findFirst({
      where: { id, userId: req.user!.userId },
    });
    if (!hotel) {
      res.status(404).json({ error: "Hotel not found" });
      return;
    }
    const status = await getProvisioningStatus(id);
    const deepLink = status.telegramBot?.deepLink || "https://t.me/HotelConciergeServantBot";
    const rendered = renderWelcomeEmail({
      to: "guest@example.com",
      hotelName: hotel.name,
      telegramDeepLink: deepLink,
    });
    res.json(rendered);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to render preview" });
  }
});

export default router;
