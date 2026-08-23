import { supabase } from "@/integrations/supabase/client";
import type { AssessmentType, Priority } from "./assessment-engine";

const db = supabase as unknown as {
  from: (t: string) => any;
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
};

async function uid(): Promise<string> {
  const { data } = await db.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

const PRIORITY_TO_RISK: Record<Priority, "low" | "moderate" | "high" | "critical"> = {
  routine: "low",
  monitor: "low",
  priority_review: "high",
  urgent: "critical",
};

export interface AssessmentRow {
  id: string;
  person_id: string | null;
  assessment_type: string;
  inputs: any;
  ai_result: any;
  risk_level: string | null;
  risk_score: number | null;
  summary: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function saveDraft(v: {
  id?: string;
  person_id: string | null;
  assessment_type: AssessmentType;
  inputs: any;
}): Promise<AssessmentRow> {
  const created_by = await uid();
  const payload = {
    person_id: v.person_id,
    assessment_type: v.assessment_type,
    inputs: { ...v.inputs, status: "draft" },
    created_by,
  };
  if (v.id) {
    const { data, error } = await db
      .from("assessments")
      .update(payload)
      .eq("id", v.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as AssessmentRow;
  }
  const { data, error } = await db.from("assessments").insert(payload).select("*").single();
  if (error) throw error;
  return data as AssessmentRow;
}

export async function submitAssessment(v: {
  id?: string;
  person_id: string | null;
  assessment_type: AssessmentType;
  inputs: any;
  ai_result: any;
  priority: Priority;
}): Promise<AssessmentRow> {
  const created_by = await uid();
  const risk_level = PRIORITY_TO_RISK[v.priority];
  const risk_score =
    v.priority === "urgent"
      ? 90
      : v.priority === "priority_review"
        ? 70
        : v.priority === "monitor"
          ? 40
          : 15;
  const payload = {
    person_id: v.person_id,
    assessment_type: v.assessment_type,
    inputs: { ...v.inputs, status: "submitted", priority: v.priority },
    ai_result: v.ai_result,
    risk_level,
    risk_score,
    summary: v.ai_result?.summary ?? null,
    created_by,
  };
  if (v.id) {
    const { data, error } = await db
      .from("assessments")
      .update(payload)
      .eq("id", v.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as AssessmentRow;
  }
  const { data, error } = await db.from("assessments").insert(payload).select("*").single();
  if (error) throw error;
  return data as AssessmentRow;
}

export async function listAssessments(limit = 100): Promise<AssessmentRow[]> {
  const { data, error } = await db
    .from("assessments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AssessmentRow[];
}

export async function listAssessmentsForPerson(person_id: string): Promise<AssessmentRow[]> {
  const { data, error } = await db
    .from("assessments")
    .select("*")
    .eq("person_id", person_id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AssessmentRow[];
}

export async function getAssessment(id: string): Promise<AssessmentRow | null> {
  const { data, error } = await db.from("assessments").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as AssessmentRow) ?? null;
}

export async function markReviewed(id: string, note?: string): Promise<AssessmentRow> {
  const current = await getAssessment(id);
  if (!current) throw new Error("Not found");
  const inputs = {
    ...(current.inputs ?? {}),
    status: "reviewed",
    reviewed_at: new Date().toISOString(),
  };
  if (note) {
    inputs.review_notes = [
      ...(current.inputs?.review_notes ?? []),
      { at: new Date().toISOString(), note },
    ];
  }
  const { data, error } = await db
    .from("assessments")
    .update({ inputs })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as AssessmentRow;
}

export async function appendNote(id: string, note: string): Promise<AssessmentRow> {
  const current = await getAssessment(id);
  if (!current) throw new Error("Not found");
  const inputs = {
    ...(current.inputs ?? {}),
    notes_log: [...(current.inputs?.notes_log ?? []), { at: new Date().toISOString(), note }],
  };
  const { data, error } = await db
    .from("assessments")
    .update({ inputs })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as AssessmentRow;
}

export async function searchPersons(q: string): Promise<
  Array<{
    id: string;
    full_name: string;
    sex: string | null;
    date_of_birth: string | null;
    household_id: string | null;
  }>
> {
  let query = db
    .from("persons")
    .select("id, full_name, sex, date_of_birth, household_id")
    .order("full_name")
    .limit(20);
  if (q.trim()) query = query.ilike("full_name", `%${q.trim()}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
