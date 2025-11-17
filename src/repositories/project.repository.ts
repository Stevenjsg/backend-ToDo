import { pool } from '../config/database';

// Basic structure for Project (define fully in dataTypes.ts later)
interface Project {
  id: number;
  owner_id: number;
  nombre: string;
  descripcion: string | null;
  // ... dates
}

export const create = async (name: string, ownerId: number, description?: string | null): Promise<Project> => {
  const query = `
    INSERT INTO proyectos (nombre, owner_id, descripcion)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const result = await pool.query(query, [name, ownerId, description]);
  
  // Also add the owner as a member with 'owner' role
  const projectId = result.rows[0].id;
  await pool.query(
      `INSERT INTO miembros_proyecto (usuario_id, proyecto_id, rol) VALUES ($1, $2, 'owner')`,
      [ownerId, projectId]
  );

  return result.rows[0];
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
export const findByUuidAndUserId = async (uuid: string, userId: number): Promise<Project | null> => {
    const query = `
      SELECT p.* FROM proyectos p
      JOIN miembros_proyecto mp ON p.id = mp.proyecto_id
      WHERE p.uuid = $1 AND mp.usuario_id = $2; 
    `; // 1. Busca por p.uuid
    const result = await pool.query(query, [uuid, userId]); // 2. Pasa el uuid
    return result.rows[0] || null;
};

// Update a project (only allow owner to update for now)
export const update = async (uuid: string, name: string, description: string | null, ownerId: number): Promise<Project | null> => {
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
export const remove = async (uuid: string, ownerId: number): Promise<number> => {
    // ON DELETE CASCADE in the DB handles deleting members and items
    const query = `DELETE FROM proyectos WHERE uuid = $1 AND owner_id = $2`; // 1. Borra usando uuid
    const result = await pool.query(query, [uuid, ownerId]); // 2. Pasa uuid
    return result.rowCount ?? 0;
};