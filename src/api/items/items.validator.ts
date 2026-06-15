import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { TIPOS_ENTREGABLE } from '../../data/dataTypes';

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
    body('parent_id').optional({ nullable: true }).isInt(),
    body('assignee_id').optional({ nullable: true }).isInt(),
    body('pomodoros_estimados').optional({ nullable: true }).isInt({ min: 1 }),
    body('tipo_entregable').optional({ nullable: true }).isIn([...TIPOS_ENTREGABLE]),
    body('tamano_entregable').optional({ nullable: true }).isString().isLength({ max: 120 }),
];

// Validation rules for creating subtasks in bulk (blocks of a topic)
export const validateCreateSubtasks = [
    param('uuid').isUUID(4).withMessage('El UUID del item padre debe ser un UUID válido'),
    body('bloques').isArray({ min: 1, max: 30 }).withMessage('bloques debe ser un array (1-30)'),
    body('bloques.*.titulo').notEmpty().withMessage('Cada bloque necesita un título').isString(),
    body('bloques.*.descripcion').optional({ nullable: true }).isString(),
    body('bloques.*.pomodoros_estimados').optional({ nullable: true }).isInt({ min: 1 }),
    body('bloques.*.assignee_id').optional({ nullable: true }).isInt(),
];

// Validation rules for updating an item
export const validateUpdateItem = [
    param('uuid').isUUID(4).withMessage('El UUID del item debe ser un UUID válido'), // Validate UUID from URL param
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
    body('assignee_id').optional({ nullable: true }).isInt(),
    body('pomodoros_estimados').optional({ nullable: true }).isInt({ min: 1 }),
    body('tipo_entregable').optional({ nullable: true }).isIn([...TIPOS_ENTREGABLE]),
    body('tamano_entregable').optional({ nullable: true }).isString().isLength({ max: 120 }),
    body('steps_completed').optional().isArray().withMessage('steps_completed debe ser un array'),
    body('steps_completed.*').optional().isBoolean().withMessage('Cada paso debe ser booleano'),
];

// Middleware to handle validation errors
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};