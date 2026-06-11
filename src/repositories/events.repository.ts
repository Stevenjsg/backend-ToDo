import { pool } from "../config/database";

/** Inserta un evento de producto (instrumentación, ROADMAP F1). */
export const log = async (
  userId: number,
  tipo: string,
  payload: Record<string, unknown>
): Promise<void> => {
  await pool.query(
    `INSERT INTO eventos (usuario_id, tipo, payload) VALUES ($1, $2, $3);`,
    [userId, tipo, JSON.stringify(payload)]
  );
};

/** Evento sin usuario (p. ej. apertura del reporte público, F4/F5). */
export const logAnonymous = async (
  tipo: string,
  payload: Record<string, unknown>
): Promise<void> => {
  await pool.query(
    `INSERT INTO eventos (usuario_id, tipo, payload) VALUES (NULL, $1, $2);`,
    [tipo, JSON.stringify(payload)]
  );
};
