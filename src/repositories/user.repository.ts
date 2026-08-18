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
  const query = 'SELECT id, uuid, email, nombre_completo, avatar_url, bio, fecha_creacion FROM usuarios WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

/**
 * Resuelve el ID numérico interno de un usuario a partir de su UUID público.
 * @param uuid El UUID del usuario.
 * @returns El ID numérico, o null si no existe.
 */
export const findIdByUuid = async (uuid: string): Promise<number | null> => {
  const result = await pool.query('SELECT id FROM usuarios WHERE uuid = $1', [uuid]);
  return result.rows[0]?.id || null;
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
    RETURNING id, uuid, email, nombre_completo, avatar_url, bio, fecha_creacion;
  `;
  const result = await pool.query(query, [nombre_completo, bio, id]);
  return result.rows[0];
};
// --- Resumen del perfil (Design System v3: el perfil cuenta algo) ---------

/**
 * Totales de trabajo del usuario: pomodoros de trabajo, minutos cronometrados
 * y bloques completados (asignados a él en grupos, o personales suyos).
 */
export const getWorkTotals = async (userId: number) => {
  const query = `
    SELECT
      (SELECT COUNT(*)::int
         FROM pomodoro_sesiones
        WHERE usuario_id = $1 AND tipo_sesion = 'trabajo') AS pomodoros,
      (SELECT COALESCE(SUM(duracion_minutos), 0)::int
         FROM pomodoro_sesiones
        WHERE usuario_id = $1 AND tipo_sesion = 'trabajo') AS minutos,
      (SELECT COUNT(*)::int
         FROM items
        WHERE tipo = 'task' AND completada
          AND (assignee_id = $1 OR (proyecto_id IS NULL AND usuario_id = $1))
      ) AS bloques_hechos;
  `;
  const result = await pool.query(query, [userId]);
  return result.rows[0];
};

/**
 * Días (fecha, sin hora) con al menos una sesión de trabajo en los últimos
 * 90 días. Sirve para calcular la racha en el servicio.
 */
export const getFocusDays = async (userId: number): Promise<string[]> => {
  const query = `
    SELECT DISTINCT to_char(fecha_inicio::date, 'YYYY-MM-DD') AS dia
    FROM pomodoro_sesiones
    WHERE usuario_id = $1
      AND tipo_sesion = 'trabajo'
      AND fecha_inicio >= NOW() - INTERVAL '90 days'
    ORDER BY dia;
  `;
  const result = await pool.query(query, [userId]);
  return result.rows.map((r) => r.dia);
};

/**
 * Pomodoros de trabajo por día de los últimos 14 días (solo días con datos;
 * el servicio rellena los huecos a cero).
 */
export const getDailyPomodoros = async (userId: number) => {
  const query = `
    SELECT to_char(fecha_inicio::date, 'YYYY-MM-DD') AS dia, COUNT(*)::int AS pomodoros
    FROM pomodoro_sesiones
    WHERE usuario_id = $1
      AND tipo_sesion = 'trabajo'
      AND fecha_inicio >= (CURRENT_DATE - INTERVAL '13 days')
    GROUP BY dia
    ORDER BY dia;
  `;
  const result = await pool.query(query, [userId]);
  return result.rows as { dia: string; pomodoros: number }[];
};

/**
 * Grupos del usuario con su rol y el avance en bloques (sub-tareas).
 */
export const getGroupsSummary = async (userId: number) => {
  const query = `
    SELECT
      p.uuid,
      p.nombre,
      mp.rol,
      COALESCE(b.total, 0)::int  AS bloques_total,
      COALESCE(b.hechos, 0)::int AS bloques_hechos
    FROM miembros_proyecto mp
    JOIN proyectos p ON p.id = mp.proyecto_id
    LEFT JOIN (
      SELECT proyecto_id,
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE completada) AS hechos
      FROM items
      WHERE tipo = 'task' AND parent_id IS NOT NULL
      GROUP BY proyecto_id
    ) b ON b.proyecto_id = p.id
    WHERE mp.usuario_id = $1
    ORDER BY p.fecha_creacion DESC;
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
};
