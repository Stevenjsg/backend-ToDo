import * as itemsRepository from '../repositories/items.repository';
import { Item } from '../data/dataTypes';
import { io } from '../index';

const emitToRelevantRooms = (event: string, data: any, userId: number, projectId: number | null) => {
  if (projectId) {
    const room = `project_${projectId}`;
    console.log(`✅ Emitting ${event} to room: ${room}`);
    io.to(room).emit(event, data);
  } else {
    // Tarea personal, emitir a la sala del usuario
    const room = `user_${userId}`;
    console.log(`✅ Emitting ${event} to user room: ${room}`);
    io.to(room).emit(event, data); 
  }
};

// En src/services/items.service.ts

export const getItemsByUserId = (userId: number, type?: Item['tipo'], proyectoId?: number | null) => { // 👈 Añade proyectoId aquí
  // Pasa el proyectoId (que puede ser un número o null) al repositorio
  return itemsRepository.findByUserId(userId, type, proyectoId); // 👈 Pásalo aquí
};

export const createItem = async (data: Partial<Omit<Item, 'id' | 'usuario_id' | 'fecha_creacion' | 'fecha_actualizacion'>>, userId: number) => {
    // Add validation logic here if needed (e.g., check required fields based on 'tipo')
   const projectIdToSave = data.proyecto_id ?? null; // Asegura que sea null si no viene
    const newItem = await itemsRepository.create({ ...data, proyecto_id: projectIdToSave }, userId);
    
    // Usa el helper para emitir
    emitToRelevantRooms('item_created', newItem, userId, newItem.proyecto_id);
    
    return newItem;
};

export const updateItem = async (id: number, data: Partial<Omit<Item, 'id' | 'usuario_id' | 'fecha_creacion'>>, userId: number) => {
    // Add validation or business logic here
  const updatedItem = await itemsRepository.update(id, data, userId);
    if (!updatedItem) {
        throw new Error('ITEM_NOT_FOUND_OR_FORBIDDEN');
    }
    
    // Usa el helper para emitir
    emitToRelevantRooms('item_updated', updatedItem, userId, updatedItem.proyecto_id);
    
    return updatedItem;
};

export const deleteItem = async (id: number, userId: number) => {
   const itemToDelete = await itemsRepository.findById(id, userId); // Necesitas findById
    if (!itemToDelete) {
         throw new Error('ITEM_NOT_FOUND_OR_FORBIDDEN');
    }

    const deletedRows = await itemsRepository.remove(id, userId);
    // ... (manejo de error si deletedRows es 0) ...

    // Usa el helper para emitir (pasando el ID del item borrado)
    emitToRelevantRooms('item_deleted', { id: itemToDelete.id }, userId, itemToDelete.proyecto_id);
    
    return deletedRows;
};

// Necesitarías añadir findById en items.repository.ts
// export const findById = async (id: number, userId: number): Promise<Item | null> => { ... }