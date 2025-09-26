import * as tareasRepository from '../repositories/tareas.repository';

/**
 * Obtiene la lista de tareas para un usuario.
 * @param userId El ID del usuario.
 * @returns La lista de tareas del usuario.
 */
export const getTareasByUserId = (userId: number) => {
  const tareas = tareasRepository.findByUserId(userId);
  return tareas;
};

/**
 * Crea una nueva tarea para un usuario.
 * @param descripcion El texto de la tarea.
 * @param userId El ID del usuario.
 * @returns La nueva tarea creada.
 */
export const createTarea = (data: { descripcion: string; prioridad: string; etiquetas: string[] }, userId: number) => {
  return tareasRepository.create(data, userId);
};

/**
 * Actualiza el estado de completado de una tarea.
 * @param id El ID de la tarea.
 * @param completada El nuevo estado.
 * @param userId El ID del usuario.
 * @returns La tarea actualizada.
 */
export const updateTarea = (id: number, completada: boolean, userId: number) => {
  return tareasRepository.update(id, completada, userId);
};


/**
 * Elimina una tarea.
 * @param id El ID de la tarea.
 * @param userId El ID del usuario.
 * @returns El número de filas eliminadas.
 */
export const deleteTarea = (id: number, userId: number) => {
  return tareasRepository.remove(id, userId);
};