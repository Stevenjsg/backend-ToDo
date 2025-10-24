import { Request, Response } from 'express';
import * as membersService from '../../services/members.service';
import { ProjectRole } from '../../data/dataTypes';

export const addMember = async (req: Request, res: Response) => {
    try {
        const projectId = parseInt(req.params.projectId);
        const { email, role } = req.body;
        const requesterId = req.user!.id;

        const newMember = await membersService.addMember(projectId, email, role as ProjectRole, requesterId);
        res.status(201).json(newMember);
    } catch (error: any) {
        if (error.message === 'PERMISSION_DENIED') return res.status(403).json({ message: 'Permission denied.' });
        if (error.message === 'USER_TO_ADD_NOT_FOUND') return res.status(404).json({ message: 'User with that email not found.' });
        if (error.message === 'CANNOT_ADD_SELF') return res.status(400).json({ message: 'Cannot add yourself as a member.' });
        if (error.message === 'CANNOT_CHANGE_OWNER_ROLE') return res.status(400).json({ message: 'Cannot change the role of the project owner.'});
        console.error("Add Member Error:", error);
        res.status(500).json({ message: 'Error adding member.' });
    }
};

export const getMembers = async (req: Request, res: Response) => {
     try {
        const projectId = parseInt(req.params.projectId);
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
        const projectId = parseInt(req.params.projectId);
        const userIdToUpdate = parseInt(req.params.userId);
        const { role } = req.body;
        const requesterId = req.user!.id;

        const updatedMember = await membersService.updateMemberRole(projectId, userIdToUpdate, role as ProjectRole, requesterId);
        res.status(200).json(updatedMember);
    } catch (error: any) {
        if (error.message === 'PERMISSION_DENIED') return res.status(403).json({ message: 'Only the owner can change roles.' });
        if (error.message === 'OWNER_CANNOT_DEMOTE_SELF') return res.status(400).json({ message: 'Owner cannot demote themselves.' });
        if (error.message === 'CANNOT_CHANGE_OWNER_ROLE') return res.status(400).json({ message: 'Cannot change the role of the project owner.'});
        if (error.message === 'MEMBER_NOT_FOUND') return res.status(404).json({ message: 'Member not found in this project.' });
        res.status(500).json({ message: 'Error updating member role.' });
    }
};

export const removeMember = async (req: Request, res: Response) => {
     try {
        const projectId = parseInt(req.params.projectId);
        const userIdToRemove = parseInt(req.params.userId);
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