import crypto from 'crypto';
import * as projectRepository from '../repositories/project.repository';
import * as membersRepository from '../repositories/members.repository';
import * as eventsRepository from '../repositories/events.repository';
import { PublicReport, ReportBlock, ReportItemRow } from '../data/dataTypes';


export const createProject = (name: string, ownerId: number, description?: string | null) => {
    if (!name) throw new Error('Project name is required.');
    return projectRepository.create(name, ownerId, description);
};

export const getProjectsForUser = (userId: number) => {
    return projectRepository.findByUserId(userId);
};

export const getProjectByUuid = async (uuid: string, userId: number) => {
    // 1. Llama a la nueva función del repositorio
    const project = await projectRepository.findByUuidAndUserId(uuid, userId); 
    if (!project) throw new Error('PROJECT_NOT_FOUND_OR_FORBIDDEN');
    return project;
};

export const updateProject = async (uuid: string, name: string, description: string | null, userId: number) => {
    if (!name) throw new Error('Project name is required.');
    // 1. Llama a update con uuid
    const updatedProject = await projectRepository.update(uuid, name, description, userId); 
    if (!updatedProject) throw new Error('PROJECT_NOT_FOUND_OR_FORBIDDEN');
    return updatedProject;
};

export const deleteProject = async (uuid: string, userId: number) => {
    // 1. Llama a remove con uuid
    const deletedRows = await projectRepository.remove(uuid, userId); 
    if (deletedRows === 0) throw new Error('PROJECT_NOT_FOUND_OR_FORBIDDEN');
    return deletedRows;
};
/**
 * Progreso del grupo por miembro. Cualquier miembro (incluido viewer) puede
 * verlo: el punto del producto es que TODO el grupo vea el avance de todos.
 */
export const getProjectProgress = async (uuid: string, userId: number) => {
    const projectId = await projectRepository.findIdByUuid(uuid);
    if (!projectId) throw new Error('PROJECT_NOT_FOUND_OR_FORBIDDEN');

    const userRole = await membersRepository.findUserRole(userId, projectId);
    if (!userRole) throw new Error('PROJECT_NOT_FOUND_OR_FORBIDDEN');

    return projectRepository.getProgress(projectId);
};

// --- Reporte compartible (ROADMAP F4 / SDD §18.1) ---

/** Resuelve uuid → id y exige membresía. Devuelve { projectId, role }. */
const requireMembership = async (uuid: string, userId: number) => {
    const projectId = await projectRepository.findIdByUuid(uuid);
    if (!projectId) throw new Error('PROJECT_NOT_FOUND_OR_FORBIDDEN');
    const role = await membersRepository.findUserRole(userId, projectId);
    if (!role) throw new Error('PROJECT_NOT_FOUND_OR_FORBIDDEN');
    return { projectId, role };
};

/**
 * Cualquier miembro puede VER el link (todos pueden reenviarlo al profesor);
 * crear y revocar queda para owner/editor.
 */
export const getShareLink = async (uuid: string, userId: number) => {
    const { projectId } = await requireMembership(uuid, userId);
    return projectRepository.getShareToken(projectId);
};

export const createShareLink = async (uuid: string, userId: number) => {
    const { projectId, role } = await requireMembership(uuid, userId);
    if (role !== 'owner' && role !== 'editor') throw new Error('PERMISSION_DENIED');

    // Idempotente: un solo link vivo por grupo; si ya existe, se devuelve.
    const existing = await projectRepository.getShareToken(projectId);
    if (existing.token) return existing;

    // Token opaco aleatorio (no JWT: revocable poniéndolo a NULL, sin expiración
    // implícita y sin payload que decodificar).
    const token = crypto.randomBytes(24).toString('base64url');
    await projectRepository.setShareToken(projectId, token);
    // Métrica norte (SDD §18.6): % de grupos que comparten reporte
    eventsRepository
        .log(userId, 'report_link_created', { proyecto_id: projectId })
        .catch(() => {}); // instrumentación nunca rompe el flujo
    return projectRepository.getShareToken(projectId);
};

export const revokeShareLink = async (uuid: string, userId: number) => {
    const { projectId, role } = await requireMembership(uuid, userId);
    if (role !== 'owner' && role !== 'editor') throw new Error('PERMISSION_DENIED');
    await projectRepository.clearShareToken(projectId);
};

const toReportBlock = (row: ReportItemRow): ReportBlock => ({
    titulo: row.titulo,
    completada: row.completada,
    asignado: row.asignado,
    pomodoros_estimados: row.pomodoros_estimados,
    pomodoros_reales: row.pomodoros_reales,
});

/**
 * Reporte público por token, SIN auth. Regla de cumplimiento (SDD §18.7):
 * datos crudos de actividad (bloques completados, pomodoros); nunca scoring,
 * ranking ni juicio generado por IA. Sin ids internos ni emails sueltos.
 */
export const getPublicReport = async (token: string): Promise<PublicReport> => {
    const project = await projectRepository.findByShareToken(token);
    if (!project) throw new Error('REPORT_NOT_FOUND');

    // Métrica F5: ¿el profesor llega a abrir el reporte? (sin usuario: es público)
    eventsRepository
        .logAnonymous('report_opened', { proyecto_id: project.id })
        .catch(() => {});

    const [progress, items] = await Promise.all([
        projectRepository.getProgress(project.id),
        projectRepository.getReportItems(project.id),
    ]);

    const miembros = progress.map((m) => ({
        nombre: m.nombre_completo || m.email,
        total_asignadas: m.total_asignadas,
        completadas: m.completadas,
        pomodoros: m.pomodoros,
        minutos_trabajo: m.minutos_trabajo,
    }));

    const temas = items
        .filter((i) => !i.parent_id)
        .map((tema) => ({
            ...toReportBlock(tema),
            fecha_vencimiento: tema.fecha_vencimiento,
            bloques: items.filter((b) => b.parent_id === tema.id).map(toReportBlock),
        }));

    return {
        grupo: project.nombre,
        descripcion: project.descripcion,
        generado_en: new Date().toISOString(),
        compartido_desde: project.share_token_creado,
        miembros,
        temas,
    };
};

export const getProjectById = async (projectId: number, userId: number) => {
    // 1. Verificar que el usuario (userId) es miembro del proyecto
    // Esto es importante por seguridad: no devolvemos datos si no pertenece al proyecto.
    const userRole = await membersRepository.findUserRole(userId, projectId);
    
    if (!userRole) {
        throw new Error('PERMISSION_DENIED');
    }

    // 2. Obtener los datos completos del proyecto
    const project = await projectRepository.findById(projectId);

    if (!project) {
        throw new Error('PROJECT_NOT_FOUND');
    }

    return project;
};