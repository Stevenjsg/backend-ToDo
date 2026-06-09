import { Router } from 'express';
import { getItems, createItem, updateItem, deleteItem, createSubtasks, getFocusItems } from './items.controller';
import { protect } from '../../middleware/auth.middleware';
// Import validation rules and handler
import { validateCreateItem, validateUpdateItem, validateCreateSubtasks, handleValidationErrors } from './items.validator';
import { param } from 'express-validator'; // For DELETE validation

const router = Router();
router.use(protect); // Protect all item routes

router.get('/', getItems);

// Tareas pendientes para el Pomodoro (personales + asignadas al usuario)
router.get('/focus', getFocusItems);

// Apply validation middleware before the controller
router.post('/', validateCreateItem, handleValidationErrors, createItem);

// Crear sub-tareas (bloques) en lote bajo un item padre
router.post('/:uuid/subtasks', validateCreateSubtasks, handleValidationErrors, createSubtasks);

router.put('/:uuid', validateUpdateItem, handleValidationErrors, updateItem);

// Add simple UUID validation for delete
router.delete('/:uuid',
    param('uuid').isUUID(4).withMessage('El UUID del item debe ser un UUID válido'),
    handleValidationErrors,
    deleteItem
);

export default router;
