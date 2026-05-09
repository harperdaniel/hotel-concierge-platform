import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
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
  createService, listServices,
  createBooking, listBookings,
} from "../controllers/hotels";

const router = Router();

// All routes require authentication
router.use(authenticate);

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

// Bookings
router.get("/:id/bookings", listBookings);
router.post("/:id/bookings", validate(createBookingSchema), createBooking);

export default router;
