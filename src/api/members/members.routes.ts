import { Router } from 'express';
import { addMember, getMembers, updateMemberRole, removeMember } from './members.controller';
import { protect } from '../../middleware/auth.middleware';
import { body, param } from 'express-validator';
import { handleValidationErrors } from '../items/items.validator'; // Reuse error handler

// Important: Need 'mergeParams: true' to access :projectId from parent router
const router = Router({ mergeParams: true });
router.use(protect); // Protect all member routes

// Validation Rules
const validateAddMember = [
    body('email').isEmail().withMessage('Valid email required'),
    body('role').isIn(['editor', 'viewer']).withMessage('Invalid role (editor or viewer only)'), // Only allow adding as editor/viewer
];
const validateUserIdParam = [
    param('userId').isInt().withMessage('User ID must be an integer'),
];
const validateUpdateRole = [
    body('role').isIn(['editor', 'viewer']).withMessage('Invalid role (editor or viewer only)'), // Only allow changing to editor/viewer
];


router.post('/', validateAddMember, handleValidationErrors, addMember);
router.get('/', getMembers);
router.put('/:userId', validateUserIdParam, validateUpdateRole, handleValidationErrors, updateMemberRole);
router.delete('/:userId', validateUserIdParam, handleValidationErrors, removeMember);

export default router;