import { Request, Response } from "express";
import * as aiService from "../../services/ai.service";
import * as membersService from "../../services/members.service";
import * as membersRepository from "../../repositories/members.repository";

/**
 * POST /api/ai/split-topic
 * Divide un tema en bloques con IA. NO persiste nada: devuelve la propuesta
 * para que el grupo la revise, edite y asigne antes de confirmar.
 * Body: { tema, descripcion?, num_bloques?, proyecto_id? }
 */
export const splitTopic = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { tema, descripcion, num_bloques, proyecto_id } = req.body as {
      tema: string;
      descripcion?: string | null;
      num_bloques?: number | null;
      proyecto_id?: number | null;
    };

    let numMiembros: number | null = null;
    if (proyecto_id) {
      // Solo owner/editor del grupo pueden usar la división con IA
      await membersService.checkRolPermission(userId, proyecto_id, [
        "owner",
        "editor",
      ]);
      const members = await membersRepository.findByProjectId(proyecto_id);
      numMiembros = members.length;
    }

    const bloques = await aiService.splitTopicIntoBlocks(
      tema,
      descripcion,
      num_bloques,
      numMiembros
    );

    res.status(200).json({ bloques });
  } catch (error: any) {
    if (error.message === "PERMISSION_DENIED") {
      return res
        .status(403)
        .json({ message: "No tienes permiso en este grupo." });
    }
    if (error.message === "AI_NOT_CONFIGURED") {
      return res.status(503).json({
        message:
          "La IA no está configurada en el servidor (falta ANTHROPIC_API_KEY).",
      });
    }
    if (
      error.message === "AI_REQUEST_FAILED" ||
      error.message === "AI_BAD_RESPONSE"
    ) {
      return res.status(502).json({
        message: "No se pudo generar la división. Inténtalo de nuevo.",
      });
    }
    console.error("Error splitting topic:", error);
    res.status(500).json({ message: "Error splitting topic" });
  }
};
