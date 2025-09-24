import { Request, Response } from 'express';
// 👈 1. IMPORTA EL SERVICIO
import * as authService from '../../services/auth.service';

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validación básica (puedes mejorarla con express-validator)
    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son requeridos.' });
    }

    // 2. LLAMA AL SERVICIO PARA REGISTRAR AL USUARIO
    const newUser = await authService.register(email, password);

    // 3. ENVÍA LA RESPUESTA AL CLIENTE
    res.status(201).json(newUser);

  } catch (error: any) {
    // Manejo de errores (ej. si el email ya existe)
    if (error.code === '23505') { // Código de error de PostgreSQL para violación de 'UNIQUE'
      return res.status(409).json({ message: 'El email ya está en uso.' });
    }
    res.status(500).json({ message: 'Error en el servidor' });
  }
};