import { pool } from '../config/database';
import { ProjectRole } from '../data/dataTypes'; // Import the role type

// Simplified member info structure
interface ProjectMember {
  usuario_id: number;
  proyecto_id: number;
  rol: ProjectRole;
  email: string; // We'll join with 'usuarios' to get email
  nombre_completo: string | null;
}

// Add a member to a project
export const add = async (userId: number, projectId: number, role: ProjectRole): Promise<ProjectMember | null> => {
  try {
    const query = `
      INSERT INTO miembros_proyecto (usuario_id, proyecto_id, rol)
      VALUES ($1, $2, $3)
      RETURNING usuario_id, proyecto_id, rol;
    `;
    const result = await pool.query(query, [userId, projectId, role]);
    // Optionally fetch full member info after adding
     const memberInfo = await findByIds(userId, projectId);
     return memberInfo;
  } catch (error: any) {
    if (error.code === '23505') { // Handle unique constraint violation (already a member)
        console.warn(`User ${userId} is already a member of project ${projectId}.`);
        return findByIds(userId, projectId); // Return existing membership info
    }
    console.error("Error adding member:", error);
    throw error; // Re-throw other errors
  }
};

// Find all members of a project (joining with users table)
export const findByProjectId = async (projectId: number): Promise<ProjectMember[]> => {
  const query = `
    SELECT mp.usuario_id, mp.proyecto_id, mp.rol, u.email, u.nombre_completo
    FROM miembros_proyecto mp
    JOIN usuarios u ON mp.usuario_id = u.id
    WHERE mp.proyecto_id = $1;
  `;
  const result = await pool.query(query, [projectId]);
  return result.rows;
};

// Find a specific member's details
export const findByIds = async (userId: number, projectId: number): Promise<ProjectMember | null> => {
    const query = `
      SELECT mp.usuario_id, mp.proyecto_id, mp.rol, u.email, u.nombre_completo
      FROM miembros_proyecto mp
      JOIN usuarios u ON mp.usuario_id = u.id
      WHERE mp.usuario_id = $1 AND mp.proyecto_id = $2;
    `;
    const result = await pool.query(query, [userId, projectId]);
    return result.rows[0] || null;
};

// Update a member's role
export const updateRole = async (userId: number, projectId: number, role: ProjectRole): Promise<ProjectMember | null> => {
  const query = `
    UPDATE miembros_proyecto
    SET rol = $1
    WHERE usuario_id = $2 AND proyecto_id = $3
    RETURNING usuario_id, proyecto_id, rol;
  `;
  const result = await pool.query(query, [role, userId, projectId]);
    if (result.rowCount === 0) return null; // Member not found
    // Optionally fetch full member info after updating
    const memberInfo = await findByIds(userId, projectId);
    return memberInfo;
};

// Remove a member from a project
export const remove = async (userId: number, projectId: number): Promise<number> => {
  // Prevent owner from being removed (could be handled in service too)
  const member = await findByIds(userId, projectId);
  if (member?.rol === 'owner') {
      throw new Error("Cannot remove the project owner.");
  }
  
  const query = `
    DELETE FROM miembros_proyecto
    WHERE usuario_id = $1 AND proyecto_id = $2;
  `;
  const result = await pool.query(query, [userId, projectId]);
  return result.rowCount ?? 0;
};

// Helper to check a user's role in a project (used for permissions)
export const findUserRole = async (userId: number, projectId: number): Promise<ProjectRole | null> => {
    const query = `SELECT rol FROM miembros_proyecto WHERE usuario_id = $1 AND proyecto_id = $2;`;
    const result = await pool.query(query, [userId, projectId]);
    return result.rows[0]?.rol || null;
};