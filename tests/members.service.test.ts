import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/repositories/members.repository', () => ({
  findUserRole: vi.fn(),
  findByProjectId: vi.fn(),
  findByIds: vi.fn(),
  add: vi.fn(),
  updateRole: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('../src/repositories/user.repository', () => ({
  findByEmail: vi.fn(),
}));
vi.mock('../src/repositories/project.repository', () => ({
  findIdByUuid: vi.fn(),
}));

import * as membersRepository from '../src/repositories/members.repository';
import * as membersService from '../src/services/members.service';

const findUserRole = vi.mocked(membersRepository.findUserRole);

describe('checkRolPermission (autorización central de grupos)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lanza PERMISSION_DENIED si el usuario no es miembro', async () => {
    findUserRole.mockResolvedValue(null);
    await expect(
      membersService.checkRolPermission(1, 10, ['owner', 'editor']),
    ).rejects.toThrow('PERMISSION_DENIED');
  });

  it('lanza PERMISSION_DENIED si el rol no está permitido (viewer no edita)', async () => {
    findUserRole.mockResolvedValue('viewer');
    await expect(
      membersService.checkRolPermission(1, 10, ['owner', 'editor']),
    ).rejects.toThrow('PERMISSION_DENIED');
  });

  it('pasa si el rol está permitido', async () => {
    findUserRole.mockResolvedValue('editor');
    await expect(
      membersService.checkRolPermission(1, 10, ['owner', 'editor']),
    ).resolves.toBeUndefined();
  });

  it('viewer sí puede en operaciones de lectura', async () => {
    findUserRole.mockResolvedValue('viewer');
    await expect(
      membersService.checkRolPermission(1, 10, ['owner', 'editor', 'viewer']),
    ).resolves.toBeUndefined();
  });
});
