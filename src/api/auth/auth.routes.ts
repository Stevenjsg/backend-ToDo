import { Router } from 'express';
import { registerUser } from './auth.controller';

const router = Router();

// Definimos la ruta POST para el registro
router.post('/register', registerUser);

export default router;