import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// 👈 1. IMPORTA EL REPOSITORIO
import * as userRepository from '../repositories/user.repository';
import { Request } from 'express';


export const register = async (email: string, password: string) => {
  const hashedPassword = await bcrypt.hash(password, 10);

  // 2. LLAMA AL REPOSITORIO PARA CREAR EL USUARIO
  const newUser = await userRepository.create(email, hashedPassword);
  
  // 3. DEVUELVE EL NUEVO USUARIO
  return newUser;
};

/**
 * Autentica a un usuario y le devuelve un token JWT.
 * @param email El email del usuario.
 * @param password La contraseña en texto plano.
 * @returns Un token JWT si la autenticación es exitosa.
 */
export const login = async (email: string, password: string) => {
  // 1. Buscar al usuario por su email
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new Error('AUTH_INVALID_CREDENTIALS');
  }

  // 2. Comparar la contraseña enviada con el hash de la base de datos
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new Error('AUTH_INVALID_CREDENTIALS');
  }

  // 3. Crear el "payload" del token (la información que guardaremos dentro)
  const payload = {
    id: user.id,
    email: user.email,
  };

  // 4. Firmar el token con nuestro secreto
  const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: '1h', // El token expirará en 1 hora
  });

  return { token };
};