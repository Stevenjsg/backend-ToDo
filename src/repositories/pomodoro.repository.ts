import { pool } from '../config/database';
import { tipo_sesion_pomodoro_enum } from '../data/dataTypes'; // You'll need to define this type

export const logSession = async (
  userId: number,
  durationMinutes: number,
  sessionType: tipo_sesion_pomodoro_enum,
  itemId?: number | null
) => {
  const query = `
    INSERT INTO pomodoro_sesiones (usuario_id, duracion_minutos, tipo_sesion, item_id)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const result = await pool.query(query, [userId, durationMinutes, sessionType, itemId]);
  return result.rows[0];
};