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
export const findByIdAndUserId = async (projectId: number, userId: number): Promise<Project | null> => {
    const query = `
      SELECT p.* FROM proyectos p
      JOIN miembros_proyecto mp ON p.id = mp.proyecto_id
      WHERE p.id = $1 AND mp.usuario_id = $2;
    `;
    const result = await pool.query(query, [projectId, userId]);
    return result.rows[0] || null;
};

// Update a project (only allow owner to update for now)
export const update = async (id: number, name: string, description: string | null, ownerId: number): Promise<Project | null> => {
    const query = `
        UPDATE proyectos
        SET nombre = $1, descripcion = $2, fecha_actualizacion = NOW()
        WHERE id = $3 AND owner_id = $4
        RETURNING *;
    `;
    const result = await pool.query(query, [name, description, id, ownerId]);
    return result.rows[0] || null;
};

// Delete a project (only allow owner to delete)
export const remove = async (id: number, ownerId: number): Promise<number> => {
    // ON DELETE CASCADE in the DB handles deleting members and items
    const query = `DELETE FROM proyectos WHERE id = $1 AND owner_id = $2`;
    const result = await pool.query(query, [id, ownerId]);
    return result.rowCount ?? 0;
};