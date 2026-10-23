import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ImmunizationStatusValue = "RECEIVED" | "DUE" | "UPCOMING" | "OVERDUE";
export type OverallImmunizationStatus = "up_to_date" | "due" | "overdue" | "not_started";

export type ImmunizationScheduleEntry = {
  id: string;
  vaccine_code: string;
  vaccine_name: string;
  display_name: string;
  dose_number: number | null;
  recommended_age_days: number;
  milestone_label: string;
  sort_order: number;
  active: boolean;
};

export type ImmunizationRecordInput = {
  child_id: string;
  schedule_id?: string | null;
  vaccine_code?: string | null;
  administered_date: string;
  administered_at_facility?: string | null;
  source: string;
  assessment_id?: string | null;
  notes?: string | null;
  created_by?: string | null;
};

export type ImmunizationStatusRow = {
  scheduleId: string;
  vaccineCode: string;
  vaccineName: string;
  milestoneLabel: string;
  dueDate: string;
  administeredDate: string | null;
  status: ImmunizationStatusValue;
};

export type ImmunizationSummary = {
  items: ImmunizationStatusRow[];
  overallStatus: OverallImmunizationStatus;
  nextMilestone: string | null;
  nextDueDate: string | null;
  numberReceived: number;
  numberDue: number;
  numberOverdue: number;
  numberUpcoming: number;
  completionPercentage: number;
};

export function parseDateString(value: string): Date | null {
  if (!value) return null;

  const normalized = value.trim();
  const iso = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [, year, month, day] = iso;
    const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const dmy = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) {
    const [, day, month, year] = dmy;
    const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toIsoDate(value: string): string {
  const date = parseDateString(value);
  if (!date) return value;
  return date.toISOString().slice(0, 10);
}

export function addDays(dateValue: string, days: number): string {
  const parsed = parseDateString(dateValue);
  if (!parsed) return dateValue;
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function calculateAgeInDays(
  dob: string,
  asOfDate: string = new Date().toISOString().slice(0, 10),
): number {
  if (!dob) return 0;
  const start = parseDateString(dob);
  const end = parseDateString(asOfDate);
  if (!start || !end) return 0;
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / 86400000));
}

export function calculateAgeInWeeks(
  dob: string,
  asOfDate: string = new Date().toISOString().slice(0, 10),
): number {
  return Math.max(0, Math.floor(calculateAgeInDays(dob, asOfDate) / 7));
}

export function calculateAgeInMonths(
  dob: string,
  asOfDate: string = new Date().toISOString().slice(0, 10),
): number {
  if (!dob) return 0;
  const start = parseDateString(dob);
  const end = parseDateString(asOfDate);
  if (!start || !end) return 0;
  let months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12;
  months += end.getUTCMonth() - start.getUTCMonth();
  if (end.getUTCDate() < start.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

export function formatChildAge(
  dob: string,
  asOfDate: string = new Date().toISOString().slice(0, 10),
): string {
  if (!dob) return "Unknown";

  const days = calculateAgeInDays(dob, asOfDate);
  if (days < 28) {
    return days === 0 ? "Newborn" : `${days} day${days === 1 ? "" : "s"}`;
  }

  const weeks = calculateAgeInWeeks(dob, asOfDate);
  if (weeks < 8) {
    return `${weeks} week${weeks === 1 ? "" : "s"}`;
  }

  const months = calculateAgeInMonths(dob, asOfDate);
  const years = Math.floor(months / 12);
  const remainderMonths = months % 12;

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years === 1 ? "" : "s"}`);
  if (remainderMonths > 0) parts.push(`${remainderMonths} month${remainderMonths === 1 ? "" : "s"}`);
  if (parts.length === 0 && months > 0) parts.push(`${months} month${months === 1 ? "" : "s"}`);

  return parts.join(", ");
}

export const DEFAULT_IMMUNIZATION_SCHEDULE: ImmunizationScheduleEntry[] = [
  { id: "bcg", vaccine_code: "BCG", vaccine_name: "BCG", display_name: "BCG", dose_number: 1, recommended_age_days: 0, milestone_label: "Birth", sort_order: 1, active: true },
  { id: "opv0", vaccine_code: "OPV0", vaccine_name: "OPV 0", display_name: "OPV 0", dose_number: 1, recommended_age_days: 0, milestone_label: "Birth", sort_order: 2, active: true },
  { id: "hepb_birth", vaccine_code: "HEPB_BIRTH", vaccine_name: "Hepatitis B birth dose", display_name: "Hepatitis B birth dose", dose_number: 1, recommended_age_days: 0, milestone_label: "Birth", sort_order: 3, active: true },
  { id: "dpt_hepb_hib_1", vaccine_code: "DPT_HEPB_HIB_1", vaccine_name: "DPT-HepB-Hib 1", display_name: "DPT-HepB-Hib 1", dose_number: 1, recommended_age_days: 42, milestone_label: "6 Weeks", sort_order: 10, active: true },
  { id: "opv1", vaccine_code: "OPV1", vaccine_name: "OPV 1", display_name: "OPV 1", dose_number: 1, recommended_age_days: 42, milestone_label: "6 Weeks", sort_order: 11, active: true },
  { id: "pcv1", vaccine_code: "PCV1", vaccine_name: "PCV 1", display_name: "PCV 1", dose_number: 1, recommended_age_days: 42, milestone_label: "6 Weeks", sort_order: 12, active: true },
  { id: "rotavirus1", vaccine_code: "ROTAVIRUS1", vaccine_name: "Rotavirus 1", display_name: "Rotavirus 1", dose_number: 1, recommended_age_days: 42, milestone_label: "6 Weeks", sort_order: 13, active: true },
  { id: "dpt_hepb_hib_2", vaccine_code: "DPT_HEPB_HIB_2", vaccine_name: "DPT-HepB-Hib 2", display_name: "DPT-HepB-Hib 2", dose_number: 2, recommended_age_days: 70, milestone_label: "10 Weeks", sort_order: 20, active: true },
  { id: "opv2", vaccine_code: "OPV2", vaccine_name: "OPV 2", display_name: "OPV 2", dose_number: 2, recommended_age_days: 70, milestone_label: "10 Weeks", sort_order: 21, active: true },
  { id: "pcv2", vaccine_code: "PCV2", vaccine_name: "PCV 2", display_name: "PCV 2", dose_number: 2, recommended_age_days: 70, milestone_label: "10 Weeks", sort_order: 22, active: true },
  { id: "rotavirus2", vaccine_code: "ROTAVIRUS2", vaccine_name: "Rotavirus 2", display_name: "Rotavirus 2", dose_number: 2, recommended_age_days: 70, milestone_label: "10 Weeks", sort_order: 23, active: true },
  { id: "dpt_hepb_hib_3", vaccine_code: "DPT_HEPB_HIB_3", vaccine_name: "DPT-HepB-Hib 3", display_name: "DPT-HepB-Hib 3", dose_number: 3, recommended_age_days: 98, milestone_label: "14 Weeks", sort_order: 30, active: true },
  { id: "opv3", vaccine_code: "OPV3", vaccine_name: "OPV 3", display_name: "OPV 3", dose_number: 3, recommended_age_days: 98, milestone_label: "14 Weeks", sort_order: 31, active: true },
  { id: "pcv3", vaccine_code: "PCV3", vaccine_name: "PCV 3", display_name: "PCV 3", dose_number: 3, recommended_age_days: 98, milestone_label: "14 Weeks", sort_order: 32, active: true },
  { id: "rotavirus3", vaccine_code: "ROTAVIRUS3", vaccine_name: "Rotavirus 3", display_name: "Rotavirus 3", dose_number: 3, recommended_age_days: 98, milestone_label: "14 Weeks", sort_order: 33, active: true },
  { id: "ipv1", vaccine_code: "IPV1", vaccine_name: "IPV 1", display_name: "IPV 1", dose_number: 1, recommended_age_days: 98, milestone_label: "14 Weeks", sort_order: 34, active: true },
  { id: "mr1", vaccine_code: "MR1", vaccine_name: "Measles-Rubella 1", display_name: "Measles-Rubella 1", dose_number: 1, recommended_age_days: 270, milestone_label: "9 Months", sort_order: 40, active: true },
  { id: "yellow_fever1", vaccine_code: "YELLOW_FEVER1", vaccine_name: "Yellow Fever 1", display_name: "Yellow Fever 1", dose_number: 1, recommended_age_days: 270, milestone_label: "9 Months", sort_order: 41, active: true },
  { id: "ipv2", vaccine_code: "IPV2", vaccine_name: "IPV 2", display_name: "IPV 2", dose_number: 2, recommended_age_days: 548, milestone_label: "18 Months", sort_order: 50, active: true },
  { id: "mr2", vaccine_code: "MR2", vaccine_name: "Measles-Rubella 2", display_name: "Measles-Rubella 2", dose_number: 2, recommended_age_days: 548, milestone_label: "18 Months", sort_order: 51, active: true },
  { id: "vitamin_a_1", vaccine_code: "VITAMIN_A_1", vaccine_name: "Vitamin A 1", display_name: "Vitamin A 1", dose_number: 1, recommended_age_days: 182, milestone_label: "6 Months", sort_order: 60, active: true },
  { id: "vitamin_a_2", vaccine_code: "VITAMIN_A_2", vaccine_name: "Vitamin A 2", display_name: "Vitamin A 2", dose_number: 2, recommended_age_days: 365, milestone_label: "12 Months", sort_order: 61, active: true },
  { id: "malaria_1", vaccine_code: "MALARIA1", vaccine_name: "Malaria vaccine 1", display_name: "Malaria vaccine 1", dose_number: 1, recommended_age_days: 270, milestone_label: "9 Months", sort_order: 70, active: true },
];

export function getScheduleByVaccineCode(
  code: string,
  schedule: ImmunizationScheduleEntry[] = DEFAULT_IMMUNIZATION_SCHEDULE,
): ImmunizationScheduleEntry | undefined {
  const normalized = code.trim();
  return schedule.find(
    (entry) =>
      entry.vaccine_code === normalized ||
      entry.display_name === normalized ||
      entry.vaccine_name === normalized,
  );
}

export function getImmunizationScheduleForAge({
  dob,
  asOfDate = new Date().toISOString().slice(0, 10),
  schedule = DEFAULT_IMMUNIZATION_SCHEDULE,
}: {
  dob: string | null | undefined;
  asOfDate?: string;
  schedule?: ImmunizationScheduleEntry[];
}): ImmunizationScheduleEntry[] {
  if (!dob) return [];

  const dobDate = parseDateString(dob.trim());
  const asOfDateValue = parseDateString((asOfDate ?? new Date().toISOString().slice(0, 10)).trim());

  if (!dobDate || !asOfDateValue) return [];

  const ageInDays = Math.max(0, Math.floor((asOfDateValue.getTime() - dobDate.getTime()) / 86400000));
  const dueWindowDays = ageInDays + 28;

  return schedule.filter((entry) => {
    if (!entry.active || entry.recommended_age_days > 3650) return false;
    if (entry.recommended_age_days > dueWindowDays) return false;

    if (ageInDays <= 28) {
      return entry.milestone_label === "Birth";
    }

    return true;
  });
}

export function evaluateImmunizationStatus({
  dob,
  asOfDate = new Date().toISOString().slice(0, 10),
  schedule = DEFAULT_IMMUNIZATION_SCHEDULE,
  records = [],
}: {
  dob: string;
  asOfDate?: string;
  schedule?: ImmunizationScheduleEntry[];
  records?: Array<{
    child_id?: string;
    schedule_id?: string | null;
    vaccine_code?: string | null;
    administered_date: string | null;
    source?: string | null;
  }>;
}): ImmunizationSummary & { items: ImmunizationStatusRow[] } {
  const items = schedule
    .filter((entry) => entry.active)
    .map((entry) => {
      const dueDate = addDays(dob, entry.recommended_age_days);
      const record = records.find(
        (current) =>
          (current.schedule_id != null && entry.id && current.schedule_id === entry.id) ||
          (!!current.vaccine_code && current.vaccine_code === entry.vaccine_code),
      );
      const administeredDate = record?.administered_date ?? null;
      const status: ImmunizationStatusValue = administeredDate
        ? "RECEIVED"
        : asOfDate < dueDate
          ? "UPCOMING"
          : asOfDate <= addDays(dueDate, 28)
            ? "DUE"
            : "OVERDUE";

      return {
        scheduleId: entry.id,
        vaccineCode: entry.vaccine_code,
        vaccineName: entry.vaccine_name,
        milestoneLabel: entry.milestone_label,
        dueDate,
        administeredDate,
        status,
      };
    })
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate));

  const numberReceived = items.filter((item) => item.status === "RECEIVED").length;
  const numberDue = items.filter((item) => item.status === "DUE").length;
  const numberOverdue = items.filter((item) => item.status === "OVERDUE").length;
  const numberUpcoming = items.filter((item) => item.status === "UPCOMING").length;

  let overallStatus: OverallImmunizationStatus = "not_started";
  if (numberOverdue > 0) overallStatus = "overdue";
  else if (numberDue > 0) overallStatus = "due";
  else if (numberReceived > 0 || numberUpcoming === 0) overallStatus = "up_to_date";

  const nextCandidate = items.find((item) => item.status !== "RECEIVED");
  const nextMilestone = nextCandidate ? nextCandidate.milestoneLabel : null;
  const nextDueDate = nextCandidate ? nextCandidate.dueDate : null;

  const eligibleForProgress = items.filter((item) => item.dueDate <= asOfDate).length;
  const completionPercentage = eligibleForProgress > 0
    ? Math.round((numberReceived / eligibleForProgress) * 100)
    : numberReceived > 0
      ? 100
      : 0;

  return {
    items,
    overallStatus,
    nextMilestone,
    nextDueDate,
    numberReceived,
    numberDue,
    numberOverdue,
    numberUpcoming,
    completionPercentage,
  };
}

export function normalizeImmunizationIdentifier(value?: string | null): string | null {
  if (!value || !value.trim()) return null;
  return value.trim().replace(/-/g, "_").toUpperCase();
}

export async function resolveScheduleIdForInsert(
  client: any,
  payload: Pick<ImmunizationRecordInput, "schedule_id" | "vaccine_code">,
): Promise<string | null> {
  if (!client) return null;

  const explicitId = payload.schedule_id?.trim();
  if (explicitId && /^[0-9a-fA-F-]{36}$/.test(explicitId)) {
    return explicitId;
  }

  const codeCandidate = normalizeImmunizationIdentifier(payload.vaccine_code ?? payload.schedule_id ?? null);
  if (!codeCandidate) return payload.schedule_id ?? null;

  const { data, error } = await client
    .from("immunization_schedule")
    .select("id")
    .eq("vaccine_code", codeCandidate)
    .maybeSingle();

  if (!error && data?.id && /^[0-9a-fA-F-]{36}$/.test(data.id)) return data.id;

  return null;
}

export async function recordVaccination(payload: ImmunizationRecordInput): Promise<{ id: string } | null> {
  const client = (supabase as any) ?? null;
  if (!client || !payload.child_id || !payload.administered_date) return null;

  const resolvedScheduleId = await resolveScheduleIdForInsert(client, payload);
  const record = {
    child_id: payload.child_id,
    schedule_id: resolvedScheduleId ?? null,
    vaccine_code: payload.vaccine_code ?? null,
    administered_date: toIsoDate(payload.administered_date),
    administered_at_facility: payload.administered_at_facility ?? null,
    source: payload.source,
    assessment_id: payload.assessment_id ?? null,
    notes: payload.notes ?? null,
    created_by: payload.created_by ?? null,
  };

  const { data, error } = await client
    .from("child_immunizations")
    .upsert(record, { onConflict: "child_id,schedule_id", ignoreDuplicates: false })
    .select("id")
    .single();

  if (error) {
    const detail = [error.message, error.details, error.hint, error.code]
      .filter(Boolean)
      .join(" · ");
    throw new Error(`Could not record ${payload.vaccine_code ?? "immunization"}: ${detail || "database rejected the record"}`);
  }
  return (data ?? null) as { id: string } | null;
}

export function useChildImmunizations(childId: string | null, refreshKey = 0) {
  const [records, setRecords] = useState<
    Array<{
      id: string;
      child_id: string;
      schedule_id: string | null;
      vaccine_code: string | null;
      administered_date: string;
      source: string;
      notes?: string | null;
    }>
  >([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!childId) {
      setRecords([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      const client = (supabase as any) ?? null;
      if (!client) {
        setRecords([]);
        setLoading(false);
        return;
      }

      const { data, error } = await client
        .from("child_immunizations")
        .select("id, child_id, schedule_id, vaccine_code, administered_date, source, notes")
        .eq("child_id", childId)
        .order("administered_date", { ascending: false });

      if (!cancelled && !error) setRecords(data ?? []);
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [childId, refreshKey]);

  return { records, loading };
}

export function useImmunizationSchedule() {
  const [schedule, setSchedule] = useState<ImmunizationScheduleEntry[]>(DEFAULT_IMMUNIZATION_SCHEDULE);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      const client = (supabase as any) ?? null;
      if (!client) {
        setLoading(false);
        return;
      }

      const { data, error } = await client
        .from("immunization_schedule")
        .select(
          "id, vaccine_code, vaccine_name, display_name, dose_number, recommended_age_days, milestone_label, sort_order, active",
        )
        .eq("active", true)
        .order("sort_order", { ascending: true });

      if (!cancelled && !error && data?.length) {
        setSchedule(data as ImmunizationScheduleEntry[]);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { schedule, loading };
}

export function useChildImmunizationStatus(
  childId: string | null,
  dob: string | null,
  refreshKey = 0,
) {
  const { records, loading: loadingRecords } = useChildImmunizations(childId, refreshKey);
  const { schedule, loading: loadingSchedule } = useImmunizationSchedule();

  const summary = dob
    ? evaluateImmunizationStatus({
        dob,
        schedule,
        records: records.map((record) => ({
          schedule_id: record.schedule_id,
          vaccine_code: record.vaccine_code,
          administered_date: record.administered_date,
          source: record.source,
        })),
      })
    : {
        items: [] as ImmunizationStatusRow[],
        overallStatus: "not_started" as OverallImmunizationStatus,
        nextMilestone: null,
        nextDueDate: null,
        numberReceived: 0,
        numberDue: 0,
        numberOverdue: 0,
        numberUpcoming: 0,
        completionPercentage: 0,
      };

  return { ...summary, loading: loadingRecords || loadingSchedule };
}
