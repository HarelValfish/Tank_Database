// Provider-agnostic AI generation for the LOCAL-ONLY importer.
// Picks a provider from AI_PROVIDER ("groq" | "ollama"). Only ever loaded when
// ENABLE_AI_IMPORT=true, so nothing here runs in production.

const PROVIDER = (process.env.AI_PROVIDER || "groq").toLowerCase();

// Groq (free hosted, OpenAI-compatible). Get a key at https://console.groq.com/keys
const GROQ_URL = process.env.GROQ_URL || "https://api.groq.com/openai/v1";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

// Ollama (fully local fallback).
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b";

const SYSTEM_PROMPT = `You are a military historian populating a database of real armored fighting vehicles (tanks).
Given a user request, return accurate data for the requested vehicles as JSON.

Return a JSON object of exactly this shape:
{
  "tanks": [
    {
      "tankName": "string",
      "variant": "string",
      "armament": "string",
      "serviceTime": "string",
      "description": "string",
      "history": "string",
      "specifications": { "weight": "string", "crewSize": "string", "speed": "string" }
    }
  ]
}

Rules:
- Only include REAL vehicles that actually existed. Never invent vehicles or variants.
- Be factually accurate. If unsure of a specific field, use an empty string "" rather than guessing.
- "armament": the exact main gun, e.g. "120 mm MG253 smoothbore gun".
- "serviceTime": "YYYY–YYYY" or "YYYY–Present" (use an en dash).
- specifications.weight: include units, e.g. "65 tonnes".
- specifications.crewSize: e.g. "4" or "4 (commander, gunner, loader, driver)".
- specifications.speed: include units, e.g. "64 km/h (road)".
- "description": one or two precise factual sentences.
- "history": a short factual paragraph on development and service.
- Do NOT include image URLs.
- Return ONLY the JSON object — no prose, no markdown.`;

/**
 * Generates tank objects for a natural-language request via the configured provider.
 * @returns {Promise<Array>} normalized tank objects (no imageUrl)
 */
export async function generateTanksWithModel(prompt, count) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Request: ${prompt}\n\nReturn ${count} real vehicle(s) that best match this request as a JSON object {"tanks": [...]}.`,
    },
  ];

  const content = PROVIDER === "ollama" ? await callOllama(messages) : await callGroq(messages);
  if (!content) throw new Error("The model returned an empty response.");

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("The model returned malformed JSON.");
  }

  const tanks = Array.isArray(parsed?.tanks)
    ? parsed.tanks
    : Array.isArray(parsed)
      ? parsed
      : [];
  return tanks.map(normalizeTank).filter((t) => t.tankName);
}

// ─── Groq (OpenAI-compatible) ────────────────────────────────────
async function callGroq(messages) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error(
      "GROQ_API_KEY is not set in backend/.env. Get a free key at https://console.groq.com/keys"
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  let res;
  try {
    res = await fetch(`${GROQ_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages,
      }),
    });
  } catch (err) {
    if (err.name === "AbortError") throw new Error("Groq request timed out.");
    throw new Error("Could not reach Groq. Check your network connection.");
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401) throw new Error("Groq rejected the API key (401). Check GROQ_API_KEY.");
    if (res.status === 429) throw new Error("Groq rate limit reached (429). Wait a moment and retry.");
    throw new Error(`Groq error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content;
}

// ─── Ollama (local fallback) ─────────────────────────────────────
const OLLAMA_FORMAT = {
  type: "object",
  properties: {
    tanks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          tankName: { type: "string" },
          variant: { type: "string" },
          armament: { type: "string" },
          serviceTime: { type: "string" },
          description: { type: "string" },
          history: { type: "string" },
          specifications: {
            type: "object",
            properties: {
              weight: { type: "string" },
              crewSize: { type: "string" },
              speed: { type: "string" },
            },
            required: ["weight", "crewSize", "speed"],
          },
        },
        required: ["tankName", "specifications"],
      },
    },
  },
  required: ["tanks"],
};

async function callOllama(messages) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000);
  let res;
  try {
    res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        format: OLLAMA_FORMAT,
        options: { temperature: 0.2 },
        messages,
      }),
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Ollama timed out. Is the model loaded? Try a smaller count.");
    }
    throw new Error(`Could not reach Ollama at ${OLLAMA_URL}. Is it running? (ollama serve)`);
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Ollama error ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return data?.message?.content;
}

// ─── Shared normalization ────────────────────────────────────────
function str(v) {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function normalizeTank(t = {}) {
  const specs = t.specifications || {};
  return {
    tankName: str(t.tankName),
    variant: str(t.variant),
    armament: str(t.armament),
    serviceTime: str(t.serviceTime),
    description: str(t.description),
    history: str(t.history),
    imageUrl: "", // enriched later via Wikipedia on the client
    specifications: {
      weight: str(specs.weight),
      crewSize: str(specs.crewSize),
      speed: str(specs.speed),
    },
  };
}

export const aiConfig = { PROVIDER, GROQ_MODEL, OLLAMA_MODEL };
