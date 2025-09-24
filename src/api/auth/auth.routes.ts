import { Router } from 'express';
import { registerUser, loginUser } from './auth.controller';

const router = Router();

// Definimos la ruta POST para el registro
router.post('/register', registerUser);
router.post('/login', loginUser);
export default router;