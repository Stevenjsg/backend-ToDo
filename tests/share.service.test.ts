import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/repositories/project.repository', () => ({
  findIdByUuid: vi.fn(),
  getProgress: vi.fn(),
  getShareToken: vi.fn(),
  setShareToken: vi.fn(),
  clearShareToken: vi.fn(),
  findByShareToken: vi.fn(),
  getReportItems: vi.fn(),
}));
vi.mock('../src/repositories/members.repository', () => ({
  findUserRole: vi.fn(),
}));
vi.mock('../src/repositories/events.repository', () => ({
  log: vi.fn().mockResolvedValue(undefined),
  logAnonymous: vi.fn().mockResolvedValue(undefined),
}));

import * as projectRepository from '../src/repositories/project.repository';
import * as membersRepository from '../src/repositories/members.repository';
import * as projectService from '../src/services/project.service';

const findIdByUuid = vi.mocked(projectRepository.findIdByUuid);
const getShareToken = vi.mocked(projectRepository.getShareToken);
const setShareToken = vi.mocked(projectRepository.setShareToken);
const clearShareToken = vi.mocked(projectRepository.clearShareToken);
const findByShareToken = vi.mocked(projectRepository.findByShareToken);
const getReportItems = vi.mocked(projectRepository.getReportItems);
const getProgress = vi.mocked(projectRepository.getProgress);
const findUserRole = vi.mocked(membersRepository.findUserRole);

beforeEach(() => {
  vi.clearAllMocks();
});

// --- Gestión del link (ROADMAP F4): permisos ---

describe('project.service.createShareLink', () => {
  it('falla si el grupo no existe', async () => {
    findIdByUuid.mockResolvedValue(null);
    await expect(projectService.createShareLink('uuid-x', 7)).rejects.toThrow(
      'PROJECT_NOT_FOUND_OR_FORBIDDEN',
    );
  });

  it('falla si el usuario no es miembro', async () => {
    findIdByUuid.mockResolvedValue(42);
    findUserRole.mockResolvedValue(null);
    await expect(projectService.createShareLink('uuid-x', 7)).rejects.toThrow(
      'PROJECT_NOT_FOUND_OR_FORBIDDEN',
    );
    expect(setShareToken).not.toHaveBeenCalled();
  });

  it('viewer NO puede crear el link', async () => {
    findIdByUuid.mockResolvedValue(42);
    findUserRole.mockResolvedValue('viewer');
    await expect(projectService.createShareLink('uuid-x', 7)).rejects.toThrow(
      'PERMISSION_DENIED',
    );
    expect(setShareToken).not.toHaveBeenCalled();
  });

  it('owner crea un token nuevo si no había', async () => {
    findIdByUuid.mockResolvedValue(42);
    findUserRole.mockResolvedValue('owner');
    getShareToken
      .mockResolvedValueOnce({ token: null, creado: null })
      .mockResolvedValueOnce({ token: 'tok_generado', creado: '2026-06-11' });

    const result = await projectService.createShareLink('uuid-x', 7);

    expect(setShareToken).toHaveBeenCalledWith(42, expect.stringMatching(/^[A-Za-z0-9_-]{20,64}$/));
    expect(result.token).toBe('tok_generado');
  });

  it('es idempotente: si ya hay link, lo devuelve sin regenerar', async () => {
    findIdByUuid.mockResolvedValue(42);
    findUserRole.mockResolvedValue('editor');
    getShareToken.mockResolvedValue({ token: 'tok_existente', creado: '2026-06-10' });

    const result = await projectService.createShareLink('uuid-x', 7);

    expect(result.token).toBe('tok_existente');
    expect(setShareToken).not.toHaveBeenCalled();
  });
});

describe('project.service.revokeShareLink', () => {
  it('viewer NO puede revocar', async () => {
    findIdByUuid.mockResolvedValue(42);
    findUserRole.mockResolvedValue('viewer');
    await expect(projectService.revokeShareLink('uuid-x', 7)).rejects.toThrow(
      'PERMISSION_DENIED',
    );
    expect(clearShareToken).not.toHaveBeenCalled();
  });

  it('owner revoca el link', async () => {
    findIdByUuid.mockResolvedValue(42);
    findUserRole.mockResolvedValue('owner');
    await projectService.revokeShareLink('uuid-x', 7);
    expect(clearShareToken).toHaveBeenCalledWith(42);
  });
});

describe('project.service.getShareLink', () => {
  it('cualquier miembro (incluso viewer) puede ver el link', async () => {
    findIdByUuid.mockResolvedValue(42);
    findUserRole.mockResolvedValue('viewer');
    getShareToken.mockResolvedValue({ token: 'tok', creado: '2026-06-10' });
    await expect(projectService.getShareLink('uuid-x', 7)).resolves.toEqual({
      token: 'tok',
      creado: '2026-06-10',
    });
  });

  it('no-miembro no ve nada', async () => {
    findIdByUuid.mockResolvedValue(42);
    findUserRole.mockResolvedValue(null);
    await expect(projectService.getShareLink('uuid-x', 7)).rejects.toThrow(
      'PROJECT_NOT_FOUND_OR_FORBIDDEN',
    );
  });
});

// --- Reporte público (sin auth) ---

describe('project.service.getPublicReport', () => {
  it('token inválido o revocado → REPORT_NOT_FOUND', async () => {
    findByShareToken.mockResolvedValue(null);
    await expect(projectService.getPublicReport('tok-malo')).rejects.toThrow(
      'REPORT_NOT_FOUND',
    );
    expect(getProgress).not.toHaveBeenCalled();
  });

  it('arma el reporte: temas con bloques, miembros sin email cuando hay nombre', async () => {
    findByShareToken.mockResolvedValue({
      id: 42,
      nombre: 'Grupo 3 — Historia',
      descripcion: null,
      share_token_creado: '2026-06-10T10:00:00Z',
    });
    getProgress.mockResolvedValue([
      {
        usuario_id: 1,
        usuario_uuid: 'u1',
        nombre_completo: 'Ana López',
        email: 'ana@uni.es',
        total_asignadas: 3,
        completadas: 2,
        pomodoros: 5,
        minutos_trabajo: 125,
      },
      {
        usuario_id: 2,
        usuario_uuid: 'u2',
        nombre_completo: null,
        email: 'beto@uni.es',
        total_asignadas: 2,
        completadas: 0,
        pomodoros: 0,
        minutos_trabajo: 0,
      },
    ]);
    getReportItems.mockResolvedValue([
      {
        id: 10,
        parent_id: null,
        titulo: 'La Guerra Civil',
        completada: false,
        pomodoros_estimados: null,
        fecha_vencimiento: '2026-06-20',
        asignado: null,
        pomodoros_reales: 0,
      },
      {
        id: 11,
        parent_id: 10,
        titulo: 'Contexto previo',
        completada: true,
        pomodoros_estimados: 2,
        fecha_vencimiento: null,
        asignado: 'Ana López',
        pomodoros_reales: 3,
      },
      {
        id: 12,
        parent_id: 10,
        titulo: 'Bandos y desarrollo',
        completada: false,
        pomodoros_estimados: 4,
        fecha_vencimiento: null,
        asignado: null,
        pomodoros_reales: 0,
      },
    ]);

    const report = await projectService.getPublicReport('tok-bueno');

    expect(report.grupo).toBe('Grupo 3 — Historia');
    // Miembro con nombre: NO viaja el email (minimización, SDD §18.7)
    expect(report.miembros[0].nombre).toBe('Ana López');
    expect(JSON.stringify(report.miembros[0])).not.toContain('ana@uni.es');
    // Sin nombre: cae al email (única forma de identificarlo)
    expect(report.miembros[1].nombre).toBe('beto@uni.es');
    // Árbol tema → bloques, sin ids internos
    expect(report.temas).toHaveLength(1);
    expect(report.temas[0].bloques).toHaveLength(2);
    expect(report.temas[0].bloques[0]).toEqual({
      titulo: 'Contexto previo',
      completada: true,
      asignado: 'Ana López',
      pomodoros_estimados: 2,
      pomodoros_reales: 3,
    });
    expect(JSON.stringify(report)).not.toContain('"id"');
    // Datos crudos: el reporte no contiene campos de evaluación
    expect(JSON.stringify(report)).not.toMatch(/score|ranking|nota/i);
  });

  it('grupo sin temas → reporte vacío pero válido', async () => {
    findByShareToken.mockResolvedValue({
      id: 42,
      nombre: 'Grupo vacío',
      descripcion: null,
      share_token_creado: null,
    });
    getProgress.mockResolvedValue([]);
    getReportItems.mockResolvedValue([]);

    const report = await projectService.getPublicReport('tok-bueno');
    expect(report.temas).toEqual([]);
    expect(report.miembros).toEqual([]);
  });
});
