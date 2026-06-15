import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseSplitResponse, splitTopicIntoBlocks } from '../src/services/ai.service';

describe('parseSplitResponse', () => {
  it('parsea el objeto con bloques y supuestos', () => {
    const text = JSON.stringify({
      bloques: [
        { titulo: 'Introducción', descripcion: 'Escribir intro', pomodoros_estimados: 2 },
        { titulo: 'Conclusiones', descripcion: 'Cerrar', pomodoros_estimados: 1 },
      ],
      supuestos: ['Asumí ensayo escrito de ~5 páginas'],
    });
    const result = parseSplitResponse(text);
    expect(result.bloques).toHaveLength(2);
    expect(result.bloques![0].titulo).toBe('Introducción');
    expect(result.supuestos).toEqual(['Asumí ensayo escrito de ~5 páginas']);
    expect(result.preguntas).toBeUndefined();
  });

  it('parsea la variante de preguntas de aclaración', () => {
    const text = JSON.stringify({
      preguntas: ['¿Es ensayo o exposición?', '¿De cuántas páginas?'],
    });
    const result = parseSplitResponse(text);
    expect(result.preguntas).toHaveLength(2);
    expect(result.bloques).toBeUndefined();
  });

  it('limita las preguntas a 3', () => {
    const text = JSON.stringify({ preguntas: ['a', 'b', 'c', 'd', 'e'] });
    expect(parseSplitResponse(text).preguntas).toHaveLength(3);
  });

  it('tolera JSON envuelto en texto y fences de markdown', () => {
    const text =
      'Claro:\n```json\n{"bloques":[{"titulo":"Bloque A","descripcion":"x","pomodoros_estimados":3}],"supuestos":[]}\n```\n¡Suerte!';
    const result = parseSplitResponse(text);
    expect(result.bloques).toHaveLength(1);
    expect(result.supuestos).toEqual([]);
  });

  it('parsea los pasos ordenados de cada bloque (guía de ejecución)', () => {
    const text = JSON.stringify({
      bloques: [
        {
          titulo: 'Investigar',
          descripcion: 'd',
          pomodoros_estimados: 2,
          pasos: ['Buscar 3 fuentes', 'Tomar notas', 'Hacer el esquema'],
        },
        { titulo: 'Sin pasos', descripcion: '', pomodoros_estimados: 1 },
      ],
      supuestos: [],
    })
    const result = parseSplitResponse(text);
    expect(result.bloques![0].pasos).toEqual([
      'Buscar 3 fuentes',
      'Tomar notas',
      'Hacer el esquema',
    ]);
    // Sin pasos en la respuesta → lista vacía, nunca undefined
    expect(result.bloques![1].pasos).toEqual([]);
  });

  it('limita los pasos a 8 y descarta entradas vacías', () => {
    const text = JSON.stringify({
      bloques: [
        {
          titulo: 'A',
          descripcion: '',
          pomodoros_estimados: 1,
          pasos: ['1', '', '2', '3', '4', '5', '6', '7', '8', '9', '  '],
        },
      ],
    })
    expect(parseSplitResponse(text).bloques![0].pasos).toHaveLength(8);
  });

  it('acepta el formato legado (array de bloques a secas)', () => {
    const text = JSON.stringify([
      { titulo: 'Legacy', descripcion: '', pomodoros_estimados: 2 },
    ]);
    const result = parseSplitResponse(text);
    expect(result.bloques).toHaveLength(1);
    expect(result.supuestos).toEqual([]);
  });

  it('normaliza estimaciones fuera de rango a 1', () => {
    const text = JSON.stringify({
      bloques: [
        { titulo: 'A', descripcion: '', pomodoros_estimados: 0 },
        { titulo: 'B', descripcion: '', pomodoros_estimados: 99 },
        { titulo: 'C', descripcion: '', pomodoros_estimados: 'tres' },
      ],
    });
    expect(parseSplitResponse(text).bloques!.map((b) => b.pomodoros_estimados)).toEqual([1, 1, 1]);
  });

  it('descarta bloques sin título y conserva los válidos', () => {
    const text = JSON.stringify({
      bloques: [
        { titulo: '', descripcion: 'sin título', pomodoros_estimados: 1 },
        { descripcion: 'tampoco', pomodoros_estimados: 1 },
        { titulo: 'Válido', descripcion: 'ok', pomodoros_estimados: 2 },
      ],
    });
    const result = parseSplitResponse(text);
    expect(result.bloques).toHaveLength(1);
    expect(result.bloques![0].titulo).toBe('Válido');
  });

  it('recorta títulos a 255 caracteres y supuestos a 4', () => {
    const text = JSON.stringify({
      bloques: [{ titulo: 'x'.repeat(300), descripcion: '', pomodoros_estimados: 1 }],
      supuestos: ['1', '2', '3', '4', '5', '6'],
    });
    const result = parseSplitResponse(text);
    expect(result.bloques![0].titulo).toHaveLength(255);
    expect(result.supuestos).toHaveLength(4);
  });

  it('lanza AI_BAD_RESPONSE si no hay JSON', () => {
    expect(() => parseSplitResponse('No puedo ayudarte con eso.')).toThrow('AI_BAD_RESPONSE');
  });

  it('lanza AI_BAD_RESPONSE con JSON inválido', () => {
    expect(() => parseSplitResponse('{"bloques": [{"titulo": "rota...')).toThrow('AI_BAD_RESPONSE');
  });

  it('lanza AI_BAD_RESPONSE con bloques vacíos o preguntas vacías', () => {
    expect(() => parseSplitResponse('{"bloques": []}')).toThrow('AI_BAD_RESPONSE');
    expect(() => parseSplitResponse('{"preguntas": []}')).toThrow('AI_BAD_RESPONSE');
    expect(() => parseSplitResponse('{"bloques": [{"descripcion":"sin titulo"}]}')).toThrow(
      'AI_BAD_RESPONSE',
    );
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

  const mockFetch = (text: string) =>
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text }] }),
    });

  it('lanza AI_NOT_CONFIGURED sin ANTHROPIC_API_KEY', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(splitTopicIntoBlocks('Tema')).rejects.toThrow('AI_NOT_CONFIGURED');
  });

  it('devuelve bloques y supuestos, y el prompt incluye tema y datos estructurados', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const fetchMock = mockFetch(
      '{"bloques":[{"titulo":"Bloque 1","descripcion":"d","pomodoros_estimados":2}],"supuestos":["s1"]}',
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await splitTopicIntoBlocks('Guerra Fría', 'ensayo', 1, 4, {
      tipoEntregable: 'ensayo',
      tamano: '10 páginas',
      fechaEntrega: '2026-06-20',
    });
    expect(result.bloques).toHaveLength(1);
    expect(result.supuestos).toEqual(['s1']);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('api.anthropic.com');
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('test-key');
    expect(init.body).toContain('Guerra Fría');
    expect(init.body).toContain('10 páginas');
    expect(init.body).toContain('2026-06-20');
  });

  it('devuelve preguntas cuando el modelo las hace y están permitidas', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    vi.stubGlobal('fetch', mockFetch('{"preguntas":["¿Tipo de trabajo?"]}'));
    const result = await splitTopicIntoBlocks('hacer el trabajo');
    expect(result.preguntas).toEqual(['¿Tipo de trabajo?']);
  });

  it('con allowQuestions=false, preguntas del modelo => AI_BAD_RESPONSE (sin bucles)', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    vi.stubGlobal('fetch', mockFetch('{"preguntas":["¿Tipo?"]}'));
    await expect(
      splitTopicIntoBlocks('hacer el trabajo', null, null, null, undefined, false),
    ).rejects.toThrow('AI_BAD_RESPONSE');
  });

  it('con allowQuestions=false el prompt prohíbe preguntar', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const fetchMock = mockFetch('{"bloques":[{"titulo":"B","descripcion":"","pomodoros_estimados":1}],"supuestos":[]}');
    vi.stubGlobal('fetch', fetchMock);
    await splitTopicIntoBlocks('tema', null, null, null, undefined, false);
    expect(fetchMock.mock.calls[0][1].body).toContain('No puedes hacer preguntas');
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
