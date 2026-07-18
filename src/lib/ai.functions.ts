import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

async function callGateway(body: Record<string, unknown>) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new Error("AI rate limit reached — please try again shortly.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits in your workspace to continue.");
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI request failed (${res.status}): ${t.slice(0, 200)}`);
  }
  return (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
}

/* ------------------- Assessment risk analysis ------------------- */

const AssessInput = z.object({
  assessmentType: z.string().default("general"),
  patient: z.object({
    name: z.string().optional(),
    age: z.number().optional(),
    sex: z.string().optional(),
    community: z.string().optional(),
    visitType: z.string().optional(),
  }).default({}),
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
    const resp = await callGateway({
      model: DEFAULT_MODEL,
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
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).min(1).max(50),
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
    const resp = await callGateway({
      model: DEFAULT_MODEL,
      messages: [{ role: "system", content: NUTRITION_SYSTEM }, ...data.messages],
    });
    return { reply: resp.choices?.[0]?.message?.content ?? "" };
  });
