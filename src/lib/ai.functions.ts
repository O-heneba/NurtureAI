import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { preserveRulesPriority } from "./ai-safety";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
type CloudProviderResponse = {
  choices: [{ message: { content: string } }];
  modelId?: string;
  provider?: string;
};

type ProviderConfig = {
  name: string;
  key: string | undefined;
  model: string;
  call: (body: {
    model: string;
    messages: ChatMessage[];
    response_format?: { type: string };
  }) => Promise<CloudProviderResponse>;
};

async function callGemini(body: {
  model: string;
  messages: ChatMessage[];
  response_format?: { type: string };
}): Promise<CloudProviderResponse> {
  const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GEMINI_API_KEY;
  if (!key)
    throw new Error(
      "GEMINI_API_KEY not configured. Add a Google AI Studio API key to the server environment.",
    );
  const systemMessage = body.messages.find((message) => message.role === "system");
  const contents = body.messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));
  const res = await fetch(
    `${GEMINI_API_URL}/${body.model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(systemMessage
          ? { systemInstruction: { parts: [{ text: systemMessage.content }] } }
          : {}),
        contents,
        generationConfig:
          body.response_format?.type === "json_object"
            ? { responseMimeType: "application/json" }
            : undefined,
      }),
    },
  );
  if (res.status === 429) throw new Error("AI rate limit reached — please try again shortly.");
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini request failed (${res.status}): ${t.slice(0, 300)}`);
  }
  const result = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return {
    provider: "gemini",
    modelId: body.model,
    choices: [{ message: { content: result.candidates?.[0]?.content?.parts?.[0]?.text ?? "" } }],
  };
}

async function callGroq(body: {
  model: string;
  messages: ChatMessage[];
  response_format?: { type: string };
}): Promise<CloudProviderResponse> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not configured.");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: body.model,
      messages: body.messages,
      response_format:
        body.response_format?.type === "json_object" ? { type: "json_object" } : undefined,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq request failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const result = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return {
    provider: "groq",
    modelId: body.model,
    choices: [{ message: { content: result.choices?.[0]?.message?.content ?? "" } }],
  };
}

async function callCerebras(body: {
  model: string;
  messages: ChatMessage[];
  response_format?: { type: string };
}): Promise<CloudProviderResponse> {
  const key = process.env.CEREBRAS_API_KEY;
  if (!key) throw new Error("CEREBRAS_API_KEY not configured.");

  const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: body.model,
      messages: body.messages,
      response_format:
        body.response_format?.type === "json_object" ? { type: "json_object" } : undefined,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cerebras request failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const result = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return {
    provider: "cerebras",
    modelId: body.model,
    choices: [{ message: { content: result.choices?.[0]?.message?.content ?? "" } }],
  };
}

async function callOpenRouter(body: {
  model: string;
  messages: ChatMessage[];
  response_format?: { type: string };
}): Promise<CloudProviderResponse> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not configured.");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
      "X-Title": "NurtureAI",
    },
    body: JSON.stringify({
      model: body.model,
      messages: body.messages,
      response_format:
        body.response_format?.type === "json_object" ? { type: "json_object" } : undefined,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter request failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const result = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return {
    provider: "openrouter",
    modelId: body.model,
    choices: [{ message: { content: result.choices?.[0]?.message?.content ?? "" } }],
  };
}

const CLOUD_PROVIDERS: ProviderConfig[] = [
  {
    name: "gemini",
    key: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GEMINI_API_KEY,
    model: "gemini-2.5-flash",
    call: callGemini,
  },
  {
    name: "groq",
    key: process.env.GROQ_API_KEY,
    model: "llama-3.1-8b-instant",
    call: callGroq,
  },
  {
    name: "cerebras",
    key: process.env.CEREBRAS_API_KEY,
    model: "llama3.1-8b",
    call: callCerebras,
  },
  {
    name: "openrouter",
    key: process.env.OPENROUTER_API_KEY,
    model: "openai/gpt-oss-20b",
    call: callOpenRouter,
  },
];

async function callPreferredCloudProvider(body: {
  messages: ChatMessage[];
  response_format?: { type: string };
}) {
  let lastError: Error | null = null;

  for (const provider of CLOUD_PROVIDERS) {
    if (!provider.key) continue;

    try {
      return await provider.call({
        model: provider.model,
        messages: body.messages,
        response_format: body.response_format,
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(
    "No cloud AI provider is configured. Add at least one of GEMINI_API_KEY, GROQ_API_KEY, CEREBRAS_API_KEY, or OPENROUTER_API_KEY.",
  );
}

/* ------------------- Assessment risk analysis ------------------- */

const AssessInput = z.object({
  assessmentType: z.string().default("general"),
  patient: z
    .object({
      name: z.string().optional(),
      age: z.number().optional(),
      sex: z.string().optional(),
      community: z.string().optional(),
      visitType: z.string().optional(),
    })
    .default({}),
  vitals: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
  symptoms: z.array(z.string()).default([]),
  pregnancy: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  child: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  nutrition: z.array(z.string()).default([]),
  riskFactors: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

const AI_ASSESS_SYSTEM = `You are NurtureAI, a clinical decision-support assistant for CHPS community health workers in Ghana.
Base guidance on Ghana Health Service protocols and WHO community-health guidelines.
Return STRICT JSON only. Do not include markdown fences.
Schema:
{
  "risk_level": "low" | "moderate" | "high" | "critical",
  "risk_score": integer 0-100,
  "summary": string (1-3 sentences, clinical),
  "contributing_factors": string[] (bulleted phrases),
  "recommended_actions": string[] (imperative bullets),
  "referral": { "recommended": boolean, "urgency": "routine"|"urgent"|"emergency", "facility_type": string, "reason": string },
  "nutrition_advice": string,
  "home_care": string,
  "disclaimer": string
}
Be conservative: escalate when in doubt. Prefer locally available Ghanaian foods in nutrition advice.`;

export const assessRisk = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AssessInput.parse(input))
  .handler(async ({ data }) => {
    const userPrompt = `Analyze this CHPS field assessment and return the JSON described.\n\n${JSON.stringify(data, null, 2)}`;
    const resp = await callPreferredCloudProvider({
      messages: [
        { role: "system", content: AI_ASSESS_SYSTEM },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });
    const raw = resp.choices?.[0]?.message?.content ?? "{}";
    try {
      return JSON.parse(raw);
    } catch {
      // best-effort strip of code fences
      const cleaned = raw.replace(/```json|```/g, "").trim();
      return JSON.parse(cleaned);
    }
  });

/* ------------------- Nutrition assistant chat ------------------- */

const ChatInput = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .min(1)
    .max(50),
});

const GenerateInput = z.object({
  messages: z
    .array(z.object({ role: z.enum(["system", "user", "assistant"]), content: z.string() }))
    .min(1)
    .max(50),
  responseFormat: z.enum(["text", "json"]).default("text"),
});

export const generateAI = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data }) => {
    const response = await callPreferredCloudProvider({
      messages: data.messages,
      response_format: data.responseFormat === "json" ? { type: "json_object" } : undefined,
    });
    return { reply: response.choices?.[0]?.message?.content ?? "" };
  });

const NUTRITION_SYSTEM = `You are NurtureAI's Nutrition Assistant for CHPS community health workers in Ghana.
- Give practical, culturally-appropriate advice using locally available Ghanaian foods (banku, kenkey, kontomire, groundnut, kokonte, dawadawa, tilapia, etc.).
- Cover pregnancy nutrition, breastfeeding, complementary feeding, child nutrition, and common deficiencies (iron, iodine, vitamin A).
- Base guidance on Ghana Health Service and WHO recommendations.
- Keep responses concise, structured with short bullet points where useful. Include a brief safety/referral note when clinically relevant.
- Do not diagnose or prescribe medication. Recommend clinical review when symptoms are concerning.`;

export const nutritionChat = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data }) => {
    const resp = await callPreferredCloudProvider({
      messages: [{ role: "system", content: NUTRITION_SYSTEM }, ...data.messages],
    });
    return { reply: resp.choices?.[0]?.message?.content ?? "" };
  });

/* ------------------- Modular assessment analysis ------------------- */

const AnalyzeInput = z.object({
  assessment_type: z.enum([
    "maternal",
    "newborn",
    "child_u5",
    "nutrition",
    "household",
    "followup",
  ]),
  person: z.record(z.string(), z.any()).default({}),
  danger_signs: z.array(z.string()).default([]),
  sections: z.record(z.string(), z.any()).default({}),
  rules: z.object({
    priority: z.string(),
    flags: z
      .array(z.object({ code: z.string(), message: z.string(), severity: z.string() }))
      .default([]),
    missing: z.array(z.string()).default([]),
  }),
  previous: z.record(z.string(), z.any()).optional(),
});

const ANALYZE_SYSTEM = `You are NurtureAI, a decision-support assistant for Ghanaian CHPS community health workers.
You DO NOT diagnose and DO NOT prescribe treatment. You summarise structured field data, explain why a rules
engine prioritised a case, suggest information gaps, and recommend next steps a health worker can consider.
Base guidance on Ghana Health Service and WHO community-health guidance. Prefer locally available Ghanaian
foods for nutrition guidance. Return STRICT JSON only, no markdown fences.

Schema:
{
  "priority_level": "routine" | "monitor" | "priority_review" | "urgent",
  "summary": string (2-4 sentences, plain clinical language),
  "contributing_factors": string[] (short phrases),
  "missing_information": string[] (what should still be collected),
  "recommended_next_steps": string[] (imperative bullets, community-health scope),
  "follow_up_suggestion": string (when and what to check),
  "referral_consideration": string (empty string if not indicated; otherwise why and urgency; do not name a facility unless data provided one),
  "nutrition_guidance": string (locally-appropriate; empty if not applicable),
  "uncertainty_notice": string (limitations of this AI-assisted review)
}

Rules:
- Respect the rules-engine priority: do not downgrade an "urgent" or "priority_review" from the rules engine unless the structured data clearly contradicts it, and explain any disagreement in "uncertainty_notice".
- Never treat missing fields as a negative finding — list them under "missing_information".
- Do not invent vitals, medications, or diagnoses not present in the data.
- Keep every string concise and readable on a mobile screen.`;

export const analyzeAssessment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data }) => {
    const userPrompt = `Analyse the following structured community-health assessment and return the JSON described.\n\n${JSON.stringify(data, null, 2)}`;
    const resp = await callPreferredCloudProvider({
      messages: [
        { role: "system", content: ANALYZE_SYSTEM },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });
    const raw = resp.choices?.[0]?.message?.content ?? "{}";
    try {
      return preserveRulesPriority(JSON.parse(raw), data.rules.priority as any);
    } catch {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      return preserveRulesPriority(JSON.parse(cleaned), data.rules.priority as any);
    }
  });
