import { Request, Response } from 'express';
import * as userService from '../../services/user.service';

export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id; // Obtenido del middleware protect
    const userProfile = await userService.getUserProfile(userId);
    res.status(200).json(userProfile);
  } catch (error) {
    res.status(404).json({ message: 'Usuario no encontrado.' });
  }
};

export const updateMe = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { nombre_completo, bio } = req.body; // Solo permitimos actualizar estos

    const updatedProfile = await userService.updateUserProfile(userId, { nombre_completo, bio });
    res.status(200).json(updatedProfile);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el perfil.' });
  }
};