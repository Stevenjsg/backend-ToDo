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

router.put('/:uuid', validateUpdateItem, handleValidationErrors, updateItem);

// Add simple UUID validation for delete
router.delete('/:uuid',
    param('uuid').isUUID(4).withMessage('El UUID del item debe ser un UUID válido'),
    handleValidationErrors,
    deleteItem
);

export default router;