import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Item } from '../src/data/dataTypes';

// Evita arrancar el servidor real (src/index.ts) al importar el service
const emitMock = vi.fn();
vi.mock('../src/index', () => ({
  io: { to: vi.fn(() => ({ emit: emitMock })) },
}));

vi.mock('../src/repositories/items.repository', () => ({
  findByUuidInternal: vi.fn(),
  createSubtasks: vi.fn(),
  findFocusItems: vi.fn(),
  findByUserId: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateByProjectId: vi.fn(),
  remove: vi.fn(),
  removeByProjectId: vi.fn(),
  findById: vi.fn(),
}));

vi.mock('../src/services/members.service', () => ({
  checkRolPermission: vi.fn(),
}));

import * as itemsRepository from '../src/repositories/items.repository';
import * as membersService from '../src/services/members.service';
import * as itemsService from '../src/services/items.service';

const findByUuidInternal = vi.mocked(itemsRepository.findByUuidInternal);
const createSubtasksRepo = vi.mocked(itemsRepository.createSubtasks);
const checkRolPermission = vi.mocked(membersService.checkRolPermission);

const baseItem = (overrides: Partial<Item> = {}): Item => ({
  id: 1,
  uuid: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  usuario_id: 7,
  proyecto_id: 42,
  tipo: 'task',
  titulo: 'Tema del trabajo',
  descripcion: null,
  completada: false,
  fecha_creacion: '',
  fecha_actualizacion: '',
  fecha_vencimiento: null,
  prioridad: 'media',
  etiquetas: [],
  regla_recurrencia: null,
  parent_id: null,
  assignee_id: null,
  pomodoros_estimados: null,
  tipo_entregable: null,
  tamano_entregable: null,
  ...overrides,
});

const bloques = [{ titulo: 'Bloque 1', descripcion: 'd', pomodoros_estimados: 2 }];

describe('items.service.createSubtasks (permisos y reglas)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lanza ITEM_NOT_FOUND_OR_FORBIDDEN si el padre no existe', async () => {
    findByUuidInternal.mockResolvedValue(null);
    await expect(itemsService.createSubtasks('uuid-x', bloques, 7)).rejects.toThrow(
      'ITEM_NOT_FOUND_OR_FORBIDDEN',
    );
  });

  it('rechaza dividir una sub-tarea (PARENT_IS_SUBTASK)', async () => {
    findByUuidInternal.mockResolvedValue(baseItem({ parent_id: 99 }));
    await expect(itemsService.createSubtasks('uuid-x', bloques, 7)).rejects.toThrow(
      'PARENT_IS_SUBTASK',
    );
  });

  it('exige owner/editor en items de grupo', async () => {
    findByUuidInternal.mockResolvedValue(baseItem({ proyecto_id: 42 }));
    checkRolPermission.mockRejectedValue(new Error('PERMISSION_DENIED'));

    await expect(itemsService.createSubtasks('uuid-x', bloques, 7)).rejects.toThrow(
      'PERMISSION_DENIED',
    );
    expect(checkRolPermission).toHaveBeenCalledWith(7, 42, ['owner', 'editor']);
    expect(createSubtasksRepo).not.toHaveBeenCalled();
  });

  it('en items personales solo el dueño puede dividir', async () => {
    findByUuidInternal.mockResolvedValue(baseItem({ proyecto_id: null, usuario_id: 99 }));
    await expect(itemsService.createSubtasks('uuid-x', bloques, 7)).rejects.toThrow(
      'ITEM_NOT_FOUND_OR_FORBIDDEN',
    );
    expect(createSubtasksRepo).not.toHaveBeenCalled();
  });

  it('crea y emite item_created por cada sub-tarea', async () => {
    const parent = baseItem();
    findByUuidInternal.mockResolvedValue(parent);
    checkRolPermission.mockResolvedValue(undefined);
    const created = [
      baseItem({ id: 10, parent_id: 1, titulo: 'Bloque 1' }),
      baseItem({ id: 11, parent_id: 1, titulo: 'Bloque 2' }),
    ];
    createSubtasksRepo.mockResolvedValue(created);

    const result = await itemsService.createSubtasks(parent.uuid, bloques, 7);

    expect(result).toHaveLength(2);
    expect(createSubtasksRepo).toHaveBeenCalledWith(parent, bloques, 7);
    expect(emitMock).toHaveBeenCalledTimes(2);
    expect(emitMock).toHaveBeenCalledWith('item_created', created[0]);
  });
});

describe('items.service.updateItem (permisos)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('un viewer no puede editar items del grupo', async () => {
    findByUuidInternal.mockResolvedValue(baseItem({ proyecto_id: 42 }));
    checkRolPermission.mockRejectedValue(new Error('PERMISSION_DENIED'));

    await expect(
      itemsService.updateItem('uuid-x', { completada: true }, 7),
    ).rejects.toThrow('PERMISSION_DENIED');
  });

  it('nadie edita items personales ajenos', async () => {
    findByUuidInternal.mockResolvedValue(baseItem({ proyecto_id: null, usuario_id: 99 }));
    await expect(
      itemsService.updateItem('uuid-x', { completada: true }, 7),
    ).rejects.toThrow('ITEM_NOT_FOUND_OR_FORBIDDEN');
  });
});

describe('items.service.getItemsByUserId (lectura colaborativa)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exige membresía (cualquier rol) para listar items de un grupo', async () => {
    checkRolPermission.mockRejectedValue(new Error('PERMISSION_DENIED'));
    await expect(itemsService.getItemsByUserId(7, 'task', 42)).rejects.toThrow(
      'PERMISSION_DENIED',
    );
    expect(checkRolPermission).toHaveBeenCalledWith(7, 42, ['owner', 'editor', 'viewer']);
  });
});
