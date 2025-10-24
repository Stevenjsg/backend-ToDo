import * as membersRepository from '../repositories/members.repository';
import * as userRepository from '../repositories/user.repository'; // Need this to find users by email
import { ProjectRole } from '../data/dataTypes';

// Helper function for permission checks
const checkPermission = async (requesterId: number, projectId: number, allowedRoles: ProjectRole[]) => {
    const requesterRole = await membersRepository.findUserRole(requesterId, projectId);
    if (!requesterRole || !allowedRoles.includes(requesterRole)) {
        throw new Error('PERMISSION_DENIED');
    }
    return requesterRole; // Return role if needed
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