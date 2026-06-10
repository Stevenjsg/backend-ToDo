import jwt from 'jsonwebtoken';
import * as membersRepository from '../repositories/members.repository';
import * as userRepository from '../repositories/user.repository'; // Need this to find users by email
import * as projectRepository from '../repositories/project.repository';
import { ProjectRole } from '../data/dataTypes';

interface InviteTokenPayload {
  invite: true;
  proyecto_id: number;
  rol: 'viewer' | 'editor';
}

// Helper function for permission checks
const checkPermission = async (requesterId: number, projectId: number, allowedRoles: ProjectRole[]) => {
    const requesterRole = await membersRepository.findUserRole(requesterId, projectId);
    if (!requesterRole || !allowedRoles.includes(requesterRole)) {
        throw new Error('PERMISSION_DENIED');
    }
    return requesterRole; // Return role if needed
};
export const checkRolPermission = async (userId: number, projectId: number, allowedRoles: ProjectRole[]) => {
  const role = await membersRepository.findUserRole(userId, projectId);
  if (!role || !allowedRoles.includes(role)) {
    throw new Error('PERMISSION_DENIED'); // El controlador capturará esto y devolverá 403
  }
};
export const addMember = async (projectId: number, emailToAdd: string, role: ProjectRole, requesterId: number) => {
    await checkPermission(requesterId, projectId, ['owner', 'editor']); // Only owner/editor can add members

    const userToAdd = await userRepository.findByEmail(emailToAdd);
    if (!userToAdd) {
        throw new Error('USER_TO_ADD_NOT_FOUND');
    }

    if (userToAdd.id === requesterId) {
        throw new Error('CANNOT_ADD_SELF');
    }

    // Prevent adding owner with a different role or demoting owner
    const existingMembership = await membersRepository.findByIds(userToAdd.id, projectId);
     if (existingMembership?.rol === 'owner' && role !== 'owner') {
         throw new Error('CANNOT_CHANGE_OWNER_ROLE');
     }
    
    return membersRepository.add(userToAdd.id, projectId, role);
};

export const getProjectMembers = async (projectId: number, requesterId: number) => {
    await checkPermission(requesterId, projectId, ['owner', 'editor', 'viewer']); // Any member can view
    return membersRepository.findByProjectId(projectId);
};

export const updateMemberRole = async (projectId: number, userIdToUpdate: number, newRole: ProjectRole, requesterId: number) => {
    await checkPermission(requesterId, projectId, ['owner']); // Only owner can change roles

    if (userIdToUpdate === requesterId && newRole !== 'owner') {
        throw new Error('OWNER_CANNOT_DEMOTE_SELF');
    }
    
    // Check if the user being updated is actually the owner
     const memberToUpdate = await membersRepository.findByIds(userIdToUpdate, projectId);
     if (memberToUpdate?.rol === 'owner' && newRole !== 'owner') {
         throw new Error('CANNOT_CHANGE_OWNER_ROLE');
     }


    const updatedMember = await membersRepository.updateRole(userIdToUpdate, projectId, newRole);
     if (!updatedMember) {
         throw new Error('MEMBER_NOT_FOUND');
     }
    return updatedMember;
};

export const removeMember = async (projectId: number, userIdToRemove: number, requesterId: number) => {
    await checkPermission(requesterId, projectId, ['owner']); // Only owner can remove members

    if (userIdToRemove === requesterId) {
        throw new Error('CANNOT_REMOVE_SELF'); // Maybe allow leaving later?
    }

    const deletedRows = await membersRepository.remove(userIdToRemove, projectId);
    if (deletedRows === 0) {
        throw new Error('MEMBER_NOT_FOUND');
    }
    return deletedRows;
};

// ---------------------------------------------------------------------------
// Invitación por link (ROADMAP F2 / SDD §18.3)
// El token es un JWT firmado: no requiere tabla nueva y caduca solo (7 días).
// ---------------------------------------------------------------------------

export const createInviteToken = async (
  projectUuid: string,
  role: 'viewer' | 'editor',
  requesterId: number,
): Promise<string> => {
  const projectId = await projectRepository.findIdByUuid(projectUuid);
  if (!projectId) throw new Error('PROJECT_NOT_FOUND');

  await checkPermission(requesterId, projectId, ['owner', 'editor']);

  const payload: InviteTokenPayload = { invite: true, proyecto_id: projectId, rol: role };
  return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '7d' });
};

const verifyInviteToken = (token: string): InviteTokenPayload => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as InviteTokenPayload;
    if (!decoded.invite || !decoded.proyecto_id) throw new Error('INVALID');
    return decoded;
  } catch {
    throw new Error('INVITE_INVALID_OR_EXPIRED');
  }
};

/** Vista previa pública del grupo (sin datos personales de los miembros). */
export const getInvitePreview = async (token: string) => {
  const { proyecto_id, rol } = verifyInviteToken(token);

  const project = await projectRepository.findById(proyecto_id);
  if (!project) throw new Error('INVITE_INVALID_OR_EXPIRED');

  const members = await membersRepository.findByProjectId(proyecto_id);

  return {
    nombre: project.nombre,
    descripcion: project.descripcion,
    total_miembros: members.length,
    rol,
  };
};

export const acceptInvite = async (token: string, userId: number) => {
  const { proyecto_id, rol } = verifyInviteToken(token);

  const project = await projectRepository.findById(proyecto_id);
  if (!project) throw new Error('INVITE_INVALID_OR_EXPIRED');

  // 'add' ya tolera membresías duplicadas (devuelve la existente)
  await membersRepository.add(userId, proyecto_id, rol);

  // Devolvemos lo necesario para redirigir al grupo en el cliente
  const full = await projectRepository.findById(proyecto_id);
  return full as unknown as { uuid: string; nombre: string };
};

export const addMemberByEmail = async (projectUuid: string, email: string, role: ProjectRole, requesterId: number) => {
    // 1. Obtener ID del proyecto
    const projectId = await projectRepository.findIdByUuid(projectUuid);
    if (!projectId) throw new Error('PROJECT_NOT_FOUND');

    // 2. Verificar permisos (El requester debe ser owner/editor del proyecto)
    const requesterRole = await membersRepository.findUserRole(requesterId, projectId);
    if (requesterRole !== 'owner' && requesterRole !== 'editor') {
        throw new Error('PERMISSION_DENIED');
    }

    // 3. Buscar al usuario a invitar
    const userToAdd = await userRepository.findByEmail(email);
    if (!userToAdd) throw new Error('USER_NOT_FOUND');

    if (userToAdd.id === requesterId) throw new Error('CANNOT_ADD_SELF');

    // 4. Añadir al proyecto
    // (La función 'add' del repositorio ya debería manejar si ya existe)
    return membersRepository.add(userToAdd.id, projectId, role);
};


