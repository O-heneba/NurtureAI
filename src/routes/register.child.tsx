import { formatDisplayDate, parseDisplayDate } from "@/lib/date-format";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Baby, CheckCircle2, Loader2, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { insertChild, insertPerson, listChildProfiles, listHouseholds, listPersons } from "@/lib/registrations";
import { childProfileStore, personStore } from "@/lib/storage/local-store";
import { syncManager } from "@/lib/storage/sync-manager";
import {
  getImmunizationScheduleForAge,
  recordVaccination,
  useImmunizationSchedule,
} from "@/lib/immunization";

export const Route = createFileRoute("/register/child")({
  validateSearch: (s: Record<string, unknown>) => ({
    person_id: typeof s.person_id === "string" ? s.person_id : undefined,
    person_name: typeof s.person_name === "string" ? s.person_name : undefined,
    person_sex: typeof s.person_sex === "string" ? s.person_sex : undefined,
    person_dob: typeof s.person_dob === "string" ? s.person_dob : undefined,
    household_id: typeof s.household_id === "string" ? s.household_id : undefined,
  }),
  component: RegisterChild,
});

const milestones = ["Head control", "Sitting", "Crawling", "Standing", "Walking", "First words"];

function RegisterChild() {
  const nav = useNavigate();
  const { person_id, person_name, person_sex, person_dob, household_id } = useSearch({
    from: "/register/child",
  });
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [v, setV] = useState<Record<string, string>>({
    nutrition: "Normal",
    bf: "Exclusive",
    existingPersonId: person_id ?? "",
    mother: "none",
    name: person_name ?? "",
    sex: person_sex ?? "unknown",
    dob: person_dob ?? "",
    household: household_id ?? "",
  });
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianRole, setGuardianRole] = useState("mother");
  const [ms, setMs] = useState<string[]>([]);
  const [historyChoice, setHistoryChoice] = useState<"yes" | "no" | "unknown">("no");
  const [immunizationHistory, setImmunizationHistory] = useState<
    Record<string, { date: string; notes: string }>
  >({});
  const [households, setHouseholds] = useState<
    Array<{ id: string; head_name: string; house_no: string }>
  >([]);
  const [mothers, setMothers] = useState<
    Array<{ id: string; full_name: string; sex: string | null }>
  >([]);
  const { schedule } = useImmunizationSchedule();
  const s = (k: string, val: string) => setV({ ...v, [k]: val });
  const relevantSchedule = useMemo(() => {
    if (!v.dob) return [];
    return getImmunizationScheduleForAge({ dob: v.dob, schedule });
  }, [v.dob, schedule]);

  const milestoneGroups = useMemo(() => {
    const groups: Record<string, typeof relevantSchedule> = {};
    for (const item of relevantSchedule) {
      const label = item.milestone_label || "Later milestones";
      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    }
    return groups;
  }, [relevantSchedule]);

  useEffect(() => {
    listHouseholds()
      .then(setHouseholds)
      .catch((e) => toast.error(e.message));
    listPersons()
      .then((p) => setMothers(p.filter((x) => x.sex !== "M")))
      .catch((e) => toast.error(e.message));
  }, []);

  function toggle(list: string[], setList: (v: string[]) => void, val: string) {
    setList(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);
  }

  function setHistoryItem(vaccineId: string, updates: Partial<{ date: string; notes: string }>) {
    setImmunizationHistory((current) => ({
      ...current,
      [vaccineId]: {
        date: current[vaccineId]?.date ?? (v.dob ? parseDisplayDate(v.dob) : ""),
        notes: current[vaccineId]?.notes ?? "",
        ...updates,
      },
    }));
  }

  async function submit() {
    if (!v.dob || !v.name) {
      toast.error("Child name and birth date are required");
      return;
    }
    if (!v.household) {
      toast.error("Select a household");
      return;
    }
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(v.dob)) {
      toast.error("Use date of birth format DD/MM/YYYY");
      return;
    }
    setSaving(true);
    let createdPersonId: string | null = null;
    let createdGuardianId: string | null = null;
    let createdChildId: string | null = null;
    try {
      const existingPeople = await listPersons();
      const existingPerson = existingPeople.find(
        (candidate) =>
          candidate.full_name.trim().toLowerCase() === v.name.trim().toLowerCase() &&
          candidate.household_id === v.household &&
          candidate.date_of_birth === parseDisplayDate(v.dob),
      );
      const person = v.existingPersonId
        ? { id: v.existingPersonId }
        : existingPerson
          ? { id: existingPerson.id }
          : await insertPerson({
            household_id: v.household,
            full_name: v.name,
            sex: v.sex || undefined,
            date_of_birth: parseDisplayDate(v.dob),
            notes: v.notes || undefined,
          });
      if (!v.existingPersonId && !existingPerson) createdPersonId = person.id;
      const existingChildren = await listChildProfiles();
      const personRecord = await personStore.get(person.id);
      const personIds = new Set([person.id, personRecord?.localId, personRecord?.remoteId].filter(Boolean));
      const existingChild = existingChildren.find((candidate) => personIds.has(candidate.person_id));
      const guardian = guardianName.trim()
        ? await insertPerson({
            household_id: v.household,
            full_name: guardianName.trim(),
            sex: guardianRole === "mother" ? "F" : guardianRole === "father" ? "M" : undefined,
            phone: guardianPhone.trim() || undefined,
          })
        : null;
      if (guardian) createdGuardianId = guardian.id;
      const growthNotes = [
        v.cw && `Current weight: ${v.cw}kg`,
        v.h && `Height: ${v.h}cm`,
        `Nutrition: ${v.nutrition}`,
        `Breastfeeding: ${v.bf}`,
        ms.length && `Milestones: ${ms.join(", ")}`,
        v.notes && `Notes: ${v.notes}`,
      ]
        .filter(Boolean)
        .join(" | ");

      const child = existingChild
        ? { id: existingChild.id }
        : await insertChild({
            person_id: person.id,
            mother_person_id: v.mother || guardian?.id || undefined,
            birth_weight_kg: v.bw ? Number(v.bw) : undefined,
            immunizations: [],
            growth_notes: growthNotes,
          });
      if (!existingChild) createdChildId = child.id;

      if (historyChoice === "yes") {
        try {
          await syncManager.syncNow();
          const syncedChild = await childProfileStore.get(child.id);
          const childId = syncedChild?.remoteId ?? child.id;
          if (!syncedChild?.remoteId) {
            throw new Error("Child saved locally, but immunization history is waiting for synchronization.");
          }
          const selected = schedule.filter((item) => immunizationHistory[item.id]);
          for (const vaccine of selected) {
            const record = immunizationHistory[vaccine.id];
            await recordVaccination({
              child_id: childId,
              schedule_id: vaccine.id,
              vaccine_code: vaccine.vaccine_code,
              administered_date: record?.date || parseDisplayDate(v.dob),
              source: "registration_history",
              notes: record?.notes || undefined,
              created_by: undefined,
            });
          }
        } catch (historyError) {
          toast.warning(
            historyError instanceof Error
              ? `Child saved, but immunization history was not recorded: ${historyError.message}`
              : "Child saved, but immunization history was not recorded.",
          );
        }
      }

      setDone(true);
      toast.success("Child registered");
    } catch (e) {
      if (createdChildId) await childProfileStore.delete(createdChildId).catch(() => undefined);
      if (createdGuardianId) await personStore.delete(createdGuardianId).catch(() => undefined);
      if (createdPersonId) await personStore.delete(createdPersonId).catch(() => undefined);
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (done)
    return (
      <AppLayout>
        <Card className="rounded-2xl max-w-lg mx-auto mt-8 card-elevated">
          <CardContent className="p-8 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-success/10 text-success mx-auto mb-4 animate-float-slow">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold">Child registered</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {v.name} has been added to the growth-monitoring register.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Link to="/child-health">
                <Button variant="outline">View child health</Button>
              </Link>
              <Button
                onClick={() => {
                  setDone(false);
                  setV({ nutrition: "Normal", bf: "Exclusive" });
                  setMs([]);
                  setImmunizationHistory({});
                  setHistoryChoice("no");
                }}
              >
                Register another
              </Button>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );

  return (
    <AppLayout>
      <PageHeader
        title="Register child"
        description="Add a child under 5 to the growth-monitoring register"
        icon={<Baby className="h-5 w-5" />}
        breadcrumbs={[{ label: "Child Health", to: "/child-health" }, { label: "Register" }]}
      />
      <Card className="rounded-xl max-w-3xl">
        <CardContent className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            {v.existingPersonId && (
              <div className="sm:col-span-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                <div className="font-semibold text-primary">Continuing with person</div>
                <div className="mt-1 font-medium">{v.name}</div>
                <div className="text-xs text-muted-foreground">
                  {v.sex || "Sex not recorded"} · DOB {v.dob || "Not recorded"}
                </div>
              </div>
            )}
            <Field label="Child name" required className="sm:col-span-2">
              <Input
                value={v.name ?? ""}
                onChange={(e) => s("name", e.target.value)}
                placeholder="e.g. Kojo Nti"
                maxLength={60}
              />
            </Field>
            <Field label="Household" required>
              <Select value={v.household} onValueChange={(x) => s("household", x)}>
                <SelectTrigger>
                  <SelectValue placeholder={households.length ? "Select household" : "Loading…"} />
                </SelectTrigger>
                <SelectContent>
                  {households.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.head_name} ({h.house_no})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Mother or father/guardian (optional)">
              <Select value={v.mother || "none"} onValueChange={(x) => s("mother", x === "none" ? "" : x)}>
                <SelectTrigger>
                  <SelectValue placeholder={mothers.length ? "Select mother" : "Loading…"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not recorded</SelectItem>
                  {mothers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Add mother/father/guardian if not found">
              <Input
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                placeholder="Full name"
              />
            </Field>
            <Field label="Guardian phone number">
              <Input
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                placeholder="Phone number"
              />
            </Field>
            <Field label="Relationship">
              <Select value={guardianRole} onValueChange={setGuardianRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mother">Mother</SelectItem>
                  <SelectItem value="father">Father</SelectItem>
                  <SelectItem value="guardian">Guardian</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Birth date" required>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="DD/MM/YYYY"
                  inputMode="numeric"
                  value={v.dob ?? ""}
                  onChange={(e) => s("dob", e.target.value)}
                />
                <Input
                  type="date"
                  aria-label="Pick birth date from calendar"
                  className="w-12 shrink-0 px-2"
                  value={
                    parseDisplayDate(v.dob ?? "").match(/^\d{4}-\d{2}-\d{2}$/)
                      ? parseDisplayDate(v.dob ?? "")
                      : ""
                  }
                  onChange={(e) => s("dob", formatDisplayDate(e.target.value))}
                />
              </div>
            </Field>
            <Field label="Sex">
              <Select value={v.sex || "unknown"} onValueChange={(x) => s("sex", x === "unknown" ? "" : x)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">Not recorded</SelectItem>
                  <SelectItem value="F">Female</SelectItem>
                  <SelectItem value="M">Male</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Birth weight (kg)">
              <Input
                type="number"
                step="0.1"
                value={v.bw ?? ""}
                onChange={(e) => s("bw", e.target.value)}
              />
            </Field>
            <Field label="Current weight (kg)">
              <Input
                type="number"
                step="0.1"
                value={v.cw ?? ""}
                onChange={(e) => s("cw", e.target.value)}
              />
            </Field>
            <Field label="Height (cm)">
              <Input type="number" value={v.h ?? ""} onChange={(e) => s("h", e.target.value)} />
            </Field>
            <Field label="Nutrition status">
              <Select value={v.nutrition} onValueChange={(x) => s("nutrition", x)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Normal", "Underweight", "Wasting", "Stunting"].map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Breastfeeding status">
              <Select value={v.bf} onValueChange={(x) => s("bf", x)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Exclusive", "Partial", "Weaned", "Not breastfed"].map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div>
            <Label className="mb-2 block">Development milestones achieved</Label>
            <div className="grid sm:grid-cols-2 gap-2">
              {milestones.map((m) => (
                <label
                  key={m}
                  className="flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer hover:bg-accent/40"
                >
                  <Checkbox checked={ms.includes(m)} onCheckedChange={() => toggle(ms, setMs, m)} />
                  <span className="text-sm">{m}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Previous Immunization History</Label>
            <div className="mb-3 flex flex-wrap gap-2">
              {(["yes", "no", "unknown"] as const).map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant={historyChoice === option ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setHistoryChoice(option)}
                >
                  {option === "yes" ? "Yes" : option === "no" ? "No" : "Unknown"}
                </Button>
              ))}
            </div>

            {historyChoice === "yes" && (
              <div className="space-y-4">
                {relevantSchedule.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No age-appropriate immunizations are available for this child yet.
                  </p>
                )}

                {Object.entries(milestoneGroups).map(([groupLabel, groupItems]) => (
                  <div key={groupLabel} className="rounded-xl border p-3">
                    <div className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                      {groupLabel}
                    </div>
                    <div className="space-y-3">
                      {groupItems.map((vaccine) => {
                        const entry = immunizationHistory[vaccine.id] ?? {
                          date: parseDisplayDate(v.dob ?? ""),
                          notes: "",
                        };
                        return (
                          <div
                            key={vaccine.id}
                            className="rounded-lg border bg-background p-3"
                          >
                            <div className="mb-2 flex items-center gap-3">
                              <Checkbox
                                checked={Boolean(immunizationHistory[vaccine.id])}
                                onCheckedChange={(checked) => {
                                  if (checked === true) {
                                    setHistoryItem(vaccine.id, { date: entry.date || parseDisplayDate(v.dob ?? "") });
                                  } else {
                                    setImmunizationHistory((current) => {
                                      const next = { ...current };
                                      delete next[vaccine.id];
                                      return next;
                                    });
                                  }
                                }}
                              />
                              <span className="text-sm font-medium">{vaccine.display_name}</span>
                            </div>
                            {immunizationHistory[vaccine.id] && (
                              <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
                                <Input
                                  type="date"
                                  value={entry.date ?? ""}
                                  onChange={(e) => setHistoryItem(vaccine.id, { date: e.target.value })}
                                />
                                <Input
                                  value={entry.notes ?? ""}
                                  onChange={(e) => setHistoryItem(vaccine.id, { notes: e.target.value })}
                                  placeholder="Optional notes"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Field label="Medical notes">
            <Textarea
              rows={3}
              value={v.notes ?? ""}
              onChange={(e) => s("notes", e.target.value)}
              maxLength={400}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => nav({ to: "/child-health" })}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1 h-4 w-4" />
              )}
              Save child
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={"grid gap-1.5 " + (className ?? "")}>
      <Label required={required}>{label}</Label>
      {children}
    </div>
  );
}
