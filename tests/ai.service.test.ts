import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseBlocks, splitTopicIntoBlocks } from '../src/services/ai.service';

describe('parseBlocks', () => {
  it('parsea un array JSON limpio', () => {
    const text = JSON.stringify([
      { titulo: 'Introducción', descripcion: 'Escribir intro', pomodoros_estimados: 2 },
      { titulo: 'Conclusiones', descripcion: 'Cerrar', pomodoros_estimados: 1 },
    ]);
    const blocks = parseBlocks(text);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].titulo).toBe('Introducción');
    expect(blocks[0].pomodoros_estimados).toBe(2);
  });

  it('tolera JSON envuelto en texto y fences de markdown', () => {
    const text =
      'Claro, aquí tienes:\n```json\n[{"titulo":"Bloque A","descripcion":"x","pomodoros_estimados":3}]\n```\n¡Suerte!';
    const blocks = parseBlocks(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].titulo).toBe('Bloque A');
  });

  it('normaliza estimaciones fuera de rango a 1', () => {
    const text = JSON.stringify([
      { titulo: 'A', descripcion: '', pomodoros_estimados: 0 },
      { titulo: 'B', descripcion: '', pomodoros_estimados: 99 },
      { titulo: 'C', descripcion: '', pomodoros_estimados: 'tres' },
    ]);
    const blocks = parseBlocks(text);
    expect(blocks.map((b) => b.pomodoros_estimados)).toEqual([1, 1, 1]);
  });

  it('descarta bloques sin título y conserva los válidos', () => {
    const text = JSON.stringify([
      { titulo: '', descripcion: 'sin título', pomodoros_estimados: 1 },
      { descripcion: 'tampoco', pomodoros_estimados: 1 },
      { titulo: 'Válido', descripcion: 'ok', pomodoros_estimados: 2 },
    ]);
    const blocks = parseBlocks(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].titulo).toBe('Válido');
  });

  it('recorta títulos a 255 caracteres', () => {
    const text = JSON.stringify([
      { titulo: 'x'.repeat(300), descripcion: '', pomodoros_estimados: 1 },
    ]);
    expect(parseBlocks(text)[0].titulo).toHaveLength(255);
  });

  it('lanza AI_BAD_RESPONSE si no hay array JSON', () => {
    expect(() => parseBlocks('No puedo ayudarte con eso.')).toThrow('AI_BAD_RESPONSE');
  });

  it('lanza AI_BAD_RESPONSE con JSON inválido', () => {
    expect(() => parseBlocks('[{"titulo": "rota...')).toThrow('AI_BAD_RESPONSE');
  });

  it('lanza AI_BAD_RESPONSE con array vacío o sin bloques válidos', () => {
    expect(() => parseBlocks('[]')).toThrow('AI_BAD_RESPONSE');
    expect(() => parseBlocks('[{"descripcion":"sin titulo"}]')).toThrow('AI_BAD_RESPONSE');
  });
});

describe('splitTopicIntoBlocks', () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
    vi.unstubAllGlobals();
  });

  it('lanza AI_NOT_CONFIGURED sin ANTHROPIC_API_KEY', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(splitTopicIntoBlocks('Tema')).rejects.toThrow('AI_NOT_CONFIGURED');
  });

  it('devuelve bloques cuando la API responde bien', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          {
            type: 'text',
            text: '[{"titulo":"Bloque 1","descripcion":"d","pomodoros_estimados":2}]',
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const blocks = await splitTopicIntoBlocks('Guerra Fría', 'ensayo', 1, 4);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].titulo).toBe('Bloque 1');

    // La llamada lleva la key y el prompt con el tema
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('api.anthropic.com');
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('test-key');
    expect(init.body).toContain('Guerra Fría');
  });

  it('lanza AI_REQUEST_FAILED si la API devuelve error', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 529, text: async () => 'overloaded' }),
    );
    await expect(splitTopicIntoBlocks('Tema')).rejects.toThrow('AI_REQUEST_FAILED');
  });
});
