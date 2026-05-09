import { Router } from "express";
import { signup, login, me } from "../controllers/auth";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { signupSchema, loginSchema } from "../utils/schemas";

const router = Router();

router.post("/signup", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login);
router.get("/me", authenticate, me);

export default router;
