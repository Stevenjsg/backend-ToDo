import { pool } from '../config/database';

/**
 * Inserta un nuevo usuario en la base de datos.
 * @param email El email del usuario.
 * @param passwordHash La contraseña ya encriptada (hasheada).
 * @returns El nuevo usuario creado sin la contraseña.
 */
export const create = async (email: string, passwordHash: string) => {
  const query = `
    INSERT INTO usuarios (email, password_hash)
    VALUES ($1, $2)
    RETURNING id, email, fecha_creacion;
  `;

  // Usamos "consultas parametrizadas" ($1, $2) para evitar inyección SQL.
  const result = await pool.query(query, [email, passwordHash]);

  return result.rows[0];
};

/**
 * Busca un usuario por su dirección de email.
 * @param email El email del usuario a buscar.
 * @returns El usuario si se encuentra, de lo contrario null.
 */
export const findByEmail = async (email: string) => {
  const query = 'SELECT * FROM usuarios WHERE email = $1';
  const result = await pool.query(query, [email]);

  return result.rows[0] || null;
};