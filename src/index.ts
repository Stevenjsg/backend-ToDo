import express, { Request, Response } from 'express';
import 'dotenv/config';
import authRouter from './api/auth/auth.routes'; // 👈 IMPORTA EL ENRUTADOR

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// RUTA DE PRUEBA
app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: '¡La API de To-Do está funcionando!'
  });
});

// 👇 USA LAS RUTAS DE AUTENTICACIÓN
// Todas las rutas que definimos en auth.routes.ts empezarán ahora con /api/auth
app.use('/api/auth', authRouter);

app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});