import { Request, Response } from 'express';
import * as projectService from '../../services/project.service';

export const createProject = async (req: Request, res: Response) => {
    try {
        const { nombre, descripcion } = req.body;
        const ownerId = req.user!.id;
        const newProject = await projectService.createProject(nombre, ownerId, descripcion);
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
        res.status(500).json({ message: 'Error fetching projects' });
    }
};

export const getProject = async (req: Request, res: Response) => {
    try {
        const projectId = parseInt(req.params.id);
        const userId = req.user!.id;
        const project = await projectService.getProjectById(projectId, userId);
        res.status(200).json(project);
    } catch (error: any) {
        if (error.message === 'PROJECT_NOT_FOUND_OR_FORBIDDEN') {
            return res.status(404).json({ message: 'Project not found or permission denied.' });
        }
        res.status(500).json({ message: 'Error fetching project' });
    }
};

export const updateProject = async (req: Request, res: Response) => {
    try {
        const projectId = parseInt(req.params.id);
        const userId = req.user!.id;
        const { nombre, descripcion } = req.body;
        const updatedProject = await projectService.updateProject(projectId, nombre, descripcion, userId);
        res.status(200).json(updatedProject);
    } catch (error: any) {
         if (error.message === 'PROJECT_NOT_FOUND_OR_FORBIDDEN') {
            return res.status(403).json({ message: 'Permission denied or project not found.' }); // 403 Forbidden might be better here
        }
         if (error.message === 'Project name is required.') {
             return res.status(400).json({ message: error.message });
         }
        res.status(500).json({ message: 'Error updating project' });
    }
};

export const deleteProject = async (req: Request, res: Response) => {
    try {
        const projectId = parseInt(req.params.id);
        const userId = req.user!.id;
        await projectService.deleteProject(projectId, userId);
        res.status(204).send();
    } catch (error: any) {
        if (error.message === 'PROJECT_NOT_FOUND_OR_FORBIDDEN') {
            return res.status(403).json({ message: 'Permission denied or project not found.' }); // 403 Forbidden
        }
        res.status(500).json({ message: 'Error deleting project' });
    }
};