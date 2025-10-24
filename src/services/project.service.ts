import * as projectRepository from '../repositories/project.repository';

export const createProject = (name: string, ownerId: number, description?: string | null) => {
    if (!name) throw new Error('Project name is required.');
    return projectRepository.create(name, ownerId, description);
};

export const getProjectsForUser = (userId: number) => {
    return projectRepository.findByUserId(userId);
};

export const getProjectById = async (projectId: number, userId: number) => {
    const project = await projectRepository.findByIdAndUserId(projectId, userId);
    if (!project) throw new Error('PROJECT_NOT_FOUND_OR_FORBIDDEN');
    return project;
};

export const updateProject = async (id: number, name: string, description: string | null, userId: number) => {
    if (!name) throw new Error('Project name is required.');
    const updatedProject = await projectRepository.update(id, name, description, userId);
    if (!updatedProject) throw new Error('PROJECT_NOT_FOUND_OR_FORBIDDEN');
    return updatedProject;
};

export const deleteProject = async (id: number, userId: number) => {
    const deletedRows = await projectRepository.remove(id, userId);
    if (deletedRows === 0) throw new Error('PROJECT_NOT_FOUND_OR_FORBIDDEN');
    return deletedRows;
};