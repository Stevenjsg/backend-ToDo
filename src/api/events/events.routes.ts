import { Router, Request, Response } from "express";
import { body } from "express-validator";
import { protect } from "../../middleware/auth.middleware";
import { handleValidationErrors } from "../items/items.validator";
import * as eventsRepository from "../../repositories/events.repository";

// Allowlist: solo eventos de producto conocidos (no es un endpoint genérico)
const TIPOS_PERMITIDOS = ["ai_split_generated", "ai_split_confirmed"];

const router = Router();
router.use(protect);

const validateEvent = [
  body("tipo").isIn(TIPOS_PERMITIDOS).withMessage("Tipo de evento no permitido"),
  body("payload")
    .isObject()
    .withMessage("payload debe ser un objeto")
    .custom((value) => JSON.stringify(value).length <= 4096)
    .withMessage("payload demasiado grande"),
];

router.post(
  "/",
  validateEvent,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { tipo, payload } = req.body as {
        tipo: string;
        payload: Record<string, unknown>;
      };
      await eventsRepository.log(userId, tipo, payload);
      res.status(204).send();
    } catch (error) {
      // La instrumentación nunca debe romper al cliente
      console.error("Error logging event:", error);
      res.status(204).send();
    }
  }
);

export default router;
