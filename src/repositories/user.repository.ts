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
// ... tus funciones create y findByEmail ...

/**
 * Busca un usuario por su ID.
 * @param id El ID del usuario.
 * @returns El usuario sin la contraseña, o null si no se encuentra.
 */
export const findById = async (id: number) => {
  const query = 'SELECT id, email, nombre_completo, avatar_url, bio, fecha_creacion FROM usuarios WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

/**
 * Actualiza los datos del perfil de un usuario.
 * @param id El ID del usuario a actualizar.
 * @param data Un objeto con los campos a actualizar (nombre_completo, bio).
 * @returns El usuario actualizado sin la contraseña.
 */
export const update = async (id: number, data: { nombre_completo?: string; bio?: string }) => {
  const { nombre_completo, bio } = data;
  // Construimos la consulta dinámicamente (simplificado, se puede mejorar)
  const query = `
    UPDATE usuarios
    SET nombre_completo = $1, bio = $2
    WHERE id = $3
    RETURNING id, email, nombre_completo, avatar_url, bio, fecha_creacion;
  `;
  const result = await pool.query(query, [nombre_completo, bio, id]);
  return result.rows[0];
};