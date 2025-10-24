import { pool } from '../config/database';
import { Item } from '../data/dataTypes'; // Import the updated interface

/**
 * Finds all items for a specific user, optionally filtered by type.
 * @param userId The ID of the user.
 * @param type Optional: Filter by item type ('task', 'note', 'reminder').
 * @returns An array of items.
 */
// En src/repositories/items.repository.ts
export const findByUserId = async (userId: number, tipo?: Item['tipo'], proyectoId?: number | null): Promise<Item[]> => {
  let query = `
    SELECT * FROM items
    WHERE usuario_id = $1
  `;
  const params: any[] = [userId];
  let paramIndex = 2; // Start index for additional params

  if (tipo) {
    query += ` AND tipo = $${paramIndex}`;
    params.push(tipo);
    paramIndex++;
  }

  // 👇 AQUÍ LA LÓGICA DE PROYECTO 👇
  if (proyectoId === null || proyectoId === undefined) {
      // Si no se especifica proyecto o es null, busca items personales
      query += ` AND proyecto_id IS NULL`; 
  } else {
      // Si se especifica un ID, busca items de ese proyecto
      query += ` AND proyecto_id = $${paramIndex}`;
      params.push(proyectoId);
      paramIndex++;
  }

  query += ` ORDER BY fecha_actualizacion DESC;`;

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Creates a new item (task, note, or reminder).
 * @param data The item data (including tipo, titulo, etc.).
 * @param userId The ID of the user creating the item.
 * @returns The newly created item.
 */
export const create = async (data: Partial<Omit<Item, 'id' | 'usuario_id' | 'fecha_creacion' | 'fecha_actualizacion'>>, userId: number): Promise<Item> => {
  const {
    tipo,
    titulo,
    descripcion = null,
    proyecto_id = null,
    completada = false,
    fecha_vencimiento = null,
    prioridad = 'media', // Default priority, adjust as needed
    etiquetas = [],
    regla_recurrencia = null,
  } = data;

  const query = `
    INSERT INTO items (usuario_id, tipo, titulo, descripcion, proyecto_id, completada, fecha_vencimiento, prioridad, etiquetas, regla_recurrencia)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *;
  `;
  const params = [
    userId, tipo, titulo, descripcion, proyecto_id, completada, fecha_vencimiento, prioridad, etiquetas, regla_recurrencia
  ];

  const result = await pool.query(query, params);
  return result.rows[0];
};

/**
 * Updates an existing item.
 * @param id The ID of the item to update.
 * @param data An object with the fields to update.
 * @param userId The ID of the user for ownership verification.
 * @returns The updated item, or null if not found or not owned.
 */
export const update = async (id: number, data: Partial<Omit<Item, 'id' | 'usuario_id' | 'fecha_creacion'>>, userId: number): Promise<Item | null> => {
    // Assert que las claves son válidas para el tipo 'data'
    const fields = Object.keys(data) as Array<keyof typeof data>; 
    
    // Verifica que haya campos para actualizar
    if (fields.length === 0) {
        // Opcional: Podrías devolver el item sin cambios o lanzar un error
        // Por ahora, simplemente devolvemos null o buscamos el item actual
        const currentItem = await pool.query('SELECT * FROM items WHERE id = $1 AND usuario_id = $2', [id, userId]);
        return currentItem.rows[0] || null;
    }

    const setClauses = fields.map((field, index) => `"${field}" = $${index + 1}`); // Usar comillas dobles por si los nombres de columna coinciden con palabras clave SQL
    const values = fields.map(field => data[field]); // Mapea los valores en el orden correcto

    setClauses.push(`fecha_actualizacion = NOW()`);
    values.push(id, userId); // Añade id y userId para el WHERE

    const query = `
      UPDATE items
      SET ${setClauses.join(', ')}
      WHERE id = $${fields.length + 1} AND usuario_id = $${fields.length + 2}
      RETURNING *;
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
};

/**
 * Deletes an item.
 * @param id The ID of the item to delete.
 * @param userId The ID of the user for ownership verification.
 * @returns The number of rows deleted (0 or 1).
 */
export const remove = async (id: number, userId: number): Promise<number> => {
  const query = `
    DELETE FROM items
    WHERE id = $1 AND usuario_id = $2;
  `;
  const result = await pool.query(query, [id, userId]);
  return result.rowCount ?? 0;
};
export const findById = async (id: number, userId: number): Promise<Item | null> => { 
  const query = `
    SELECT * FROM items
    WHERE id = $1 AND usuario_id = $2;
  `;
  const result = await pool.query(query, [id, userId]);
  return result.rows[0] || null;
 }