import { Router } from 'express';
import { getItems, createItem, updateItem, deleteItem } from './items.controller';
import { protect } from '../../middleware/auth.middleware';
// Import validation rules and handler
import { validateCreateItem, validateUpdateItem, handleValidationErrors } from './items.validator';
import { param } from 'express-validator'; // For DELETE validation

const router = Router();
router.use(protect); // Protect all item routes

router.get('/', getItems);

// Apply validation middleware before the controller
router.post('/', validateCreateItem, handleValidationErrors, createItem);

router.put('/:id', validateUpdateItem, handleValidationErrors, updateItem);

// Add simple ID validation for delete
router.delete('/:id',
    param('id').isInt().withMessage('El ID debe ser un número entero'),
    handleValidationErrors,
    deleteItem
);

export default router;