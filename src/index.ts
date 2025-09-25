import express, { Request, Response } from 'express';
import 'dotenv/config';
import cors from 'cors';
import authRouter from './api/auth/auth.routes'; 
import tareasRouter from './api/tasks/tareas.routes';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
// app.use(cors({
//   origin: 'https://mi-app-vue.com'
// }));
app.use(express.json());


// 👇 USA LAS RUTAS DE AUTENTICACIÓN
// Todas las rutas que definimos en auth.routes.ts empezarán ahora con /api/auth
app.use('/api/auth', authRouter);
app.use('/api/tareas', tareasRouter);

app.get('/', (req: Request, res: Response) => {
  res.send('¡API de ToDo funcionando correctamente!');
});

app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});