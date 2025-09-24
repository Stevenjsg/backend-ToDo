import { Request, Response } from 'express';
import * as tareasService from '../../services/tareas.service';

export const getTareas = async (req: Request, res: Response) => {
  try {
    // 1. El ID del usuario viene de `req.user`, que fue añadido por el middleware `protect`.
    const userId = req.user!.id;

    // 2. Llamamos al servicio para obtener las tareas
    const tareas = await tareasService.getTareasByUserId(userId);

    // 3. Enviamos las tareas como respuesta
    res.status(200).json(tareas);
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor' });
  }
};


export const createTarea = async (req: Request, res: Response) => {
  try {
    const { descripcion } = req.body;
    const userId = req.user!.id;

    // Validación simple
    if (!descripcion) {
      return res.status(400).json({ message: 'La descripción es requerida.' });
    }

    const nuevaTarea = await tareasService.createTarea(descripcion, userId);
    res.status(201).json(nuevaTarea); // 201 Created es el código correcto para una creación exitosa
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

export const updateTarea = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id); // El ID viene de la URL
    const { completada } = req.body;
    const userId = req.user!.id;

    if (typeof completada !== 'boolean') {
      return res.status(400).json({ message: 'El campo "completada" debe ser un booleano.' });
    }

    const tareaActualizada = await tareasService.updateTarea(id, completada, userId);

    if (!tareaActualizada) {
      return res.status(404).json({ message: 'Tarea no encontrada o no tienes permiso para modificarla.' });
    }

    res.status(200).json(tareaActualizada);
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

export const deleteTarea = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user!.id;

    const deletedRows = await tareasService.deleteTarea(id, userId);

    if (deletedRows === 0) {
      return res.status(404).json({ message: 'Tarea no encontrada o no tienes permiso para eliminarla.' });
    }

    // 204 No Content es el estado estándar para una eliminación exitosa
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor' });
  }
};