import { Router } from 'express';
import { getTareas,createTarea, updateTarea, deleteTarea } from './tareas.controller';
import { protect } from '../../middleware/auth.middleware'; 

const router = Router();
router.use(protect);
// APLICA EL MIDDLEWARE AQUÍ
// Todas las rutas definidas DESPUÉS de esta línea estarán protegidas.
// La petición primero pasa por `protect` y, si es válida, llega a `getTareas`.
router.get('/', getTareas);
router.post('/', createTarea);
// PUT /api/tareas/:id
router.put('/:id', updateTarea);
router.delete('/:id', deleteTarea);
export default router;