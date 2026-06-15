import { Request, Response } from 'express';
import * as itemsService from '../../services/items.service';
import { ItemType, Item } from '../../data/dataTypes'; // Import ItemType

export const getItems = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const type = req.query.tipo as ItemType | undefined;
    
    // 👇 Lee el proyectoId del query parameter
    let proyectoId: number | null = null;
    if (req.query.proyectoId && req.query.proyectoId !== 'null' && req.query.proyectoId !== 'undefined') {
        proyectoId = parseInt(req.query.proyectoId as string);
        // Añade validación si es necesario para asegurarse que es un número
        if (isNaN(proyectoId)) {
             return res.status(400).json({ message: 'proyectoId inválido.' });
        }
    } // Si no viene, o es 'null'/'undefined', se queda como null (tareas personales)

    // 👇 Pasa el proyectoId (número o null) al servicio
    const items = await itemsService.getItemsByUserId(userId, type, proyectoId);

    res.status(200).json(items);
  } catch (error: any) {
    if (error.message === 'PERMISSION_DENIED') {
      return res.status(403).json({ message: 'No perteneces a este proyecto.' });
    }
    res.status(500).json({ message: 'Error fetching items' });
  }
};

export const createItem = async (req: Request, res: Response) => {
  try {
    // Expect all relevant fields from the body now
    const { tipo, titulo, descripcion, completada, fecha_vencimiento, prioridad, etiquetas, regla_recurrencia, proyecto_id, parent_id, assignee_id, pomodoros_estimados, tipo_entregable, tamano_entregable } = req.body;
    const userId = req.user!.id;

    // Basic validation (service should handle more complex cases)
    if (!tipo || !titulo) {
      return res.status(400).json({ message: 'Tipo and Titulo are required.' });
    }

    const newItemData = { tipo, titulo, descripcion, completada, fecha_vencimiento, prioridad, etiquetas, regla_recurrencia, proyecto_id, parent_id, assignee_id, pomodoros_estimados, tipo_entregable, tamano_entregable };

    const newItem = await itemsService.createItem(newItemData, userId);
    res.status(201).json(newItem);
  } catch (error: any) {
    if (error.message === 'PERMISSION_DENIED') {
      return res.status(403).json({ message: 'No tienes permiso para crear items en este proyecto.' });
    }
    console.error("Error creating item:", error); // Log the actual error
    res.status(500).json({ message: 'Error creating item', error: error.message });
  }
};

export const updateItem = async (req: Request, res: Response) => {
  try {
    const uuid = req.params.uuid;
    const userId = req.user!.id;
    const { titulo, descripcion, completada, fecha_vencimiento, prioridad, etiquetas, regla_recurrencia, assignee_id, pomodoros_estimados, tipo_entregable, tamano_entregable, steps_completed } = req.body;

    // Define el tipo explícito para mayor claridad
    type UpdateDataType = Partial<Pick<Item, 'titulo' | 'descripcion' | 'completada' | 'fecha_vencimiento' | 'prioridad' | 'etiquetas' | 'regla_recurrencia' | 'assignee_id' | 'pomodoros_estimados' | 'tipo_entregable' | 'tamano_entregable'>> & { steps_completed?: string };

    // steps_completed es JSONB: el repositorio arma el UPDATE genéricamente y
    // pg encodearía un array JS como array de Postgres (incompatible con jsonb).
    // Lo serializamos a texto; Postgres castea text→jsonb en el SET.
    const updateData: UpdateDataType = { titulo, descripcion, completada, fecha_vencimiento, prioridad, etiquetas, regla_recurrencia, assignee_id, pomodoros_estimados, tipo_entregable, tamano_entregable };
    if (Array.isArray(steps_completed)) {
      updateData.steps_completed = JSON.stringify(steps_completed);
    }

    // Filtra las claves undefined usando la aserción de tipo
    (Object.keys(updateData) as Array<keyof UpdateDataType>).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No update data provided.' });
    }

    // steps_completed viaja serializado (text→jsonb); el tipo de Item lo declara
    // como boolean[], de ahí el cast en el límite con el servicio.
    const updatedItem = await itemsService.updateItem(uuid, updateData as unknown as Partial<Item>, userId);
    res.status(200).json(updatedItem);

  } catch (error: any) {
    if (error.message === 'PERMISSION_DENIED') {
      return res.status(403).json({ message: 'No tienes permiso para editar este item.' });
    }
    if (error.message === 'ITEM_NOT_FOUND_OR_FORBIDDEN') {
      return res.status(404).json({ message: 'Item not found or permission denied.' });
    }
    res.status(500).json({ message: 'Error updating item' });
  }
};

// Crea en bloque las sub-tareas (bloques) de un item padre
export const createSubtasks = async (req: Request, res: Response) => {
  try {
    const parentUuid = req.params.uuid;
    const userId = req.user!.id;
    const { bloques } = req.body as {
      bloques: Array<{
        titulo: string;
        descripcion?: string | null;
        pomodoros_estimados?: number | null;
        assignee_id?: number | null;
      }>;
    };

    const created = await itemsService.createSubtasks(parentUuid, bloques, userId);
    res.status(201).json(created);
  } catch (error: any) {
    if (error.message === 'PERMISSION_DENIED') {
      return res.status(403).json({ message: 'No tienes permiso para crear sub-tareas en este grupo.' });
    }
    if (error.message === 'ITEM_NOT_FOUND_OR_FORBIDDEN') {
      return res.status(404).json({ message: 'Item not found or permission denied.' });
    }
    if (error.message === 'PARENT_IS_SUBTASK') {
      return res.status(400).json({ message: 'Una sub-tarea no puede tener sub-tareas.' });
    }
    console.error('Error creating subtasks:', error);
    res.status(500).json({ message: 'Error creating subtasks' });
  }
};

// Tareas pendientes para el selector del Pomodoro (personales + asignadas)
export const getFocusItems = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const items = await itemsService.getFocusItems(userId);
    res.status(200).json(items);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching focus items' });
  }
};

export const deleteItem = async (req: Request, res: Response) => {
  try {
    const uuid = req.params.uuid;
    const userId = req.user!.id;

    await itemsService.deleteItem(uuid, userId);
    res.status(204).send(); // No Content

  } catch (error: any) {
    if (error.message === 'PERMISSION_DENIED') {
      return res.status(403).json({ message: 'No tienes permiso para borrar este item.' });
    }
    if (error.message === 'ITEM_NOT_FOUND_OR_FORBIDDEN') {
      return res.status(404).json({ message: 'Item not found or permission denied.' });
    }
    res.status(500).json({ message: 'Error deleting item' });
  }
};