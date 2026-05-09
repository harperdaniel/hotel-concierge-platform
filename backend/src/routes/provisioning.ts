import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { provisionHotel, deprovisionHotel, getProvisioningStatus } from "../services/provisioning";

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Provision a hotel's concierge agent ───────────────

router.post("/:id/provision", async (req, res) => {
  try {
    const result = await provisionHotel(req.params.id);
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
    await deprovisionHotel(req.params.id);
    res.json({ deprovisioned: true });
  } catch (err: any) {
    console.error("Deprovisioning failed:", err);
    res.status(500).json({ error: err.message || "Deprovisioning failed" });
  }
});

// ── Check provisioning status ─────────────────────────

router.get("/:id/provision/status", async (req, res) => {
  try {
    const status = await getProvisioningStatus(req.params.id);
    res.json({ status });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to get provisioning status" });
  }
});

export default router;
