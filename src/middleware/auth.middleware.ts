import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserPayload } from '../data/dataTypes';

// Modificamos la interfaz Request de Express para que pueda incluir nuestro payload
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export const protect = (req: Request, res: Response, next: NextFunction) => {
  let token;

  // 1. Leer el token de la cabecera 'Authorization'
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // 2. Extraer el token (formato: "Bearer TOKEN_AQUI")
      token = req.headers.authorization.split(' ')[1];

      // 3. Verificar el token
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as UserPayload;

      // 4. Añadir el payload del usuario a la petición
      // Así, las siguientes funciones en la ruta sabrán qué usuario hizo la petición
      req.user = decoded;

      next(); // Si todo va bien, pasa a la siguiente función
    } catch (error) {
      res.status(401).json({ message: 'Token no válido, autorización denegada.' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'No hay token, autorización denegada.' });
  }
};