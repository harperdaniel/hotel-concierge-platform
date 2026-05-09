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

export const createHotelSchema = z.object({
  name: z.string().min(1, "Hotel name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  timezone: z.string().default("Europe/Oslo"),
});

export const updateHotelSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  timezone: z.string().optional(),
  logoUrl: z.string().url().optional(),
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
});

// ── Bookings ──────────────────────────────────────────

export const createBookingSchema = z.object({
  type: z.enum(["table", "room_service"]),
  guestName: z.string().min(1),
  guestRoom: z.string().optional(),
  details: z.string().min(1),
});
