import * as itemsRepository from "../repositories/items.repository";
import * as membersService from "./members.service";
import { Item } from "../data/dataTypes";
import { io } from "../index";

const emitToRelevantRooms = (
  event: string,
  data: any,
  userId: number,
  projectId: number | null
) => {
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

export const getItemsByUserId = async (
  userId: number,
  type?: Item["tipo"],
  proyectoId?: number | null
) => {
  // Si se piden items de un proyecto, verificar que el usuario es miembro
  // (cualquier rol). Así devolvemos TODOS los items del proyecto de forma
  // colaborativa, pero solo a quien pertenece a él.
  if (proyectoId) {
    await membersService.checkRolPermission(userId, proyectoId, [
      "owner",
      "editor",
      "viewer",
    ]);
  }
  return itemsRepository.findByUserId(userId, type, proyectoId);
};

export const createItem = async (
  data: Partial<
    Omit<Item, "id" | "usuario_id" | "fecha_creacion" | "fecha_actualizacion">
  >,
  userId: number
) => {
  const projectIdToSave = data.proyecto_id ?? null;

  // 👇 1. VERIFICAR PERMISOS ANTES DE CREAR NADA
  if (projectIdToSave) {
    // Solo owner y editor pueden crear tareas en el proyecto
    await membersService.checkRolPermission(userId, projectIdToSave, [
      "owner",
      "editor",
    ]);
  }

  // 2. Ahora es seguro crear el item
  const newItem = await itemsRepository.create(
    { ...data, proyecto_id: projectIdToSave },
    userId
  );

  // 3. Emitir evento
  emitToRelevantRooms("item_created", newItem, userId, newItem.proyecto_id);

  return newItem;
};

export const updateItem = async (
  uuid: string,
  data: Partial<Omit<Item, "id" | "usuario_id" | "fecha_creacion">>,
  userId: number
) => {
  // 1. Obtener el item actual (por UUID) para saber si es de proyecto o personal
  const existingItem = await itemsRepository.findByUuidInternal(uuid);

  if (!existingItem) {
    throw new Error("ITEM_NOT_FOUND_OR_FORBIDDEN");
  }

  let updatedItem;

  if (existingItem.proyecto_id) {
    // --- CASO PROYECTO ---
    // Verificar permisos (Owner o Editor pueden editar cualquiera)
    await membersService.checkRolPermission(userId, existingItem.proyecto_id, [
      "owner",
      "editor",
    ]);

    // Usamos una función que NO filtra por usuario creador, sino por proyecto
    updatedItem = await itemsRepository.updateByProjectId(
      existingItem.id,
      data,
      existingItem.proyecto_id
    );
  } else {
    // --- CASO PERSONAL ---
    // Verificar que el usuario sea el dueño
    if (existingItem.usuario_id !== userId) {
      throw new Error("ITEM_NOT_FOUND_OR_FORBIDDEN");
    }
    // Usamos la función estándar
    updatedItem = await itemsRepository.update(existingItem.id, data, userId);
  }

  if (!updatedItem) {
    throw new Error("ITEM_NOT_FOUND_OR_FORBIDDEN");
  }

  // Emitir evento
  emitToRelevantRooms(
    "item_updated",
    updatedItem,
    userId,
    updatedItem.proyecto_id
  );

  return updatedItem;
};

export const deleteItem = async (uuid: string, userId: number) => {
  // 1. Obtener el item (por UUID) para ver de qué tipo es
  const itemToDelete = await itemsRepository.findByUuidInternal(uuid);

  if (!itemToDelete) {
    throw new Error("ITEM_NOT_FOUND_OR_FORBIDDEN");
  }

  let deletedRows = 0;

  if (itemToDelete.proyecto_id) {
    // --- CASO PROYECTO ---
    // Verificar permisos (Owner o Editor)
    await membersService.checkRolPermission(userId, itemToDelete.proyecto_id, [
      "owner",
      "editor",
    ]);

    // Borrar usando la NUEVA función (ignora quién la creó)
    deletedRows = await itemsRepository.removeByProjectId(
      itemToDelete.id,
      itemToDelete.proyecto_id
    );
  } else {
    // --- CASO PERSONAL ---
    // Solo el dueño puede borrarla (la función original ya valida usuario_id)
    // Asegúrate de verificar que itemToDelete.usuario_id === userId si usas un find genérico antes
    if (itemToDelete.usuario_id !== userId) {
      throw new Error("ITEM_NOT_FOUND_OR_FORBIDDEN");
    }
    deletedRows = await itemsRepository.remove(itemToDelete.id, userId);
  }

  if (deletedRows === 0) {
    throw new Error("ITEM_NOT_FOUND_OR_FORBIDDEN");
  }

  // Emitir evento
  emitToRelevantRooms(
    "item_deleted",
    { id: itemToDelete.id },
    userId,
    itemToDelete.proyecto_id
  );

  return deletedRows;
};
