/* NurtureAI — modular assessment engine
 * Catalogs, danger signs, validation and rules-based pre-screening.
 * No diagnosis. Rules only assign a priority for human/AI review.
 */

export type AssessmentType =
  | "maternal"
  | "newborn"
  | "child_u5"
  | "nutrition"
  | "household"
  | "followup";

export type Priority = "routine" | "monitor" | "priority_review" | "urgent";

export const ASSESSMENT_META: Record<
  AssessmentType,
  { label: string; description: string; icon: string }
> = {
  maternal: { label: "Maternal / Pregnancy", description: "Antenatal or postnatal woman", icon: "🤰" },
  newborn: { label: "Newborn (0–28 days)", description: "Post-birth infant screening", icon: "👶" },
  child_u5: { label: "Child Under 5", description: "IMCI-style child check", icon: "🧒" },
  nutrition: { label: "Nutrition", description: "Dietary and food-security review", icon: "🥣" },
  household: { label: "General Household", description: "Family-level health check", icon: "🏠" },
  followup: { label: "Follow-up", description: "Recheck after prior assessment", icon: "🔁" },
};

/* ---------------- Danger sign catalogs ---------------- */

export interface DangerSign {
  key: string;
  label: string;
  critical?: boolean; // triggers urgent priority immediately
}

export const DANGER_SIGNS: Record<AssessmentType, DangerSign[]> = {
  maternal: [
    { key: "severe_headache", label: "Severe or persistent headache", critical: true },
    { key: "blurred_vision", label: "Blurred vision or seeing spots", critical: true },
    { key: "severe_abdo_pain", label: "Severe abdominal pain", critical: true },
    { key: "vaginal_bleeding", label: "Vaginal bleeding", critical: true },
    { key: "convulsions", label: "Convulsions / fits", critical: true },
    { key: "difficulty_breathing", label: "Difficulty breathing", critical: true },
    { key: "severe_swelling", label: "Severe swelling of face or hands" },
    { key: "reduced_fetal_movement", label: "Reduced fetal movement", critical: true },
  ],
  newborn: [
    { key: "difficulty_breathing", label: "Difficulty breathing / fast breathing", critical: true },
    { key: "convulsions", label: "Convulsions", critical: true },
    { key: "unconscious", label: "Unconscious or unresponsive", critical: true },
    { key: "not_feeding", label: "Unable to feed / not breastfeeding", critical: true },
    { key: "persistent_vomit", label: "Persistent vomiting", critical: true },
    { key: "hypothermia", label: "Cold to touch / hypothermia", critical: true },
    { key: "high_fever", label: "High fever", critical: true },
    { key: "jaundice", label: "Yellow eyes or skin (jaundice)" },
    { key: "cord_infection", label: "Umbilical cord red / discharging" },
  ],
  child_u5: [
    { key: "difficulty_breathing", label: "Difficulty or fast breathing", critical: true },
    { key: "convulsions", label: "Convulsions", critical: true },
    { key: "unconscious", label: "Unconscious or very sleepy", critical: true },
    { key: "severe_dehydration", label: "Severe dehydration (sunken eyes, no tears)", critical: true },
    { key: "not_eating", label: "Unable to eat or drink", critical: true },
    { key: "persistent_vomit", label: "Persistent vomiting", critical: true },
    { key: "high_fever", label: "High fever (≥ 38.5°C)", critical: true },
    { key: "severe_weakness", label: "Severe weakness / floppy", critical: true },
    { key: "bloody_stool", label: "Blood in stool" },
  ],
  nutrition: [
    { key: "visible_wasting", label: "Visible severe wasting", critical: true },
    { key: "bilateral_edema", label: "Bilateral pitting oedema", critical: true },
    { key: "no_food_24h", label: "No food in the last 24 hours", critical: true },
  ],
  household: [
    { key: "no_water", label: "No safe water for > 24 hours" },
    { key: "outbreak", label: "Suspected disease outbreak", critical: true },
  ],
  followup: [
    { key: "worsening", label: "Condition has worsened", critical: true },
    { key: "new_symptoms", label: "New concerning symptoms" },
  ],
};

/* ---------------- Section schema ---------------- */

export interface Section {
  key: string;
  title: string;
  description?: string;
}

export const SECTIONS: Record<AssessmentType, Section[]> = {
  maternal: [
    { key: "pregnancy", title: "Pregnancy information" },
    { key: "vitals", title: "Vital signs" },
    { key: "symptoms", title: "Symptoms" },
    { key: "medical", title: "Medical history" },
    { key: "social", title: "Social & environmental" },
    { key: "notes", title: "Clinical notes" },
  ],
  newborn: [
    { key: "birth", title: "Birth & age" },
    { key: "vitals", title: "Vitals & feeding" },
    { key: "exam", title: "Physical exam" },
    { key: "immun", title: "Immunizations" },
    { key: "notes", title: "Clinical notes" },
  ],
  child_u5: [
    { key: "anthro", title: "Anthropometry" },
    { key: "symptoms", title: "Symptoms" },
    { key: "feeding", title: "Feeding" },
    { key: "immun", title: "Immunizations & development" },
    { key: "notes", title: "Clinical notes" },
  ],
  nutrition: [
    { key: "diet", title: "Diet & meals" },
    { key: "security", title: "Food security" },
    { key: "special", title: "Pregnancy / child feeding" },
    { key: "notes", title: "Notes" },
  ],
  household: [
    { key: "composition", title: "Household composition" },
    { key: "wash", title: "Water, sanitation & hygiene" },
    { key: "access", title: "Access & barriers" },
    { key: "concerns", title: "Health concerns" },
  ],
  followup: [
    { key: "previous", title: "Previous assessment" },
    { key: "progress", title: "Progress" },
    { key: "current", title: "Current condition" },
    { key: "notes", title: "Notes" },
  ],
};

/* ---------------- Rules engine ---------------- */

export interface RuleFlag {
  code: string;
  message: string;
  severity: "info" | "warn" | "urgent";
}

export interface RulesOutput {
  priority: Priority;
  flags: RuleFlag[];
  missing: string[];
}

const num = (v: unknown): number | undefined => {
  if (v === "" || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const parseBp = (v: unknown): [number, number] | undefined => {
  if (typeof v !== "string") return undefined;
  const m = v.match(/^(\d{2,3})\s*\/\s*(\d{2,3})$/);
  if (!m) return undefined;
  return [Number(m[1]), Number(m[2])];
};

export function runRules(
  type: AssessmentType,
  data: Record<string, any>,
  dangerSigns: string[],
): RulesOutput {
  const flags: RuleFlag[] = [];
  const missing: string[] = [];
  let priority: Priority = "routine";

  const escalate = (p: Priority) => {
    const order: Priority[] = ["routine", "monitor", "priority_review", "urgent"];
    if (order.indexOf(p) > order.indexOf(priority)) priority = p;
  };

  // Danger signs
  const catalog = DANGER_SIGNS[type];
  const selected = catalog.filter((s) => dangerSigns.includes(s.key));
  const critical = selected.filter((s) => s.critical);
  if (critical.length > 0) {
    escalate("urgent");
    flags.push({
      code: "danger_critical",
      severity: "urgent",
      message: `Critical danger sign${critical.length > 1 ? "s" : ""}: ${critical.map((s) => s.label).join(", ")}. Immediate professional clinical assessment may be required.`,
    });
  } else if (selected.length > 0) {
    escalate("priority_review");
    flags.push({
      code: "danger_present",
      severity: "warn",
      message: `Danger sign${selected.length > 1 ? "s" : ""} reported: ${selected.map((s) => s.label).join(", ")}.`,
    });
  }

  // Type-specific rules
  if (type === "maternal") {
    const bp = parseBp(data.blood_pressure);
    if (bp) {
      const [sys, dia] = bp;
      if (sys >= 160 || dia >= 110) {
        escalate("urgent");
        flags.push({ code: "bp_severe", severity: "urgent", message: `Severely elevated blood pressure (${sys}/${dia}). Urgent review.` });
      } else if (sys >= 140 || dia >= 90) {
        escalate("priority_review");
        flags.push({ code: "bp_high", severity: "warn", message: `Elevated blood pressure (${sys}/${dia}).` });
      }
    } else if (data.blood_pressure) {
      flags.push({ code: "bp_format", severity: "warn", message: "Blood pressure format looks unusual (expected e.g. 120/80)." });
    } else {
      missing.push("Blood pressure");
    }
    const t = num(data.temperature_c);
    if (t !== undefined && (t >= 38 || t < 35.5)) {
      escalate("priority_review");
      flags.push({ code: "temp_abn", severity: "warn", message: `Temperature ${t}°C outside normal range.` });
    }
    const pulse = num(data.pulse);
    if (pulse !== undefined && (pulse < 50 || pulse > 120)) {
      escalate("priority_review");
      flags.push({ code: "pulse_abn", severity: "warn", message: `Pulse ${pulse} bpm outside expected range.` });
    }
    if (!data.gestation_weeks) missing.push("Gestational age");
    if (!data.anc_visits && data.anc_visits !== 0) missing.push("ANC attendance");
  }

  if (type === "newborn") {
    const age = num(data.age_days);
    if (age !== undefined && (age < 0 || age > 28)) {
      flags.push({ code: "age_range", severity: "warn", message: "Newborn age outside 0–28 days." });
    }
    const bw = num(data.birth_weight_kg);
    if (bw !== undefined && bw < 2.5) {
      escalate("priority_review");
      flags.push({ code: "lbw", severity: "warn", message: `Low birth weight (${bw} kg).` });
    }
    const t = num(data.temperature_c);
    if (t !== undefined && (t >= 37.5 || t < 36)) {
      escalate("priority_review");
      flags.push({ code: "temp_abn", severity: "warn", message: `Temperature ${t}°C outside normal newborn range (36–37.5).` });
    }
  }

  if (type === "child_u5") {
    const muac = num(data.muac_cm);
    if (muac !== undefined) {
      if (muac < 11.5) {
        escalate("urgent");
        flags.push({ code: "muac_sam", severity: "urgent", message: `MUAC ${muac} cm indicates severe acute malnutrition (SAM).` });
      } else if (muac < 12.5) {
        escalate("priority_review");
        flags.push({ code: "muac_mam", severity: "warn", message: `MUAC ${muac} cm indicates moderate acute malnutrition (MAM).` });
      }
    } else {
      missing.push("MUAC");
    }
    const t = num(data.temperature_c);
    if (t !== undefined && t >= 38.5) {
      escalate("priority_review");
      flags.push({ code: "fever", severity: "warn", message: `High fever ${t}°C.` });
    }
    if (data.diarrhea && data.vomiting) {
      escalate("priority_review");
      flags.push({ code: "dehydration_risk", severity: "warn", message: "Diarrhoea plus vomiting — dehydration risk." });
    }
  }

  if (type === "nutrition") {
    const meals = num(data.meals_per_day);
    if (meals !== undefined && meals < 2) {
      escalate("priority_review");
      flags.push({ code: "low_meals", severity: "warn", message: "Fewer than 2 meals per day reported." });
    }
    const groups = Array.isArray(data.food_groups) ? data.food_groups.length : 0;
    if (groups > 0 && groups < 4) {
      escalate("monitor");
      flags.push({ code: "low_diversity", severity: "info", message: `Low dietary diversity (${groups} food groups).` });
    }
    if (data.food_insecure === true) {
      escalate("priority_review");
      flags.push({ code: "food_insecure", severity: "warn", message: "Household reports food insecurity." });
    }
  }

  if (type === "household") {
    if (data.no_safe_water === true) {
      escalate("priority_review");
      flags.push({ code: "no_water", severity: "warn", message: "No safe water access." });
    }
    if (data.no_latrine === true) {
      escalate("monitor");
      flags.push({ code: "no_latrine", severity: "info", message: "No functional latrine." });
    }
  }

  if (type === "followup") {
    if (data.condition_worsened === true) {
      escalate("urgent");
      flags.push({ code: "worse", severity: "urgent", message: "Reported worsening since previous assessment." });
    } else if (data.recommendations_followed === false) {
      escalate("priority_review");
      flags.push({ code: "not_followed", severity: "warn", message: "Prior recommendations not followed." });
    }
  }

  // If danger sign selected but no specific critical rule fired, keep at least monitor
  if (selected.length === 0 && priority === "routine" && flags.length > 0) {
    escalate("monitor");
  }

  return { priority, flags, missing };
}

export const PRIORITY_META: Record<
  Priority,
  { label: string; tone: "success" | "info" | "warning" | "destructive"; description: string }
> = {
  routine: { label: "Routine", tone: "success", description: "No red flags detected. Continue routine care." },
  monitor: { label: "Monitor", tone: "info", description: "Continue routine care with active monitoring." },
  priority_review: { label: "Priority review", tone: "warning", description: "Clinical review recommended soon." },
  urgent: { label: "Urgent attention", tone: "destructive", description: "Immediate professional clinical assessment may be required." },
};

/* ---------------- Validation ---------------- */

export interface ValidationIssue {
  field: string;
  message: string;
  level: "error" | "warn";
}

export function validate(
  type: AssessmentType,
  data: Record<string, any>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const push = (field: string, message: string, level: "error" | "warn" = "warn") =>
    issues.push({ field, message, level });

  if (type === "maternal") {
    const gw = num(data.gestation_weeks);
    if (gw !== undefined && (gw < 1 || gw > 44)) push("gestation_weeks", "Gestational age must be between 1 and 44 weeks.", "error");
    const bp = parseBp(data.blood_pressure);
    if (data.blood_pressure && !bp) push("blood_pressure", "Blood pressure must look like 120/80.", "error");
    const t = num(data.temperature_c);
    if (t !== undefined && (t < 30 || t > 43)) push("temperature_c", "Temperature outside plausible range.", "error");
  }
  if (type === "newborn") {
    const age = num(data.age_days);
    if (age !== undefined && (age < 0 || age > 90)) push("age_days", "Age (days) is not plausible for a newborn.", "error");
    const bw = num(data.birth_weight_kg);
    if (bw !== undefined && (bw < 0.4 || bw > 6)) push("birth_weight_kg", "Birth weight outside plausible range.", "error");
  }
  if (type === "child_u5") {
    const age = num(data.age_months);
    if (age !== undefined && (age < 0 || age > 60)) push("age_months", "Child age must be 0–60 months for under-5.", "error");
    const w = num(data.weight_kg);
    if (w !== undefined && (w < 1 || w > 40)) push("weight_kg", "Weight outside plausible range.", "error");
  }
  return issues;
}

/* ---------------- Field catalogs used by the wizard ---------------- */

export const CONSENT_TEXT =
  "This assessment will collect personal and health information for care planning. Data is stored securely and shared only with authorised health workers involved in the client's care. The client (or guardian) has been informed of the purpose and consents to the assessment.";
