import { Router } from 'express';
import { inviteMember, getMembers, updateMemberRole, removeMember } from './members.controller';
import { protect } from '../../middleware/auth.middleware';
import { body, param } from 'express-validator';
import { handleValidationErrors } from '../items/items.validator'; // Reuse error handler

// Important: Need 'mergeParams: true' to access :projectUuid from parent router
const router = Router({ mergeParams: true });
router.use(protect); // Protect all member routes

// Validation Rules
const validateInvite = [
    body('email').isEmail().withMessage('Valid email required'),
    body('role').optional().isIn(['editor', 'viewer']).withMessage('Invalid role (editor or viewer only)'), // Only allow adding as editor/viewer
];
const validateUserUuidParam = [
    param('userUuid').isUUID(4).withMessage('User UUID must be a valid UUID'),
];
const validateUpdateRole = [
    body('role').isIn(['editor', 'viewer']).withMessage('Invalid role (editor or viewer only)'), // Only allow changing to editor/viewer
];


router.post('/', validateInvite, handleValidationErrors, inviteMember);
router.get('/', getMembers);
router.put('/:userUuid', validateUserUuidParam, validateUpdateRole, handleValidationErrors, updateMemberRole);
router.delete('/:userUuid', validateUserUuidParam, handleValidationErrors, removeMember);

export default router;
