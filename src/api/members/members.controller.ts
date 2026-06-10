import { Request, Response } from 'express';
import * as membersService from '../../services/members.service';
import * as projectRepository from '../../repositories/project.repository';
import * as userRepository from '../../repositories/user.repository';
import { ProjectRole } from '../../data/dataTypes';
import { io } from '../../index';
import * as projectService from '../../services/project.service';

// POST /api/projects/:uuid/invite-link — genera un token de invitación (7 días)
export const createInviteLink = async (req: Request, res: Response) => {
  try {
    const projectUuid = req.params.uuid as string;
    const { role } = req.body as { role: 'viewer' | 'editor' };
    const requesterId = req.user!.id;

    const token = await membersService.createInviteToken(projectUuid, role, requesterId);
    res.status(201).json({ token });
  } catch (error: any) {
    if (error.message === 'PERMISSION_DENIED') {
      return res.status(403).json({ message: 'No tienes permiso para invitar a este grupo.' });
    }
    if (error.message === 'PROJECT_NOT_FOUND') {
      return res.status(404).json({ message: 'Grupo no encontrado.' });
    }
    console.error('Error creating invite link:', error);
    res.status(500).json({ message: 'Error creating invite link' });
  }
};

// Invita (añade) un miembro al proyecto por email. POST /:projectUuid/members
export const inviteMember = async (req: Request, res: Response) => {
  try {
    const { projectUuid } = req.params;
    const { email, role } = req.body;
    const requesterId = req.user!.id;

    const newMember = await membersService.addMemberByEmail(
      projectUuid,
      email,
      (role as ProjectRole) || 'viewer',
      requesterId
    );
    if (!newMember) {
      return res.status(500).json({ message: 'Error al añadir el miembro.' });
    }

    // Notificar al usuario invitado en su sala personal con los datos del proyecto
    const projectData = await projectService.getProjectById(
      newMember.proyecto_id,
      newMember.usuario_id
    );
    const userRoom = `user_${newMember.usuario_id}`;
    console.log(`📢 Notifying user in room ${userRoom} about new project`);
    io.to(userRoom).emit('project_received', projectData);

    res.status(201).json(newMember);
  } catch (error: any) {
    if (error.message === 'PROJECT_NOT_FOUND') return res.status(404).json({ message: 'Proyecto no encontrado.' });
    if (error.message === 'USER_NOT_FOUND') return res.status(404).json({ message: 'Usuario no encontrado.' });
    if (error.message === 'PERMISSION_DENIED') return res.status(403).json({ message: 'No tienes permiso para invitar.' });
    if (error.message === 'CANNOT_ADD_SELF') return res.status(400).json({ message: 'No puedes añadirte a ti mismo.' });
    console.error('Invite Member Error:', error);
    res.status(500).json({ message: 'Error al invitar miembro.' });
  }
};

export const getMembers = async (req: Request, res: Response) => {
  try {
    const projectId = await projectRepository.findIdByUuid(req.params.projectUuid);
    if (!projectId) return res.status(404).json({ message: 'Project not found.' });

    const requesterId = req.user!.id;
    const members = await membersService.getProjectMembers(projectId, requesterId);
    res.status(200).json(members);
  } catch (error: any) {
    if (error.message === 'PERMISSION_DENIED') return res.status(403).json({ message: 'You are not a member of this project.' });
    res.status(500).json({ message: 'Error fetching members.' });
  }
};

export const updateMemberRole = async (req: Request, res: Response) => {
  try {
    const projectId = await projectRepository.findIdByUuid(req.params.projectUuid);
    if (!projectId) return res.status(404).json({ message: 'Project not found.' });

    const userIdToUpdate = await userRepository.findIdByUuid(req.params.userUuid);
    if (!userIdToUpdate) return res.status(404).json({ message: 'User not found.' });

    const { role } = req.body;
    const requesterId = req.user!.id;

    const updatedMember = await membersService.updateMemberRole(projectId, userIdToUpdate, role as ProjectRole, requesterId);
    res.status(200).json(updatedMember);
  } catch (error: any) {
    if (error.message === 'PERMISSION_DENIED') return res.status(403).json({ message: 'Only the owner can change roles.' });
    if (error.message === 'OWNER_CANNOT_DEMOTE_SELF') return res.status(400).json({ message: 'Owner cannot demote themselves.' });
    if (error.message === 'CANNOT_CHANGE_OWNER_ROLE') return res.status(400).json({ message: 'Cannot change the role of the project owner.' });
    if (error.message === 'MEMBER_NOT_FOUND') return res.status(404).json({ message: 'Member not found in this project.' });
    res.status(500).json({ message: 'Error updating member role.' });
  }
};

export const removeMember = async (req: Request, res: Response) => {
  try {
    const projectId = await projectRepository.findIdByUuid(req.params.projectUuid);
    if (!projectId) return res.status(404).json({ message: 'Project not found.' });

    const userIdToRemove = await userRepository.findIdByUuid(req.params.userUuid);
    if (!userIdToRemove) return res.status(404).json({ message: 'User not found.' });

    const requesterId = req.user!.id;

    await membersService.removeMember(projectId, userIdToRemove, requesterId);
    res.status(204).send();
  } catch (error: any) {
    if (error.message === 'PERMISSION_DENIED') return res.status(403).json({ message: 'Only the owner can remove members.' });
    if (error.message === 'CANNOT_REMOVE_SELF') return res.status(400).json({ message: 'Owner cannot remove themselves.' });
    if (error.message === 'Cannot remove the project owner.') return res.status(400).json({ message: 'Cannot remove the project owner.' });
    if (error.message === 'MEMBER_NOT_FOUND') return res.status(404).json({ message: 'Member not found in this project.' });
    res.status(500).json({ message: 'Error removing member.' });
  }
};
