import { pool } from "../config/database";
import { MemberProgress, ProjectRole, ReportItemRow } from "../data/dataTypes";

// Basic structure for Project (define fully in dataTypes.ts later)
interface Project {
  id: number;
  owner_id: number;
  nombre: string;
  descripcion: string | null;
}

// En src/repositories/project.repository.ts

export const create = async (
  name: string,
  ownerId: number,
  description?: string | null
): Promise<Project> => {
  const client = await pool.connect(); // Usamos un cliente para transacción

  try {
    await client.query("BEGIN"); // Iniciar transacción

    // 1. Crear el Proyecto
    const queryProject = `
      INSERT INTO proyectos (nombre, owner_id, descripcion)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const resProject = await client.query(queryProject, [
      name,
      ownerId,
      description,
    ]);
    const project = resProject.rows[0];

    // 2. 👇 ESTO ES LO QUE TE FALTA 👇
    // Añadir al creador a la tabla de miembros con rol 'owner'
    const queryMember = `
      INSERT INTO miembros_proyecto (usuario_id, proyecto_id, rol)
      VALUES ($1, $2, 'owner');
    `;
    await client.query(queryMember, [ownerId, project.id]);

    await client.query("COMMIT"); // Confirmar cambios
    return project;
  } catch (e) {
    await client.query("ROLLBACK"); // Deshacer si falla
    throw e;
  } finally {
    client.release();
  }
};

export const findById = async (id: number): Promise<Project | null> => {
  const query = `SELECT * FROM proyectos WHERE id = $1`;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

// Find project ID by UUID
export const findIdByUuid = async (uuid: string): Promise<number | null> => {
  const query = "SELECT id FROM proyectos WHERE uuid = $1";
  const result = await pool.query(query, [uuid]);
  return result.rows[0]?.id || null;
};

// Find projects where a user is a member
export const findByUserId = async (userId: number): Promise<Project[]> => {
  const query = `
    SELECT p.* FROM proyectos p
    JOIN miembros_proyecto mp ON p.id = mp.proyecto_id
    WHERE mp.usuario_id = $1
    ORDER BY p.fecha_actualizacion DESC;
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
};

// Find a specific project by ID (and check ownership/membership)
export const findByUuidAndUserId = async (
  uuid: string,
  userId: number
): Promise<Project | null> => {
  const query = `
      SELECT p.* FROM proyectos p
      JOIN miembros_proyecto mp ON p.id = mp.proyecto_id
      WHERE p.uuid = $1 AND mp.usuario_id = $2; 
    `; // 1. Busca por p.uuid
  const result = await pool.query(query, [uuid, userId]); // 2. Pasa el uuid
  return result.rows[0] || null;
};
export const findUserRole = async (
  userId: number,
  projectId: number
): Promise<ProjectRole | null> => {
  const query = `SELECT rol FROM miembros_proyecto WHERE usuario_id = $1 AND proyecto_id = $2;`;
  const result = await pool.query(query, [userId, projectId]);
  return result.rows[0]?.rol || null;
};
// Update a project (only allow owner to update for now)
export const update = async (
  uuid: string,
  name: string,
  description: string | null,
  ownerId: number
): Promise<Project | null> => {
  const query = `
        UPDATE proyectos
        SET nombre = $1, descripcion = $2, fecha_actualizacion = NOW()
        WHERE uuid = $3 AND owner_id = $4 -- 1. Actualiza usando uuid
        RETURNING *;
    `;
  const result = await pool.query(query, [name, description, uuid, ownerId]); // 2. Pasa uuid
  return result.rows[0] || null;
};

/**
 * Progreso del grupo por miembro: tareas asignadas (totales/completadas) y
 * pomodoros de trabajo registrados sobre items del proyecto.
 */
export const getProgress = async (
  projectId: number
): Promise<MemberProgress[]> => {
  const query = `
    SELECT
      u.id   AS usuario_id,
      u.uuid AS usuario_uuid,
      u.nombre_completo,
      u.email,
      COALESCE(t.total_asignadas, 0)::int AS total_asignadas,
      COALESCE(t.completadas, 0)::int     AS completadas,
      COALESCE(ps.pomodoros, 0)::int      AS pomodoros,
      COALESCE(ps.minutos_trabajo, 0)::int AS minutos_trabajo
    FROM miembros_proyecto mp
    JOIN usuarios u ON u.id = mp.usuario_id
    LEFT JOIN (
      SELECT assignee_id,
             COUNT(*) AS total_asignadas,
             COUNT(*) FILTER (WHERE completada) AS completadas
      FROM items
      WHERE proyecto_id = $1 AND tipo = 'task' AND assignee_id IS NOT NULL
      GROUP BY assignee_id
    ) t ON t.assignee_id = u.id
    LEFT JOIN (
      SELECT s.usuario_id,
             COUNT(*) AS pomodoros,
             SUM(s.duracion_minutos) AS minutos_trabajo
      FROM pomodoro_sesiones s
      JOIN items i ON i.id = s.item_id
      WHERE i.proyecto_id = $1 AND s.tipo_sesion = 'trabajo'
      GROUP BY s.usuario_id
    ) ps ON ps.usuario_id = u.id
    WHERE mp.proyecto_id = $1
    ORDER BY u.nombre_completo NULLS LAST, u.email;
  `;
  const result = await pool.query(query, [projectId]);
  return result.rows;
};

// --- Reporte compartible (ROADMAP F4 / SDD §18.1) ---

export const getShareToken = async (
  projectId: number
): Promise<{ token: string | null; creado: string | null }> => {
  const result = await pool.query(
    `SELECT share_token, share_token_creado FROM proyectos WHERE id = $1`,
    [projectId]
  );
  return {
    token: result.rows[0]?.share_token ?? null,
    creado: result.rows[0]?.share_token_creado ?? null,
  };
};

export const setShareToken = async (
  projectId: number,
  token: string
): Promise<void> => {
  await pool.query(
    `UPDATE proyectos SET share_token = $1, share_token_creado = NOW() WHERE id = $2`,
    [token, projectId]
  );
};

export const clearShareToken = async (projectId: number): Promise<void> => {
  await pool.query(
    `UPDATE proyectos SET share_token = NULL, share_token_creado = NULL WHERE id = $1`,
    [projectId]
  );
};

export const findByShareToken = async (
  token: string
): Promise<{
  id: number;
  nombre: string;
  descripcion: string | null;
  share_token_creado: string | null;
} | null> => {
  const result = await pool.query(
    `SELECT id, nombre, descripcion, share_token_creado FROM proyectos WHERE share_token = $1`,
    [token]
  );
  return result.rows[0] || null;
};

/**
 * Items para el reporte público: temas y bloques con el NOMBRE del asignado
 * ya resuelto y pomodoros reales por item. Datos crudos, sin scoring
 * (SDD §18.7); no se exponen emails cuando hay nombre, ni ids de usuario.
 */
export const getReportItems = async (
  projectId: number
): Promise<ReportItemRow[]> => {
  const query = `
    SELECT
      i.id,
      i.parent_id,
      i.titulo,
      i.completada,
      i.pomodoros_estimados,
      i.fecha_vencimiento,
      COALESCE(u.nombre_completo, u.email) AS asignado,
      COALESCE(ps.pomodoros, 0)::int AS pomodoros_reales
    FROM items i
    LEFT JOIN usuarios u ON u.id = i.assignee_id
    LEFT JOIN (
      SELECT item_id, COUNT(*) AS pomodoros
      FROM pomodoro_sesiones
      WHERE tipo_sesion = 'trabajo'
      GROUP BY item_id
    ) ps ON ps.item_id = i.id
    WHERE i.proyecto_id = $1 AND i.tipo = 'task'
    ORDER BY i.parent_id NULLS FIRST, i.id;
  `;
  const result = await pool.query(query, [projectId]);
  return result.rows;
};

// Delete a project (only allow owner to delete)
export const remove = async (
  uuid: string,
  ownerId: number
): Promise<number> => {
  // ON DELETE CASCADE in the DB handles deleting members and items
  const query = `DELETE FROM proyectos WHERE uuid = $1 AND owner_id = $2`; // 1. Borra usando uuid
  const result = await pool.query(query, [uuid, ownerId]); // 2. Pasa uuid
  return result.rowCount ?? 0;
};
