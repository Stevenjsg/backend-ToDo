import { Router, Request, Response } from "express";
import { param } from "express-validator";
import { protect } from "../../middleware/auth.middleware";
import { handleValidationErrors } from "../items/items.validator";
import * as membersService from "../../services/members.service";

const router = Router();

const validateToken = [
  param("token").isJWT().withMessage("Token de invitación inválido"),
];

// Vista previa PÚBLICA del grupo (nombre, nº de miembros, rol ofrecido).
// Sin auth: es lo que ve el invitado antes de registrarse (SDD §18.3).
router.get(
  "/:token",
  validateToken,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const preview = await membersService.getInvitePreview(req.params.token as string);
      res.status(200).json(preview);
    } catch (error: any) {
      if (error.message === "INVITE_INVALID_OR_EXPIRED") {
        return res
          .status(404)
          .json({ message: "Invitación inválida o caducada." });
      }
      console.error("Error fetching invite preview:", error);
      res.status(500).json({ message: "Error fetching invite" });
    }
  }
);

// Aceptar la invitación (requiere usuario autenticado)
router.post(
  "/:token/accept",
  protect,
  validateToken,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const project = await membersService.acceptInvite(
        req.params.token as string,
        userId
      );
      res.status(200).json({ uuid: project.uuid, nombre: project.nombre });
    } catch (error: any) {
      if (error.message === "INVITE_INVALID_OR_EXPIRED") {
        return res
          .status(404)
          .json({ message: "Invitación inválida o caducada." });
      }
      console.error("Error accepting invite:", error);
      res.status(500).json({ message: "Error accepting invite" });
    }
  }
);

export default router;
