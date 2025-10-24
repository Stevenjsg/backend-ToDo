import { Router } from 'express';
import { logSession } from './pomodoro.controller';
import { protect } from '../../middleware/auth.middleware';
import { body } from 'express-validator'; // Use express-validator
import { handleValidationErrors } from '../items/items.validator'; // Reuse error handler

const router = Router();
router.use(protect); // Protect Pomodoro routes

// Add validation rules
const validateLogSession = [
    body('durationMinutes').isInt({ gt: 0 }).withMessage('durationMinutes must be a positive integer'),
    body('sessionType').isIn(['trabajo', 'descanso_corto', 'descanso_largo']).withMessage('Invalid sessionType'),
    body('itemId').optional({ nullable: true }).isInt().withMessage('itemId must be an integer if provided'),
];

router.post('/log', validateLogSession, handleValidationErrors, logSession);

export default router;