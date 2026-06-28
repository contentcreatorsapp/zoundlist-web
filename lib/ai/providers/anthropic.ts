import type { AIProvider, TrackMetadataInput, TrackMetadataSuggestion } from "../types";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MODEL         = "claude-haiku-4-5-20251001";

const TOOL_SCHEMA = {
  name: "generate_track_metadata",
  description: "Generate professional metadata for a stock music track",
  input_schema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Improved or confirmed track title (keep if already professional)",
      },
      description: {
        type: "string",
        description: "2–3 professional sentences in Spanish describing the track's character and ideal use cases",
      },
      genre: {
        type: "string",
        description: "Genre slug (cinematic, electronic, jazz, ambient, corporate, etc.)",
      },
      subgenre: {
        type: ["string", "null"],
        description: "Specific subgenre (e.g. 'orchestral', 'lo-fi hip hop', 'dark ambient')",
      },
      moods: {
        type: "array",
        items: { type: "string" },
        description: "2–4 mood descriptors in Spanish (e.g. Épico, Melancólico, Inspirador)",
      },
      energy: {
        type: "integer",
        minimum: 1,
        maximum: 10,
        description: "Energy level: 1=very calm/ambient, 10=very intense/driving",
      },
      bpm: {
        type: ["integer", "null"],
        description: "Estimated BPM based on genre/mood; null only if truly impossible to estimate",
      },
      musical_key: {
        type: ["string", "null"],
        description: "Musical key (e.g. 'C major', 'A minor', 'F# minor'); null if impossible to estimate",
      },
      instruments: {
        type: "array",
        items: { type: "string" },
        description: "Main instruments in English (e.g. 'strings', 'piano', 'drums', 'synth')",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "6–12 SEO tags in English, lowercase (e.g. 'cinematic', 'epic', 'trailer', 'orchestral')",
      },
      recommended_uses: {
        type: "array",
        items: { type: "string" },
        description: "Best use cases from: YouTube, Podcast, Corporate, Wedding, Documentary, Church, Commercial, Lifestyle, Coffee Shop, Real Estate, Luxury, Technology, Film, Trailer, TV, Social Media, Gaming, Sports, Fashion, News",
      },
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
        description: "Confidence in the generated metadata (0.70–0.85 typical; 0.90+ only with rich input data)",
      },
    },
    required: [
      "title", "description", "genre", "moods", "energy",
      "instruments", "tags", "recommended_uses", "confidence",
    ],
  },
};

function buildPrompt(input: TrackMetadataInput): string {
  const bpmDisplay = input.bpm && input.bpm > 0 ? `${input.bpm} BPM` : "Desconocido";
  const lines: string[] = [
    `- Título: ${input.title}`,
    `- Artista: ${input.artist}`,
    `- Género: ${input.genre}`,
    `- Mood principal: ${input.mood ?? "No especificado"}`,
    `- BPM: ${bpmDisplay}`,
    `- Duración: ${input.duration || "No disponible"}`,
  ];
  if (input.existingDescription)             lines.push(`- Descripción existente: ${input.existingDescription}`);
  if (input.existingInstruments.length > 0)  lines.push(`- Instrumentos conocidos: ${input.existingInstruments.join(", ")}`);
  if (input.existingTags.length > 0)         lines.push(`- Tags existentes: ${input.existingTags.join(", ")}`);

  return `Track para catalogar en Zoundlist:\n${lines.join("\n")}\n\nGenera metadata completa y profesional.`;
}

export class AnthropicProvider implements AIProvider {
  readonly id   = "anthropic";
  readonly name = "Anthropic Claude";

  async generateTrackMetadata(input: TrackMetadataInput): Promise<TrackMetadataSuggestion> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured.");

    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
      },
      body: JSON.stringify({
        model:        MODEL,
        max_tokens:   1024,
        system:
          "Eres un especialista en catalogación de música stock. " +
          "Genera metadata profesional que maximice la descubribilidad del track. " +
          "Descripciones en español. Tags, instrumentos y usos en inglés. " +
          "Infiere BPM, tonalidad y energía desde el género y mood cuando no se proporcionan.",
        tools:        [TOOL_SCHEMA],
        tool_choice:  { type: "tool", name: "generate_track_metadata" },
        messages:     [{ role: "user", content: buildPrompt(input) }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Anthropic API ${res.status}: ${body}`);
    }

    const data = await res.json();
    const toolUse = data.content?.find((b: { type: string }) => b.type === "tool_use");
    if (!toolUse) throw new Error("No tool_use block in Anthropic response");

    const raw = toolUse.input as Record<string, unknown>;

    return {
      title:           (raw.title           as string)   || input.title,
      description:     (raw.description     as string)   || "",
      genre:           (raw.genre           as string)   || input.genre,
      subgenre:        (raw.subgenre        as string | null) ?? null,
      moods:           (raw.moods           as string[]) || [],
      energy:          (raw.energy          as number)   || 5,
      bpm:             (raw.bpm             as number | null) ?? null,
      musicalKey:      (raw.musical_key     as string | null) ?? null,
      instruments:     (raw.instruments     as string[]) || [],
      tags:            (raw.tags            as string[]) || [],
      recommendedUses: (raw.recommended_uses as string[]) || [],
      confidence:      (raw.confidence      as number)   || 0.75,
    };
  }
}
