import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Item } from '../src/data/dataTypes';

const clientQuery = vi.fn();
const clientRelease = vi.fn();
const fakeClient = { query: clientQuery, release: clientRelease };

vi.mock('../src/config/database', () => ({
  pool: {
    connect: vi.fn(async () => fakeClient),
    query: vi.fn(),
  },
}));

import * as itemsRepository from '../src/repositories/items.repository';

const parent = {
  id: 1,
  proyecto_id: 42,
} as Item;

const bloques = [
  { titulo: 'B1', descripcion: 'd1', pomodoros_estimados: 2, assignee_id: 5 },
  { titulo: 'B2', descripcion: null, pomodoros_estimados: null, assignee_id: null },
];

describe('items.repository.createSubtasks (transacción)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hace BEGIN → N inserts → COMMIT y devuelve los items en orden', async () => {
    clientQuery.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.startsWith('INSERT')) {
        return { rows: [{ id: 100, titulo: params?.[1] }] };
      }
      return { rows: [] };
    });

    const created = await itemsRepository.createSubtasks(parent, bloques, 7);

    const calls = clientQuery.mock.calls.map((c) => String(c[0]).trim().split(' ')[0]);
    expect(calls[0]).toBe('BEGIN');
    expect(calls.filter((c) => c === 'INSERT')).toHaveLength(2);
    expect(calls[calls.length - 1]).toBe('COMMIT');
    expect(created.map((i) => i.titulo)).toEqual(['B1', 'B2']);
    expect(clientRelease).toHaveBeenCalledOnce();

    // El insert hereda proyecto_id y parent_id del padre
    const firstInsertParams = clientQuery.mock.calls.find((c) =>
      String(c[0]).startsWith('INSERT'),
    )?.[1] as unknown[];
    expect(firstInsertParams[3]).toBe(42); // proyecto_id
    expect(firstInsertParams[4]).toBe(1); // parent_id
  });

  it('hace ROLLBACK si un insert falla y no se traga el error', async () => {
    let inserts = 0;
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.startsWith('INSERT')) {
        inserts++;
        if (inserts === 2) throw new Error('db down');
        return { rows: [{ id: 100 }] };
      }
      return { rows: [] };
    });

    await expect(itemsRepository.createSubtasks(parent, bloques, 7)).rejects.toThrow(
      'db down',
    );

    const calls = clientQuery.mock.calls.map((c) => String(c[0]).trim().split(' ')[0]);
    expect(calls).toContain('ROLLBACK');
    expect(calls).not.toContain('COMMIT');
    expect(clientRelease).toHaveBeenCalledOnce(); // release también en error
  });
});
