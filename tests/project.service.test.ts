import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/repositories/project.repository', () => ({
  findIdByUuid: vi.fn(),
  getProgress: vi.fn(),
  findByUuidAndUserId: vi.fn(),
  findByUserId: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  findUserRole: vi.fn(),
}));
vi.mock('../src/repositories/members.repository', () => ({
  findUserRole: vi.fn(),
}));

import * as projectRepository from '../src/repositories/project.repository';
import * as membersRepository from '../src/repositories/members.repository';
import * as projectService from '../src/services/project.service';

const findIdByUuid = vi.mocked(projectRepository.findIdByUuid);
const getProgress = vi.mocked(projectRepository.getProgress);
const findUserRole = vi.mocked(membersRepository.findUserRole);

describe('project.service.getProjectProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('falla si el grupo no existe', async () => {
    findIdByUuid.mockResolvedValue(null);
    await expect(projectService.getProjectProgress('uuid-x', 7)).rejects.toThrow(
      'PROJECT_NOT_FOUND_OR_FORBIDDEN',
    );
  });

  it('falla si el usuario no es miembro', async () => {
    findIdByUuid.mockResolvedValue(42);
    findUserRole.mockResolvedValue(null);
    await expect(projectService.getProjectProgress('uuid-x', 7)).rejects.toThrow(
      'PROJECT_NOT_FOUND_OR_FORBIDDEN',
    );
    expect(getProgress).not.toHaveBeenCalled();
  });

  it('cualquier miembro (incluso viewer) puede ver el progreso', async () => {
    findIdByUuid.mockResolvedValue(42);
    findUserRole.mockResolvedValue('viewer');
    const rows = [
      {
        usuario_id: 7,
        usuario_uuid: 'u',
        nombre_completo: 'Ana',
        email: 'a@a.com',
        total_asignadas: 4,
        completadas: 2,
        pomodoros: 6,
        minutos_trabajo: 150,
      },
    ];
    getProgress.mockResolvedValue(rows);

    await expect(projectService.getProjectProgress('uuid-x', 7)).resolves.toEqual(rows);
    expect(getProgress).toHaveBeenCalledWith(42);
  });
});
