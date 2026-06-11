import { Request, Response } from "express";
import * as membersRepository from "../../repositories/members.repository"; // Asegúrate de importar esto
import * as projectRepository from "../../repositories/project.repository";
import * as projectService from "../../services/project.service";

export const createProject = async (req: Request, res: Response) => {
  try {
    const { nombre, descripcion } = req.body;
    const ownerId = req.user!.id;
    const newProject = await projectService.createProject(
      nombre,
      ownerId,
      descripcion
    );
    res.status(201).json(newProject);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getProjects = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const projects = await projectService.getProjectsForUser(userId);
    res.status(200).json(projects);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching projects" });
  }
};

export const getProject = async (req: Request, res: Response) => {
  try {
    // 1. Lee 'uuid' (string) en lugar de 'id' (number)
    const projectUuid = req.params.uuid;
    const userId = req.user!.id;
    // 2. Llama a la nueva función del servicio
    const project = await projectService.getProjectByUuid(projectUuid, userId);
    res.status(200).json(project);
  } catch (error: any) {
    if (error.message === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res
        .status(404)
        .json({ message: "Project not found or permission denied." });
    }
    res.status(500).json({ message: "Error fetching project" });
  }
};
export const updateProject = async (req: Request, res: Response) => {
  try {
    // 1. Lee 'uuid'
    const projectUuid = req.params.uuid;
    const userId = req.user!.id;
    const { nombre, descripcion } = req.body;
    // 2. Llama a la nueva función del servicio
    const updatedProject = await projectService.updateProject(
      projectUuid,
      nombre,
      descripcion,
      userId
    );
    res.status(200).json(updatedProject);
  } catch (error: any) {
    if (error.message === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res
        .status(403)
        .json({ message: "Permission denied or project not found." });
    }
    if (error.message === "Project name is required.") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Error updating project" });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    // 1. Lee 'uuid'
    const projectUuid = req.params.uuid;
    const userId = req.user!.id;
    // 2. Llama a la nueva función del servicio
    await projectService.deleteProject(projectUuid, userId);
    res.status(204).send();
  } catch (error: any) {
    if (error.message === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res
        .status(403)
        .json({ message: "Permission denied or project not found." });
    }
    res.status(500).json({ message: "Error deleting project" });
  }
};
// GET /api/projects/:uuid/progress — progreso del grupo por miembro
export const getProgress = async (req: Request, res: Response) => {
  try {
    const projectUuid = req.params.uuid;
    const userId = req.user!.id;
    const progress = await projectService.getProjectProgress(projectUuid, userId);
    res.status(200).json(progress);
  } catch (error: any) {
    if (error.message === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return res
        .status(404)
        .json({ message: "Project not found or permission denied." });
    }
    console.error("Error fetching progress:", error);
    res.status(500).json({ message: "Error fetching progress" });
  }
};

// --- Reporte compartible (ROADMAP F4) ---

const handleShareError = (error: any, res: Response): Response | void => {
  if (error.message === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
    return res
      .status(404)
      .json({ message: "Project not found or permission denied." });
  }
  if (error.message === "PERMISSION_DENIED") {
    return res
      .status(403)
      .json({ message: "Solo owner o editor pueden gestionar el link del reporte." });
  }
};

// GET /api/projects/:uuid/share — link actual ({ token: null } si no hay)
export const getShareLink = async (req: Request, res: Response) => {
  try {
    const share = await projectService.getShareLink(
      req.params.uuid as string,
      req.user!.id
    );
    res.status(200).json(share);
  } catch (error: any) {
    if (handleShareError(error, res)) return;
    console.error("Error fetching share link:", error);
    res.status(500).json({ message: "Error fetching share link" });
  }
};

// POST /api/projects/:uuid/share — crea (o devuelve) el link del reporte
export const createShareLink = async (req: Request, res: Response) => {
  try {
    const share = await projectService.createShareLink(
      req.params.uuid as string,
      req.user!.id
    );
    res.status(201).json(share);
  } catch (error: any) {
    if (handleShareError(error, res)) return;
    console.error("Error creating share link:", error);
    res.status(500).json({ message: "Error creating share link" });
  }
};

// DELETE /api/projects/:uuid/share — revoca el link (el reporte deja de abrir)
export const revokeShareLink = async (req: Request, res: Response) => {
  try {
    await projectService.revokeShareLink(req.params.uuid as string, req.user!.id);
    res.status(204).send();
  } catch (error: any) {
    if (handleShareError(error, res)) return;
    console.error("Error revoking share link:", error);
    res.status(500).json({ message: "Error revoking share link" });
  }
};

export const getMyRole = async (req: Request, res: Response) => {
  try {
    const projectUuid = req.params.uuid;
    const userId = req.user!.id;

    // 1. Necesitamos el ID numérico del proyecto primero
    const projectId = await projectRepository.findIdByUuid(projectUuid);

    if (!projectId) {
      return res.status(404).json({ message: "Project not found" });
    }

    // 2. Buscamos el rol del usuario en ese proyecto
    const role = await membersRepository.findUserRole(userId, projectId);

    if (!role) {
      // Si no tiene rol, no es miembro (o es un error si llegó hasta aquí)
      return res.status(403).json({ message: "Not a member of this project" });
    }

    res.status(200).json({ role });
  } catch (error) {
    console.error("Error fetching role:", error);
    res.status(500).json({ message: "Error fetching role" });
  }
};
