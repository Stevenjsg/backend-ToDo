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
  } catch (error) {
    res.status(500).json({ message: 'Error fetching items' });
  }
};

export const createItem = async (req: Request, res: Response) => {
  try {
    // Expect all relevant fields from the body now
    const { tipo, titulo, descripcion, completada, fecha_vencimiento, prioridad, etiquetas, regla_recurrencia, proyecto_id } = req.body;
    const userId = req.user!.id;

    // Basic validation (service should handle more complex cases)
    if (!tipo || !titulo) {
      return res.status(400).json({ message: 'Tipo and Titulo are required.' });
    }

    const newItemData = { tipo, titulo, descripcion, completada, fecha_vencimiento, prioridad, etiquetas, regla_recurrencia, proyecto_id };

    const newItem = await itemsService.createItem(newItemData, userId);
    res.status(201).json(newItem);
  } catch (error: any) {
    console.error("Error creating item:", error); // Log the actual error
    res.status(500).json({ message: 'Error creating item', error: error.message });
  }
};

export const updateItem = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user!.id;
    const { titulo, descripcion, completada, fecha_vencimiento, prioridad, etiquetas, regla_recurrencia } = req.body;
    
    // Define el tipo explícito para mayor claridad
    type UpdateDataType = Partial<Pick<Item, 'titulo' | 'descripcion' | 'completada' | 'fecha_vencimiento' | 'prioridad' | 'etiquetas' | 'regla_recurrencia'>>;
    
    const updateData: UpdateDataType = { titulo, descripcion, completada, fecha_vencimiento, prioridad, etiquetas, regla_recurrencia };

    // Filtra las claves undefined usando la aserción de tipo
    (Object.keys(updateData) as Array<keyof UpdateDataType>).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No update data provided.' });
    }

    const updatedItem = await itemsService.updateItem(id, updateData, userId);
    res.status(200).json(updatedItem);

  } catch (error: any) {
    if (error.message === 'ITEM_NOT_FOUND_OR_FORBIDDEN') {
      return res.status(404).json({ message: 'Item not found or permission denied.' });
    }
    res.status(500).json({ message: 'Error updating item' });
  }
};

export const deleteItem = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user!.id;

    await itemsService.deleteItem(id, userId);
    res.status(204).send(); // No Content

  } catch (error: any) {
    if (error.message === 'ITEM_NOT_FOUND_OR_FORBIDDEN') {
      return res.status(404).json({ message: 'Item not found or permission denied.' });
    }
    res.status(500).json({ message: 'Error deleting item' });
  }
};