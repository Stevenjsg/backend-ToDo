import * as projectRepository from '../repositories/project.repository';
import * as membersRepository from '../repositories/members.repository';


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
export const getProjectById = async (projectId: number, userId: number) => {
    // 1. Verificar que el usuario (userId) es miembro del proyecto
    // Esto es importante por seguridad: no devolvemos datos si no pertenece al proyecto.
    const userRole = await membersRepository.findUserRole(userId, projectId);
    
    if (!userRole) {
        throw new Error('PERMISSION_DENIED');
    }

    // 2. Obtener los datos completos del proyecto
    const project = await projectRepository.findById(projectId);

    if (!project) {
        throw new Error('PROJECT_NOT_FOUND');
    }

    return project;
};