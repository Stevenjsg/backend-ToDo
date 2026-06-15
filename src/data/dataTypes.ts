// Define ENUM types mirroring the database
export type ItemType = "task" | "note" | "reminder";
export type ItemPriority = "baja" | "media" | "alta";
export type ProjectRole = "owner" | "editor" | "viewer";
// Add Subscription types later if needed

// Interface for Items (Tasks, Notes, Reminders)
export interface Item {
  id: number;
  uuid: string; // Public identifier used in routes
  usuario_id: number;
  proyecto_id: number | null;
  tipo: ItemType;
  titulo: string; // New field
  descripcion: string | null;
  completada: boolean;
  fecha_creacion: string; // Dates will come as strings from DB/JSON
  fecha_actualizacion: string;
  fecha_vencimiento: string | null;
  prioridad: ItemPriority | null;
  etiquetas: string[];
  regla_recurrencia: string | null;
  parent_id: number | null; // sub-tarea: id interno del item padre (bloque de un tema)
  assignee_id: number | null; // reparto por persona: id interno del usuario asignado
  pomodoros_estimados: number | null; // estimación en pomodoros del bloque
  tipo_entregable: string | null; // ensayo | investigacion | exposicion | ... (F3)
  tamano_entregable: string | null; // "10 páginas", "15 min"... (F3)
  steps_completed?: boolean[]; // estado de los pasos del bloque, alineado por índice (F4)
}

export const TIPOS_ENTREGABLE = [
  "ensayo",
  "investigacion",
  "exposicion",
  "desarrollo",
  "informe",
  "maqueta",
  "ejercicios",
  "otro",
] as const;

// Bloque propuesto por la IA al dividir un tema (aún sin persistir)
export interface AiBlock {
  titulo: string;
  descripcion: string;
  pomodoros_estimados: number;
  // Guía de ejecución: lista ordenada de pasos concretos para hacer el bloque
  pasos: string[];
}

// Fila de progreso del grupo por miembro
export interface MemberProgress {
  usuario_id: number;
  usuario_uuid: string;
  nombre_completo: string | null;
  email: string;
  total_asignadas: number;
  completadas: number;
  pomodoros: number;
  minutos_trabajo: number;
}

// --- Reporte compartible (ROADMAP F4 / SDD §18.1) ---

// Fila cruda de items para el reporte (interna, con ids para armar el árbol)
export interface ReportItemRow {
  id: number;
  parent_id: number | null;
  titulo: string;
  completada: boolean;
  pomodoros_estimados: number | null;
  fecha_vencimiento: string | null;
  asignado: string | null; // nombre ya resuelto; sin id ni email separados
  pomodoros_reales: number;
}

// Bloque tal como sale en el reporte público (sin ids internos)
export interface ReportBlock {
  titulo: string;
  completada: boolean;
  asignado: string | null;
  pomodoros_estimados: number | null;
  pomodoros_reales: number;
}

export interface ReportTema extends ReportBlock {
  fecha_vencimiento: string | null;
  bloques: ReportBlock[];
}

// Respuesta de GET /api/report/:token — datos crudos, sin scoring ni juicio
// IA (SDD §18.7). Minimización: nombres resueltos, sin emails ni uuids.
export interface PublicReport {
  grupo: string;
  descripcion: string | null;
  generado_en: string;
  compartido_desde: string | null;
  miembros: {
    nombre: string;
    total_asignadas: number;
    completadas: number;
    pomodoros: number;
    minutos_trabajo: number;
  }[];
  temas: ReportTema[];
}

// Interface for User Profile (add new fields)
export interface UserProfile {
  id: number;
  uuid: string; // Public identifier used in routes
  email: string;
  nombre_completo: string | null;
  avatar_url: string | null;
  bio: string | null;
  fecha_creacion: string;
  // Add subscription details later
}

// Interface for JWT Payload (remains the same)
export interface UserPayload {
  id: number;
  email: string;
}

// Add Project and ProjectMember interfaces later when building collaboration
// ... other types ...
export type tipo_sesion_pomodoro_enum =
  | "trabajo"
  | "descanso_corto"
  | "descanso_largo";

export interface PomodoroSession {
  id: number;
  usuario_id: number;
  item_id: number | null;
  fecha_inicio: string;
  duracion_minutos: number;
  tipo_sesion: tipo_sesion_pomodoro_enum;
}
