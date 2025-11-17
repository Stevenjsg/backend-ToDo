import * as projectRepository from '../repositories/project.repository';

export const createProject = (name: string, ownerId: number, description?: string | null) => {
    if (!name) throw new Error('Project name is required.');
    return projectRepository.create(name, ownerId, description);
};

export const getProjectsForUser = (userId: number) => {
    return projectRepository.findByUserId(userId);
};

export const getProjectByUuid = async (uuid: string, userId: number) => {
    // 1. Llama a la nueva función del repositorio
    const project = await projectRepository.findByUuidAndUserId(uuid, userId); 
    if (!project) throw new Error('PROJECT_NOT_FOUND_OR_FORBIDDEN');
    return project;
};

export const updateProject = async (uuid: string, name: string, description: string | null, userId: number) => {
    if (!name) throw new Error('Project name is required.');
    // 1. Llama a update con uuid
    const updatedProject = await projectRepository.update(uuid, name, description, userId); 
    if (!updatedProject) throw new Error('PROJECT_NOT_FOUND_OR_FORBIDDEN');
    return updatedProject;
};

export const deleteProject = async (uuid: string, userId: number) => {
    // 1. Llama a remove con uuid
    const deletedRows = await projectRepository.remove(uuid, userId); 
    if (deletedRows === 0) throw new Error('PROJECT_NOT_FOUND_OR_FORBIDDEN');
    return deletedRows;
};