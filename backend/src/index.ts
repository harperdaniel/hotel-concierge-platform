import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import authRoutes from "./routes/auth";
import hotelRoutes from "./routes/hotels";
import guestRoutes from "./routes/guest";
import provisioningRoutes from "./routes/provisioning";
import managerRoutes from "./routes/manager";
import venueRoutes from "./routes/venues";
import integrationRoutes from "./routes/integrations";

const app = express();

// ── Security ──────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));

// ── Rate Limiting ─────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Auth endpoints get a stricter limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Body Parsing ──────────────────────────────────────
app.use(express.json({ limit: "10kb" }));

// ── Health Check (registered BEFORE catch-all /api routers) ───────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/hotels", hotelRoutes);
app.use("/api/guest", guestRoutes);
app.use("/api/hotels", provisioningRoutes);
app.use("/api/manager", managerRoutes);
app.use("/api", venueRoutes); // /api/hotels/:id/venues, /api/venues/:id, /api/menu-items/:id
app.use("/api", integrationRoutes); // /api/hotels/:id/integrations, /api/integrations/:id

// ── 404 ───────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ── Error Handler ─────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ─────────────────────────────────────────────
app.listen(env.PORT, () => {
  console.log(`🏨 Hotel Concierge API running on http://localhost:${env.PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
});
