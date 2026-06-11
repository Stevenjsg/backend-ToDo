import { Router, Request, Response } from "express";
import { param } from "express-validator";
import { handleValidationErrors } from "../items/items.validator";
import * as projectService from "../../services/project.service";

const router = Router();

// Token opaco generado con randomBytes(24).toString("base64url") → 32 chars.
// Margen 20–64 por si cambia el tamaño; solo alfabeto base64url.
const validateToken = [
  param("token")
    .matches(/^[A-Za-z0-9_-]{20,64}$/)
    .withMessage("Token de reporte inválido"),
];

// Reporte PÚBLICO de progreso del grupo (ROADMAP F4 / SDD §18.1).
// Sin auth a propósito: es lo que abre el profesor desde el link, sin cuenta.
// Solo datos crudos de actividad — sin scoring ni juicio IA (SDD §18.7).
router.get(
  "/:token",
  validateToken,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const report = await projectService.getPublicReport(
        req.params.token as string
      );
      res.status(200).json(report);
    } catch (error: any) {
      if (error.message === "REPORT_NOT_FOUND") {
        return res
          .status(404)
          .json({ message: "Reporte no encontrado o link revocado." });
      }
      console.error("Error fetching public report:", error);
      res.status(500).json({ message: "Error fetching report" });
    }
  }
);

export default router;
