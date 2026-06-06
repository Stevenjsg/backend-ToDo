import { pool } from "../config/database";
import { ProjectRole } from "../data/dataTypes";

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
