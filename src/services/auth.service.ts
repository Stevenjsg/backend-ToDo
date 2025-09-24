import bcrypt from 'bcryptjs';
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