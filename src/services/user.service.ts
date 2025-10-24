import * as userRepository from '../repositories/user.repository';

export const getUserProfile = async (userId: number) => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }
  return user;
};

export const updateUserProfile = async (userId: number, data: { nombre_completo?: string; bio?: string }) => {
  // Aquí podrías añadir validaciones (ej. longitud del nombre)
  const updatedUser = await userRepository.update(userId, data);
  return updatedUser;
};