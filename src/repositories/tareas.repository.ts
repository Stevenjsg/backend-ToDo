import { pool } from '../config/database';
import { Tarea } from '../data/dataTypes';

/**
 * Busca todas las tareas de un usuario específico.
 * @param userId El ID del usuario.
 * @returns Un array con las tareas del usuario.
 */
export const findByUserId = async (userId: number): Promise<Tarea[]> => {
  const query = `
    SELECT * FROM tareas
    WHERE usuario_id = $1
    ORDER BY fecha_creacion DESC;
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
};


/**
 * Inserta una nueva tarea en la base de datos para un usuario específico.
 * @param descripcion El texto de la tarea.
 * @param userId El ID del usuario propietario de la tarea.
 * @returns La nueva tarea creada.
 */
export const create = async (descripcion: string, userId: number): Promise<Tarea> => {
  const query = `
    INSERT INTO tareas (descripcion, usuario_id)
    VALUES ($1, $2)
    RETURNING *;
  `;
  const result = await pool.query(query, [descripcion, userId]);
  return result.rows[0];
};

/**
 * Actualiza una tarea existente.
 * @param id El ID de la tarea a actualizar.
 * @param completada El nuevo estado de completado.
 * @param userId El ID del usuario propietario para seguridad.
 * @returns La tarea actualizada.
 */
export const update = async (id: number, completada: boolean, userId: number) => {
  const query = `
    UPDATE tareas
    SET completada = $1, fecha_modificacion = NOW()
    WHERE id = $2 AND usuario_id = $3
    RETURNING *;
  `;
  const result = await pool.query(query, [completada, id, userId]);
  return result.rows[0] || null; // Devuelve null si no se encontró la tarea
};

/**
 * Elimina una tarea de la base de datos.
 * @param id El ID de la tarea a eliminar.
 * @param userId El ID del usuario propietario para seguridad.
 * @returns El número de filas eliminadas (0 o 1).
 */
export const remove = async (id: number, userId: number): Promise<number> => {
  const query = `
    DELETE FROM tareas
    WHERE id = $1 AND usuario_id = $2;
  `;
  const result = await pool.query(query, [id, userId]);
  return result.rowCount ?? 0; // Devuelve 1 si se eliminó, 0 si no se encontró
};