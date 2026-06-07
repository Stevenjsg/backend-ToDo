import { pool } from "../config/database";
import { Item } from "../data/dataTypes";

/**
 * Recordatorios próximos del usuario: items de tipo 'reminder', sin completar,
 * con fecha de vencimiento futura (>= ahora), ordenados por la más cercana.
 */
export const findUpcoming = async (userId: number): Promise<Item[]> => {
  const query = `
    SELECT * FROM items
    WHERE usuario_id = $1
      AND tipo = 'reminder'
      AND completada = FALSE
      AND fecha_vencimiento IS NOT NULL
      AND fecha_vencimiento >= NOW()
    ORDER BY fecha_vencimiento ASC;
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
};

/**
 * Recordatorios vencidos del usuario: items de tipo 'reminder', sin completar,
 * cuya fecha de vencimiento ya pasó (<= ahora). El frontend los usa para avisar.
 */
export const findDue = async (userId: number): Promise<Item[]> => {
  const query = `
    SELECT * FROM items
    WHERE usuario_id = $1
      AND tipo = 'reminder'
      AND completada = FALSE
      AND fecha_vencimiento IS NOT NULL
      AND fecha_vencimiento <= NOW()
    ORDER BY fecha_vencimiento ASC;
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
};
