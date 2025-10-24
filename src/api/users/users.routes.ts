import { Router } from 'express';
import { getMe, updateMe } from './users.controller';
import { protect } from '../../middleware/auth.middleware'; // Protegemos las rutas

const router = Router();

// Aplicamos el middleware protect a todas las rutas de este archivo
router.use(protect);

router.get('/me', getMe);
router.put('/me', updateMe);

export default router;