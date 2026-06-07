import { Router } from "express";
import { getUpcoming, getDue } from "./reminder.controller";
import { protect } from "../../middleware/auth.middleware";

const router = Router();
router.use(protect); // Protege todas las rutas de recordatorios

router.get("/upcoming", getUpcoming);
router.get("/due", getDue);

export default router;
