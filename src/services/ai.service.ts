import { AiBlock } from "../data/dataTypes";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

export interface SplitContext {
  tipoEntregable?: string | null; // ensayo, investigacion, exposicion... (F3)
  tamano?: string | null; // "10 páginas", "15 min"...
  fechaEntrega?: string | null; // ISO
}

/** Resultado de la división: o bloques (+supuestos), o preguntas de aclaración. */
export interface SplitResult {
  bloques?: AiBlock[];
  supuestos?: string[];
  preguntas?: string[];
}

/**
 * Divide un tema de trabajo grupal en bloques ejecutables usando la API de
 * Anthropic. Si el tema es demasiado vago, en lugar de inventar devuelve
 * hasta 3 preguntas de aclaración (SDD §18.5: "la IA pregunta, no inventa").
 * Nada se persiste: el grupo revisa, edita y asigna antes de confirmar.
 *
 * Requiere ANTHROPIC_API_KEY en el entorno.
 */
export const splitTopicIntoBlocks = async (
  tema: string,
  descripcion?: string | null,
  numBloques?: number | null,
  numMiembros?: number | null,
  context?: SplitContext,
  allowQuestions: boolean = true
): Promise<SplitResult> => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("AI_NOT_CONFIGURED");
  }

  const hint = numBloques
    ? `Genera exactamente ${numBloques} bloques.`
    : numMiembros
      ? `El grupo tiene ${numMiembros} integrantes; genera entre ${numMiembros} y ${numMiembros * 2} bloques para poder repartirlos.`
      : "Genera entre 3 y 8 bloques.";

  // Datos estructurados (F3): reducen la alucinación con temas vagos
  const facts = [
    context?.tipoEntregable ? `Tipo de entregable: ${context.tipoEntregable}` : "",
    context?.tamano ? `Tamaño aproximado: ${context.tamano}` : "",
    context?.fechaEntrega ? `Fecha de entrega: ${context.fechaEntrega}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const questionRule = allowQuestions
    ? `- Si el tema es demasiado vago o ambiguo para dividirlo con confianza (no sabes qué tipo de trabajo es, ni su alcance), NO inventes: responde {"preguntas": ["...", "..."]} con un máximo de 3 preguntas cortas y concretas cuya respuesta te permitiría dividir bien el trabajo.`
    : `- No puedes hacer preguntas: divide el trabajo con la información disponible, eligiendo la interpretación más probable.`;

  const prompt = `Eres un asistente para grupos de estudiantes. Divide el siguiente trabajo/tema en bloques de trabajo independientes y ejecutables, pensados para repartirse entre los integrantes del grupo y ejecutarse en sesiones de Pomodoro de 25 minutos.

Tema: ${tema}
${facts}
${descripcion ? `Contexto adicional: ${descripcion}` : ""}

Cíñete a los datos proporcionados; si el tipo de entregable está indicado, los bloques deben corresponder a ese tipo de trabajo (no inventes otro formato).

${hint}

Cada bloque debe servir además como guía de ejecución: incluye "pasos", una lista ORDENADA de 3 a 6 pasos concretos y accionables que la persona pueda seguir uno a uno para completar el bloque (empieza cada paso con un verbo; sin numerarlos, el orden del array es el orden de ejecución).

Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni markdown:
- Caso normal: {"bloques": [{"titulo": "string corto y accionable", "descripcion": "qué hay que hacer y qué entregar, 1-3 frases", "pomodoros_estimados": <entero 1-8>, "pasos": ["primer paso", "segundo paso", "..."]}], "supuestos": ["decisión que tomaste por falta de información, máx 4; lista vacía si no hubo"]}
${questionRule}`;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    console.error("Anthropic API error:", response.status, errBody);
    throw new Error("AI_REQUEST_FAILED");
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content?.find((c) => c.type === "text")?.text ?? "";

  const result = parseSplitResponse(text);
  // Cinturón y tirantes: si no se permiten preguntas pero el modelo las hace,
  // lo tratamos como respuesta inválida (mejor error claro que un bucle).
  if (!allowQuestions && result.preguntas) {
    throw new Error("AI_BAD_RESPONSE");
  }
  return result;
};

/** Extrae y valida la respuesta JSON del modelo (objeto o array legado).
 *  Exportada para tests unitarios. */
export const parseSplitResponse = (text: string): SplitResult => {
  // Tolerar que el modelo envuelva el JSON en texto o ```json ... ```
  const objStart = text.indexOf("{");
  const arrStart = text.indexOf("[");
  const useObject =
    objStart !== -1 && (arrStart === -1 || objStart < arrStart);

  let parsed: unknown;
  try {
    if (useObject) {
      const end = text.lastIndexOf("}");
      if (end <= objStart) throw new Error("no json");
      parsed = JSON.parse(text.slice(objStart, end + 1));
    } else if (arrStart !== -1) {
      const end = text.lastIndexOf("]");
      if (end <= arrStart) throw new Error("no json");
      // Formato legado: array de bloques a secas
      parsed = { bloques: JSON.parse(text.slice(arrStart, end + 1)) };
    } else {
      throw new Error("no json");
    }
  } catch {
    throw new Error("AI_BAD_RESPONSE");
  }

  const obj = parsed as Record<string, unknown>;

  // Variante preguntas
  if (Array.isArray(obj.preguntas)) {
    const preguntas = obj.preguntas
      .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
      .slice(0, 3)
      .map((q) => q.trim().slice(0, 300));
    if (preguntas.length > 0) return { preguntas };
    throw new Error("AI_BAD_RESPONSE");
  }

  // Variante bloques
  if (!Array.isArray(obj.bloques) || obj.bloques.length === 0) {
    throw new Error("AI_BAD_RESPONSE");
  }

  const blocks: AiBlock[] = [];
  for (const raw of obj.bloques) {
    if (!raw || typeof raw !== "object") continue;
    const b = raw as Record<string, unknown>;
    if (typeof b.titulo !== "string" || !b.titulo.trim()) continue;
    const est = Number(b.pomodoros_estimados);
    // Pasos: lista ordenada de ejecución (guía "paso a paso" del bloque)
    const pasos = Array.isArray(b.pasos)
      ? b.pasos
          .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
          .slice(0, 8)
          .map((p) => p.trim().slice(0, 300))
      : [];
    blocks.push({
      titulo: b.titulo.trim().slice(0, 255),
      descripcion: typeof b.descripcion === "string" ? b.descripcion.trim() : "",
      pomodoros_estimados:
        Number.isInteger(est) && est >= 1 && est <= 20 ? est : 1,
      pasos,
    });
  }

  if (blocks.length === 0) {
    throw new Error("AI_BAD_RESPONSE");
  }

  const supuestos = Array.isArray(obj.supuestos)
    ? obj.supuestos
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .slice(0, 4)
        .map((s) => s.trim().slice(0, 300))
    : [];

  return { bloques: blocks, supuestos };
};
