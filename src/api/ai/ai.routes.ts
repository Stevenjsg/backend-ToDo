import { Router } from "express";
import { body } from "express-validator";
import { protect } from "../../middleware/auth.middleware";
import { handleValidationErrors } from "../items/items.validator";
import { splitTopic } from "./ai.controller";

const router = Router();
router.use(protect);

const validateSplitTopic = [
  body("tema")
    .notEmpty()
    .withMessage("El tema es requerido")
    .isString()
    .isLength({ max: 500 }),
  body("descripcion").optional({ nullable: true }).isString().isLength({ max: 4000 }),
  body("num_bloques").optional({ nullable: true }).isInt({ min: 2, max: 20 }),
  body("proyecto_id").optional({ nullable: true }).isInt(),
  body("tipo_entregable").optional({ nullable: true }).isString().isLength({ max: 32 }),
  body("tamano_entregable").optional({ nullable: true }).isString().isLength({ max: 120 }),
  body("fecha_entrega").optional({ nullable: true }).isString().isLength({ max: 40 }),
  body("permitir_preguntas").optional().isBoolean(),
];

router.post("/split-topic", validateSplitTopic, handleValidationErrors, splitTopic);

export default router;
