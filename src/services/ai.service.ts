import { AiBlock } from "../data/dataTypes";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

/**
 * Divide un tema de trabajo grupal en bloques ejecutables usando la API de
 * Anthropic. Devuelve los bloques propuestos SIN persistir nada: el grupo los
 * revisa, edita y asigna antes de confirmar.
 *
 * Requiere ANTHROPIC_API_KEY en el entorno.
 */
export const splitTopicIntoBlocks = async (
  tema: string,
  descripcion?: string | null,
  numBloques?: number | null,
  numMiembros?: number | null
): Promise<AiBlock[]> => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("AI_NOT_CONFIGURED");
  }

  const hint = numBloques
    ? `Genera exactamente ${numBloques} bloques.`
    : numMiembros
      ? `El grupo tiene ${numMiembros} integrantes; genera entre ${numMiembros} y ${numMiembros * 2} bloques para poder repartirlos.`
      : "Genera entre 3 y 8 bloques.";

  const prompt = `Eres un asistente para grupos de estudiantes. Divide el siguiente trabajo/tema en bloques de trabajo independientes y ejecutables, pensados para repartirse entre los integrantes del grupo y ejecutarse en sesiones de Pomodoro de 25 minutos.

Tema: ${tema}
${descripcion ? `Contexto adicional: ${descripcion}` : ""}

${hint}

Responde ÚNICAMENTE con un array JSON válido, sin texto adicional ni markdown, con esta forma:
[{"titulo": "string corto y accionable", "descripcion": "qué hay que hacer y qué entregar, 1-3 frases", "pomodoros_estimados": <entero 1-8>}]`;

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

  return parseBlocks(text);
};

/** Extrae y valida el array JSON de bloques de la respuesta del modelo.
 *  Exportada para tests unitarios. */
export const parseBlocks = (text: string): AiBlock[] => {
  // Tolerar que el modelo envuelva el JSON en texto o ```json ... ```
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI_BAD_RESPONSE");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error("AI_BAD_RESPONSE");
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("AI_BAD_RESPONSE");
  }

  const blocks: AiBlock[] = [];
  for (const raw of parsed) {
    if (!raw || typeof raw !== "object") continue;
    const b = raw as Record<string, unknown>;
    if (typeof b.titulo !== "string" || !b.titulo.trim()) continue;
    const est = Number(b.pomodoros_estimados);
    blocks.push({
      titulo: b.titulo.trim().slice(0, 255),
      descripcion: typeof b.descripcion === "string" ? b.descripcion.trim() : "",
      pomodoros_estimados:
        Number.isInteger(est) && est >= 1 && est <= 20 ? est : 1,
    });
  }

  if (blocks.length === 0) {
    throw new Error("AI_BAD_RESPONSE");
  }
  return blocks;
};
