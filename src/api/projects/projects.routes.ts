import { Router } from 'express';
import { createProject, getProjects, getProject, updateProject, deleteProject } from './projects.controller';
import { protect } from '../../middleware/auth.middleware';
import { body, param } from 'express-validator';
import { handleValidationErrors } from '../items/items.validator'; // Reuse error handler
import membersRouter from '../members/members.routes'

const router = Router();
router.use(protect); // Protect all project routes

const validateProjectData = [
    body('nombre').notEmpty().withMessage('El nombre del proyecto es requerido').isString(),
    body('descripcion').optional({ nullable: true }).isString(),
];
const validateProjectId = [
    param('id').isInt().withMessage('El ID del proyecto debe ser un número entero'),
];

router.post('/', validateProjectData, handleValidationErrors, createProject);
router.get('/', getProjects);
router.get('/:id', validateProjectId, handleValidationErrors, getProject);
router.put('/:id', validateProjectId, validateProjectData, handleValidationErrors, updateProject);
router.delete('/:id', validateProjectId, handleValidationErrors, deleteProject);
router.use('/:projectId/members', membersRouter);

export default router;