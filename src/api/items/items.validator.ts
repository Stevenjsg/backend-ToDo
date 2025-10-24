import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Validation rules for creating an item
export const validateCreateItem = [
    body('tipo').isIn(['task', 'note', 'reminder']).withMessage('Tipo inválido'),
    body('titulo').notEmpty().withMessage('El título es requerido').isString(),
    body('descripcion').optional().isString(),
    body('completada').optional().isBoolean(),
    body('fecha_vencimiento').optional({ nullable: true }).isISO8601().toDate(), // Validate date format
    body('prioridad').optional().isIn(['baja', 'media', 'alta']),
    body('etiquetas').optional().isArray().withMessage('Las etiquetas deben ser un array'),
    body('etiquetas.*').optional().isString().withMessage('Cada etiqueta debe ser un string'), // Validate each element
    body('regla_recurrencia').optional({ nullable: true }).isString(),
    body('proyecto_id').optional({ nullable: true }).isInt(),
];

// Validation rules for updating an item
export const validateUpdateItem = [
    param('id').isInt().withMessage('El ID debe ser un número entero'), // Validate ID from URL param
    // Make all body fields optional but validate their type if present
    body('tipo').optional().isIn(['task', 'note', 'reminder']),
    body('titulo').optional().isString(),
    body('descripcion').optional({ nullable: true }).isString(),
    body('completada').optional().isBoolean(),
    body('fecha_vencimiento').optional({ nullable: true }).isISO8601().toDate(),
    body('prioridad').optional({ nullable: true }).isIn(['baja', 'media', 'alta']),
    body('etiquetas').optional().isArray(),
    body('etiquetas.*').optional().isString(),
    body('regla_recurrencia').optional({ nullable: true }).isString(),
    body('proyecto_id').optional({ nullable: true }).isInt(),
];

// Middleware to handle validation errors
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};