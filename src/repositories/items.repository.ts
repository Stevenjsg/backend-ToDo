import { pool } from "../config/database";
import { Item } from "../data/dataTypes"; // Import the updated interface

/**
 * Finds all items for a specific user, optionally filtered by type.
 * @param userId The ID of the user.
 * @param type Optional: Filter by item type ('task', 'note', 'reminder').
 * @returns An array of items.
 */
// En src/repositories/items.repository.ts
export const findByUserId = async (
  userId: number,
  tipo?: Item["tipo"],
  proyectoId?: number | null
): Promise<Item[]> => {
  const params: any[] = [];
  let query = `SELECT * FROM items WHERE `;
  let paramIndex = 1;

  // 👇 LÓGICA DE PROYECTO 👇
  if (proyectoId === null || proyectoId === undefined) {
    // Items PERSONALES: solo los del propio usuario y sin proyecto.
    query += `usuario_id = $${paramIndex} AND proyecto_id IS NULL`;
    params.push(userId);
    paramIndex++;
  } else {
    // Items de PROYECTO: TODOS los del proyecto (vista colaborativa),
    // sin importar quién los creó. La pertenencia al proyecto se valida
    // en el service antes de llegar aquí.
    query += `proyecto_id = $${paramIndex}`;
    params.push(proyectoId);
    paramIndex++;
  }

  if (tipo) {
    query += ` AND tipo = $${paramIndex}`;
    params.push(tipo);
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
export const create = async (
  data: Partial<
    Omit<Item, "id" | "usuario_id" | "fecha_creacion" | "fecha_actualizacion">
  >,
  userId: number
): Promise<Item> => {
  const {
    tipo,
    titulo,
    descripcion = null,
    proyecto_id = null,
    completada = false,
    fecha_vencimiento = null,
    prioridad = "media", // Default priority, adjust as needed
    etiquetas = [],
    regla_recurrencia = null,
    parent_id = null,
    assignee_id = null,
    pomodoros_estimados = null,
  } = data;

  const query = `
    INSERT INTO items (usuario_id, tipo, titulo, descripcion, proyecto_id, completada, fecha_vencimiento, prioridad, etiquetas, regla_recurrencia, parent_id, assignee_id, pomodoros_estimados)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *;
  `;
  const params = [
    userId,
    tipo,
    titulo,
    descripcion,
    proyecto_id,
    completada,
    fecha_vencimiento,
    prioridad,
    etiquetas,
    regla_recurrencia,
    parent_id,
    assignee_id,
    pomodoros_estimados,
  ];

  const result = await pool.query(query, params);
  return result.rows[0];
};

/**
 * Crea varias sub-tareas (bloques) bajo un item padre, en una transacción.
 * @returns Los items creados, en el mismo orden.
 */
export const createSubtasks = async (
  parent: Item,
  blocks: Array<{
    titulo: string;
    descripcion?: string | null;
    pomodoros_estimados?: number | null;
    assignee_id?: number | null;
  }>,
  userId: number
): Promise<Item[]> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const created: Item[] = [];
    for (const block of blocks) {
      const result = await client.query(
        `INSERT INTO items (usuario_id, tipo, titulo, descripcion, proyecto_id, parent_id, assignee_id, pomodoros_estimados)
         VALUES ($1, 'task', $2, $3, $4, $5, $6, $7)
         RETURNING *;`,
        [
          userId,
          block.titulo,
          block.descripcion ?? null,
          parent.proyecto_id,
          parent.id,
          block.assignee_id ?? null,
          block.pomodoros_estimados ?? null,
        ]
      );
      created.push(result.rows[0]);
    }
    await client.query("COMMIT");
    return created;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

/**
 * Items pendientes "para enfocar" de un usuario: sus tareas personales
 * pendientes + las tareas de grupo asignadas a él. Para el selector del Pomodoro.
 */
export const findFocusItems = async (userId: number): Promise<Item[]> => {
  const query = `
    SELECT i.*, p.nombre AS proyecto_nombre
    FROM items i
    LEFT JOIN proyectos p ON p.id = i.proyecto_id
    WHERE i.tipo = 'task' AND i.completada = FALSE AND (
      (i.proyecto_id IS NULL AND i.usuario_id = $1)
      OR i.assignee_id = $1
    )
    ORDER BY i.fecha_actualizacion DESC;
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
};

/**
 * Updates an existing item.
 * @param id The ID of the item to update.
 * @param data An object with the fields to update.
 * @param userId The ID of the user for ownership verification.
 * @returns The updated item, or null if not found or not owned.
 */
export const update = async (
  id: number,
  data: Partial<Omit<Item, "id" | "usuario_id" | "fecha_creacion">>,
  userId: number
): Promise<Item | null> => {
  // Assert que las claves son válidas para el tipo 'data'
  const fields = Object.keys(data) as Array<keyof typeof data>;

  // Verifica que haya campos para actualizar
  if (fields.length === 0) {
    // Opcional: Podrías devolver el item sin cambios o lanzar un error
    // Por ahora, simplemente devolvemos null o buscamos el item actual
    const currentItem = await pool.query(
      "SELECT * FROM items WHERE id = $1 AND usuario_id = $2",
      [id, userId]
    );
    return currentItem.rows[0] || null;
  }

  const setClauses = fields.map((field, index) => `"${field}" = $${index + 1}`); // Usar comillas dobles por si los nombres de columna coinciden con palabras clave SQL
  const values = fields.map((field) => data[field]); // Mapea los valores en el orden correcto

  setClauses.push(`fecha_actualizacion = NOW()`);
  values.push(id, userId); // Añade id y userId para el WHERE

  const query = `
      UPDATE items
      SET ${setClauses.join(", ")}
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
export const updateByProjectId = async (
  id: number,
  data: Partial<Omit<Item, "id" | "usuario_id" | "fecha_creacion">>,
  projectId: number
): Promise<Item | null> => {
  const fields = Object.keys(data) as Array<keyof typeof data>;

  if (fields.length === 0) return null; // O buscar y devolver el actual

  const setClauses = fields.map((field, index) => `"${field}" = $${index + 1}`);
  const values = fields.map((field) => data[field]);

  setClauses.push(`fecha_actualizacion = NOW()`);

  // Añadimos ID y ProjectID al final de los valores
  values.push(id, projectId);

  const query = `
      UPDATE items
      SET ${setClauses.join(", ")}
      WHERE id = $${fields.length + 1} AND proyecto_id = $${fields.length + 2}
      RETURNING *;
    `;

  const result = await pool.query(query, values);
  return result.rows[0] || null;
};

/**
 * Busca un item exclusivamente por su UUID público, sin validar el usuario.
 * Útil para lógica de negocio donde primero necesitamos saber a qué proyecto
 * pertenece (y obtener su id interno para las operaciones posteriores).
 * @param uuid El UUID del item a buscar.
 * @returns El objeto Item completo o null.
 */
export const findByUuidInternal = async (
  uuid: string
): Promise<Item | null> => {
  const query = `
    SELECT * FROM items
    WHERE uuid = $1;
  `;
  const result = await pool.query(query, [uuid]);

  return result.rows[0] || null;
};

export const findById = async (
  id: number,
  userId: number
): Promise<Item | null> => {
  const query = `
    SELECT * FROM items
    WHERE id = $1 AND usuario_id = $2;
  `;
  const result = await pool.query(query, [id, userId]);
  return result.rows[0] || null;
};

export const removeByProjectId = async (
  id: number,
  projectId: number
): Promise<number> => {
  const query = `
    DELETE FROM items
    WHERE id = $1 AND proyecto_id = $2;
  `;
  const result = await pool.query(query, [id, projectId]);
  return result.rowCount ?? 0;
};
