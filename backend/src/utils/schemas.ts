import { z } from "zod";

// ── Auth ──────────────────────────────────────────────

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ── Hotel ─────────────────────────────────────────────

const facilityFlags = {
  hasRestaurant: z.boolean().optional(),
  hasRoomService: z.boolean().optional(),
  hasSpa: z.boolean().optional(),
  hasPool: z.boolean().optional(),
  hasGym: z.boolean().optional(),
  hasBar: z.boolean().optional(),
  hasConference: z.boolean().optional(),
  hasTransfers: z.boolean().optional(),
  petFriendly: z.boolean().optional(),
};

export const createHotelSchema = z.object({
  name: z.string().min(1, "Hotel name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  timezone: z.string().default("Europe/Oslo"),
  ...facilityFlags,
  // Free-text knowledge captured by the wizard — we'll seed it as a knowledge entry
  initialKnowledge: z.string().optional(),
});

export const updateHotelSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  timezone: z.string().optional(),
  logoUrl: z.string().url().optional(),
  conciergeName: z.string().min(1).max(80).optional(),
  // SMTP config (all optional; use empty string "" to clear)
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  smtpFromName: z.string().optional(),
  smtpFromEmail: z.union([z.string().email(), z.literal("")]).optional(),
  ...facilityFlags,
});

// ── Knowledge ─────────────────────────────────────────

export const createKnowledgeSchema = z.object({
  category: z.enum(["amenities", "policies", "local_area", "general"]),
  content: z.string().min(1),
});

// ── Menu Items ────────────────────────────────────────

export const createMenuItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().int().min(0),
  category: z.string().min(1),
});

// ── Services ──────────────────────────────────────────

export const createServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  durationMin: z.number().int().positive().optional(),
  price: z.number().int().min(0).optional(),
  category: z.enum(["spa_treatment", "spa_access", "transfer", "activity", "general"]).optional(),
});

// ── Bookings ──────────────────────────────────────────

export const createBookingSchema = z.object({
  type: z.enum(["table", "room_service"]),
  guestName: z.string().min(1),
  guestRoom: z.string().optional(),
  details: z.string().min(1),
});
