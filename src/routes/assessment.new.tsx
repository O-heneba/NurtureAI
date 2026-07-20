import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, EmptyState, StatusPill } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft, ChevronRight, Search, User as UserIcon, ShieldAlert,
  Loader2, Sparkles, Save, Send, CheckCircle2, AlertTriangle, Info,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { analyzeAssessment } from "@/lib/ai.functions";
import {
  ASSESSMENT_META, DANGER_SIGNS, PRIORITY_META, SECTIONS, CONSENT_TEXT,
  runRules, validate,
  type AssessmentType, type Priority, type RulesOutput,
} from "@/lib/assessment-engine";
import {
  saveDraft, submitAssessment, searchPersons, listAssessmentsForPerson,
} from "@/lib/assessments";

export const Route = createFileRoute("/assessment/new")({
  component: NewAssessment,
});

type Person = {
  id: string;
  full_name: string;
  sex: string | null;
  date_of_birth: string | null;
  household_id: string | null;
};

type WizardStep = "person" | "type" | "consent" | "danger" | "form" | "review";

const ORDER: WizardStep[] = ["person", "type", "consent", "danger", "form", "review"];
const STEP_LABEL: Record<WizardStep, string> = {
  person: "Select person",
  type: "Assessment type",
  consent: "Privacy & consent",
  danger: "Danger sign screening",
  form: "Structured assessment",
  review: "Review & submit",
};

function calcAge(dob: string | null): string {
  if (!dob) return "—";
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (months < 24) return `${months} months`;
  return `${Math.floor(months / 12)}y`;
}

function NewAssessment() {
  const navigate = useNavigate();
  const analyze = useServerFn(analyzeAssessment);

  const [step, setStep] = useState<WizardStep>("person");
  const [person, setPerson] = useState<Person | null>(null);
  const [type, setType] = useState<AssessmentType | null>(null);
  const [consent, setConsent] = useState(false);
  const [dangerSigns, setDangerSigns] = useState<string[]>([]);
  const [data, setData] = useState<Record<string, any>>({});
  const [previous, setPrevious] = useState<any | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  const rules: RulesOutput | null = useMemo(() => {
    if (!type) return null;
    return runRules(type, data, dangerSigns);
  }, [type, data, dangerSigns]);

  const validationIssues = useMemo(() => (type ? validate(type, data) : []), [type, data]);
  const errors = validationIssues.filter((i) => i.level === "error");

  const canNext = (() => {
    switch (step) {
      case "person": return !!person;
      case "type": return !!type;
      case "consent": return consent;
      case "danger": return true;
      case "form": return errors.length === 0;
      case "review": return true;
    }
  })();

  function goto(delta: number) {
    const idx = ORDER.indexOf(step);
    const next = ORDER[idx + delta];
    if (next) setStep(next);
  }

  async function onPickPerson(p: Person) {
    setPerson(p);
    try {
      const prior = await listAssessmentsForPerson(p.id);
      if (prior.length > 0) {
        const latest = prior[0];
        setPrevious({
          date: latest.created_at,
          type: latest.assessment_type,
          priority: latest.inputs?.priority ?? null,
          risk_level: latest.risk_level,
          summary: latest.summary,
        });
      } else {
        setPrevious(null);
      }
    } catch {
      setPrevious(null);
    }
  }

  async function onSaveDraft() {
    if (!type || !person) return;
    setSavingDraft(true);
    try {
      const row = await saveDraft({
        id: draftId ?? undefined,
        person_id: person.id,
        assessment_type: type,
        inputs: {
          person: { id: person.id, full_name: person.full_name, sex: person.sex, dob: person.date_of_birth },
          consent_given: consent,
          danger_signs: dangerSigns,
          sections: data,
          previous_snapshot: previous ?? null,
        },
      });
      setDraftId(row.id);
      toast.success("Draft saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save draft");
    } finally {
      setSavingDraft(false);
    }
  }

  async function onSubmit() {
    if (!type || !person || !rules) return;
    if (!consent) { toast.error("Consent is required before submission."); return; }
    if (errors.length > 0) { toast.error("Please fix validation errors first."); return; }

    setSubmitting(true);
    try {
      const ai = await analyze({
        data: {
          assessment_type: type,
          person: { full_name: person.full_name, sex: person.sex, dob: person.date_of_birth, age_display: calcAge(person.date_of_birth) },
          danger_signs: dangerSigns,
          sections: data,
          rules: { priority: rules.priority, flags: rules.flags, missing: rules.missing },
          previous: previous ?? undefined,
        },
      });

      const row = await submitAssessment({
        id: draftId ?? undefined,
        person_id: person.id,
        assessment_type: type,
        inputs: {
          person: { id: person.id, full_name: person.full_name, sex: person.sex, dob: person.date_of_birth },
          consent_given: true,
          consent_at: new Date().toISOString(),
          danger_signs: dangerSigns,
          sections: data,
          rules,
          previous_snapshot: previous ?? null,
        },
        ai_result: ai,
        priority: rules.priority,
      });

      toast.success("Assessment submitted");
      navigate({ to: "/assessment/$id", params: { id: row.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  const stepIdx = ORDER.indexOf(step);
  const progress = ((stepIdx + 1) / ORDER.length) * 100;

  return (
    <AppLayout>
      <PageHeader
        title="New assessment"
        description="Modular field assessment with rule-based safety checks and AI decision support"
        breadcrumbs={[{ label: "Assessments", to: "/assessments" }, { label: "New" }]}
        actions={
          person && type ? (
            <Button variant="outline" onClick={onSaveDraft} disabled={savingDraft}>
              {savingDraft ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
              Save draft
            </Button>
          ) : null
        }
      />

      <Card className="rounded-xl">
        <CardContent className="p-6">
          <div className="mb-6">
            <div className="flex justify-between mb-2 text-xs">
              <span className="font-semibold">Step {stepIdx + 1} of {ORDER.length}</span>
              <span className="text-muted-foreground">{STEP_LABEL[step]}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="min-h-[360px]">
            {step === "person" && <PersonStep person={person} onPick={onPickPerson} previous={previous} />}
            {step === "type" && <TypeStep person={person} type={type} onPick={setType} />}
            {step === "consent" && <ConsentStep person={person} consent={consent} setConsent={setConsent} />}
            {step === "danger" && type && (
              <DangerStep type={type} selected={dangerSigns} onChange={setDangerSigns} rules={rules} />
            )}
            {step === "form" && type && (
              <FormStep type={type} data={data} onChange={setData} issues={validationIssues} rules={rules} />
            )}
            {step === "review" && type && person && rules && (
              <ReviewStep person={person} type={type} data={data} dangerSigns={dangerSigns} rules={rules} previous={previous} />
            )}
          </div>

          <div className="flex justify-between mt-6 pt-6 border-t">
            <Button variant="outline" disabled={stepIdx === 0} onClick={() => goto(-1)}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            {step !== "review" ? (
              <Button onClick={() => goto(1)} disabled={!canNext}>
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={onSubmit} disabled={submitting} className="bg-primary">
                {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
                {submitting ? "Analysing…" : "Submit for AI review"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}

/* ---------------- Step: person ---------------- */

function PersonStep({
  person, onPick, previous,
}: {
  person: Person | null;
  onPick: (p: Person) => void;
  previous: any | null;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Person[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      searchPersons(q)
        .then((r) => { if (!cancelled) setResults(r as Person[]); })
        .catch(() => { if (!cancelled) setResults([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground mb-3">Search and select an existing person, or register a new one.</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name…" className="pl-9" />
        </div>
      </div>

      {person && (
        <Card className="rounded-xl border-primary/30 bg-primary/5">
          <CardContent className="p-4 grid gap-2">
            <div className="flex items-center gap-2 text-sm text-primary font-semibold">
              <CheckCircle2 className="h-4 w-4" /> Selected: {person.full_name}
            </div>
            <div className="text-xs text-muted-foreground grid sm:grid-cols-3 gap-2">
              <div>Age: <span className="text-foreground font-medium">{calcAge(person.date_of_birth)}</span></div>
              <div>Sex: <span className="text-foreground font-medium">{person.sex ?? "—"}</span></div>
              <div>Previous risk: <span className="text-foreground font-medium">{previous?.risk_level ?? "None on record"}</span></div>
            </div>
            {previous && (
              <div className="text-xs text-muted-foreground mt-1 border-t pt-2">
                Last assessment: {new Date(previous.date).toLocaleDateString()} · {previous.type}
                {previous.summary && <span> — {previous.summary}</span>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="rounded-xl border overflow-hidden divide-y">
        {loading && <div className="p-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Searching…</div>}
        {!loading && results && results.length === 0 && (
          <div className="p-6">
            <EmptyState
              icon={<UserIcon className="h-6 w-6" />}
              title="No matching people"
              description="Register a new person to continue."
              action={<Link to="/register/person"><Button variant="outline">Register person</Button></Link>}
            />
          </div>
        )}
        {!loading && results?.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p)}
            className={cn(
              "flex w-full items-center gap-3 p-3 text-left hover:bg-accent/40 transition-colors",
              person?.id === p.id && "bg-primary/5",
            )}
          >
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary font-semibold">
              {p.full_name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{p.full_name}</div>
              <div className="text-xs text-muted-foreground">{calcAge(p.date_of_birth)} · {p.sex ?? "—"}</div>
            </div>
            {person?.id === p.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
          </button>
        ))}
      </div>

      <div className="text-right">
        <Link to="/register/person"><Button variant="link" size="sm">+ Register new person</Button></Link>
      </div>
    </div>
  );
}

/* ---------------- Step: type ---------------- */

function TypeStep({
  person, type, onPick,
}: {
  person: Person | null;
  type: AssessmentType | null;
  onPick: (t: AssessmentType) => void;
}) {
  // Adaptive suggestions based on person data
  const isFemaleAdult = person?.sex === "F" || person?.sex === "female";
  const ageMonths = (() => {
    if (!person?.date_of_birth) return null;
    const d = new Date(person.date_of_birth);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  })();

  const recommended = new Set<AssessmentType>();
  if (ageMonths !== null && ageMonths < 1) recommended.add("newborn");
  if (ageMonths !== null && ageMonths >= 0 && ageMonths <= 60) recommended.add("child_u5");
  if (isFemaleAdult && ageMonths !== null && ageMonths >= 15 * 12 && ageMonths <= 50 * 12) recommended.add("maternal");
  recommended.add("nutrition");
  recommended.add("household");
  recommended.add("followup");

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Choose the assessment pathway. Suggested options for this person are highlighted.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {(Object.keys(ASSESSMENT_META) as AssessmentType[]).map((k) => {
          const m = ASSESSMENT_META[k];
          const suggested = recommended.has(k);
          const selected = type === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => onPick(k)}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 text-left transition-all hover:border-primary/40 hover:bg-accent/30",
                selected && "border-primary bg-primary/5 ring-2 ring-primary/20",
              )}
            >
              <div className="text-2xl">{m.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{m.label}</span>
                  {suggested && <StatusPill tone="primary">Suggested</StatusPill>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{m.description}</p>
              </div>
              {selected && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Step: consent ---------------- */

function ConsentStep({
  person, consent, setConsent,
}: {
  person: Person | null;
  consent: boolean;
  setConsent: (v: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Privacy & consent</AlertTitle>
        <AlertDescription className="text-sm leading-relaxed">
          {CONSENT_TEXT}
        </AlertDescription>
      </Alert>
      <label className="flex items-start gap-3 rounded-xl border p-4 cursor-pointer hover:bg-accent/30">
        <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} />
        <span className="text-sm">
          I confirm that <strong>{person?.full_name ?? "the client"}</strong> (or their guardian) has been informed and consents to this assessment.
        </span>
      </label>
    </div>
  );
}

/* ---------------- Step: danger ---------------- */

function DangerStep({
  type, selected, onChange, rules,
}: {
  type: AssessmentType;
  selected: string[];
  onChange: (v: string[]) => void;
  rules: RulesOutput | null;
}) {
  const catalog = DANGER_SIGNS[type];
  const toggle = (k: string) => {
    onChange(selected.includes(k) ? selected.filter((x) => x !== k) : [...selected, k]);
  };
  const criticalHit = catalog.some((s) => s.critical && selected.includes(s.key));

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/10 border border-warning/30">
        <ShieldAlert className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div className="text-sm">
          Screen for danger signs first. Any <strong>critical</strong> sign will immediately mark the case as urgent for professional review.
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {catalog.map((s) => {
          const on = selected.includes(s.key);
          return (
            <label key={s.key} className={cn(
              "flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/40",
              on && s.critical && "border-destructive/50 bg-destructive/5",
              on && !s.critical && "border-warning/50 bg-warning/5",
            )}>
              <Checkbox checked={on} onCheckedChange={() => toggle(s.key)} />
              <div className="min-w-0">
                <div className="text-sm font-medium">{s.label}</div>
                {s.critical && <div className="text-[10px] uppercase tracking-widest text-destructive mt-0.5">Critical</div>}
              </div>
            </label>
          );
        })}
      </div>
      {criticalHit && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Urgent priority</AlertTitle>
          <AlertDescription>
            A critical danger sign has been reported. Immediate professional clinical assessment may be required. Continue the form so full context is captured for referral.
          </AlertDescription>
        </Alert>
      )}
      {rules && !criticalHit && rules.priority !== "routine" && (
        <div className="text-xs text-muted-foreground">Current rules-based priority: <strong>{PRIORITY_META[rules.priority].label}</strong></div>
      )}
    </div>
  );
}

/* ---------------- Field helpers ---------------- */

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint && !error && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      {error && <div className="text-[11px] text-destructive">{error}</div>}
    </div>
  );
}

function BoolRow({ label, value, onChange }: { label: string; value?: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/30">
      <Checkbox checked={value === true} onCheckedChange={(v) => onChange(v === true)} />
      <span className="text-sm">{label}</span>
    </label>
  );
}

function set<T extends Record<string, any>>(obj: T, key: string, value: any): T {
  return { ...obj, [key]: value };
}

/* ---------------- Step: form (per type) ---------------- */

function FormStep({
  type, data, onChange, issues, rules,
}: {
  type: AssessmentType;
  data: Record<string, any>;
  onChange: (d: Record<string, any>) => void;
  issues: { field: string; message: string; level: "error" | "warn" }[];
  rules: RulesOutput | null;
}) {
  const err = (f: string) => issues.find((i) => i.field === f && i.level === "error")?.message;
  const upd = (k: string, v: any) => onChange(set(data, k, v));

  return (
    <div className="space-y-6">
      {rules && rules.priority !== "routine" && (
        <div className="rounded-xl border bg-accent/30 p-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Live rules preview</div>
          <div className="text-sm">Current priority: <strong>{PRIORITY_META[rules.priority].label}</strong></div>
          {rules.flags.length > 0 && (
            <ul className="mt-2 text-xs space-y-1 text-muted-foreground">
              {rules.flags.map((f) => <li key={f.code}>• {f.message}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="space-y-6">
        {SECTIONS[type].map((sec) => (
          <section key={sec.key}>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-widest">{sec.title}</h3>
            {sec.key === "notes" && (
              <Textarea rows={3} value={data.notes ?? ""} onChange={(e) => upd("notes", e.target.value)} placeholder="Free-text observations…" />
            )}

            {type === "maternal" && sec.key === "pregnancy" && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Gestational age (weeks)" error={err("gestation_weeks")}>
                  <Input type="number" value={data.gestation_weeks ?? ""} onChange={(e) => upd("gestation_weeks", e.target.value)} />
                </Field>
                <Field label="ANC visits completed">
                  <Input type="number" value={data.anc_visits ?? ""} onChange={(e) => upd("anc_visits", e.target.value)} />
                </Field>
                <Field label="Gravida / Para">
                  <Input value={data.gravida_para ?? ""} onChange={(e) => upd("gravida_para", e.target.value)} placeholder="e.g. G2 P1" />
                </Field>
                <Field label="Expected delivery date">
                  <Input type="date" value={data.edd ?? ""} onChange={(e) => upd("edd", e.target.value)} />
                </Field>
              </div>
            )}
            {type === "maternal" && sec.key === "vitals" && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Blood pressure" hint="Format: systolic/diastolic e.g. 120/80" error={err("blood_pressure")}>
                  <Input value={data.blood_pressure ?? ""} onChange={(e) => upd("blood_pressure", e.target.value)} placeholder="120/80" />
                </Field>
                <Field label="Temperature (°C)" error={err("temperature_c")}>
                  <Input type="number" step="0.1" value={data.temperature_c ?? ""} onChange={(e) => upd("temperature_c", e.target.value)} />
                </Field>
                <Field label="Pulse (bpm)">
                  <Input type="number" value={data.pulse ?? ""} onChange={(e) => upd("pulse", e.target.value)} />
                </Field>
                <Field label="Weight (kg)">
                  <Input type="number" step="0.1" value={data.weight_kg ?? ""} onChange={(e) => upd("weight_kg", e.target.value)} />
                </Field>
              </div>
            )}
            {type === "maternal" && sec.key === "symptoms" && (
              <div className="grid sm:grid-cols-2 gap-2">
                {["headache", "swelling", "blurred_vision", "fever", "cough", "abdominal_pain", "bleeding", "fatigue"].map((s) => (
                  <BoolRow key={s} label={s.replace(/_/g, " ")} value={data[`sym_${s}`]} onChange={(v) => upd(`sym_${s}`, v)} />
                ))}
              </div>
            )}
            {type === "maternal" && sec.key === "medical" && (
              <Textarea rows={2} value={data.medical_history ?? ""} onChange={(e) => upd("medical_history", e.target.value)} placeholder="Chronic conditions, prior complications…" />
            )}
            {type === "maternal" && sec.key === "social" && (
              <div className="grid sm:grid-cols-2 gap-2">
                <BoolRow label="Long distance to facility" value={data.long_distance} onChange={(v) => upd("long_distance", v)} />
                <BoolRow label="Financial hardship" value={data.financial_hardship} onChange={(v) => upd("financial_hardship", v)} />
                <BoolRow label="No support at home" value={data.no_support} onChange={(v) => upd("no_support", v)} />
                <BoolRow label="Access to clean water" value={data.clean_water} onChange={(v) => upd("clean_water", v)} />
              </div>
            )}

            {type === "newborn" && sec.key === "birth" && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Age (days)" error={err("age_days")}>
                  <Input type="number" value={data.age_days ?? ""} onChange={(e) => upd("age_days", e.target.value)} />
                </Field>
                <Field label="Birth weight (kg)" error={err("birth_weight_kg")}>
                  <Input type="number" step="0.1" value={data.birth_weight_kg ?? ""} onChange={(e) => upd("birth_weight_kg", e.target.value)} />
                </Field>
                <Field label="Place of birth">
                  <Select value={data.place_of_birth ?? ""} onValueChange={(v) => upd("place_of_birth", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facility">Health facility</SelectItem>
                      <SelectItem value="home">Home</SelectItem>
                      <SelectItem value="tba">TBA</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Delivery mode">
                  <Select value={data.delivery_mode ?? ""} onValueChange={(v) => upd("delivery_mode", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="svd">Spontaneous vaginal</SelectItem>
                      <SelectItem value="cs">Caesarean</SelectItem>
                      <SelectItem value="assisted">Assisted vaginal</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            )}
            {type === "newborn" && sec.key === "vitals" && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Temperature (°C)">
                  <Input type="number" step="0.1" value={data.temperature_c ?? ""} onChange={(e) => upd("temperature_c", e.target.value)} />
                </Field>
                <Field label="Feeding">
                  <Select value={data.feeding ?? ""} onValueChange={(v) => upd("feeding", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exclusive_bf">Exclusive breastfeeding</SelectItem>
                      <SelectItem value="mixed">Mixed feeding</SelectItem>
                      <SelectItem value="formula">Formula only</SelectItem>
                      <SelectItem value="not_feeding">Not feeding well</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            )}
            {type === "newborn" && sec.key === "exam" && (
              <div className="grid sm:grid-cols-2 gap-2">
                <BoolRow label="Cord clean & dry" value={data.cord_clean} onChange={(v) => upd("cord_clean", v)} />
                <BoolRow label="Skin colour normal" value={data.skin_normal} onChange={(v) => upd("skin_normal", v)} />
                <BoolRow label="Active & alert" value={data.active} onChange={(v) => upd("active", v)} />
                <BoolRow label="Passing urine & stool" value={data.eliminating} onChange={(v) => upd("eliminating", v)} />
              </div>
            )}
            {type === "newborn" && sec.key === "immun" && (
              <div className="grid sm:grid-cols-2 gap-2">
                <BoolRow label="BCG given" value={data.bcg} onChange={(v) => upd("bcg", v)} />
                <BoolRow label="OPV0 given" value={data.opv0} onChange={(v) => upd("opv0", v)} />
                <BoolRow label="Hep B birth dose given" value={data.hepb} onChange={(v) => upd("hepb", v)} />
              </div>
            )}

            {type === "child_u5" && sec.key === "anthro" && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Age (months)" error={err("age_months")}>
                  <Input type="number" value={data.age_months ?? ""} onChange={(e) => upd("age_months", e.target.value)} />
                </Field>
                <Field label="Weight (kg)" error={err("weight_kg")}>
                  <Input type="number" step="0.1" value={data.weight_kg ?? ""} onChange={(e) => upd("weight_kg", e.target.value)} />
                </Field>
                <Field label="Height (cm)">
                  <Input type="number" step="0.1" value={data.height_cm ?? ""} onChange={(e) => upd("height_cm", e.target.value)} />
                </Field>
                <Field label="MUAC (cm)" hint="< 11.5 SAM, 11.5–12.4 MAM">
                  <Input type="number" step="0.1" value={data.muac_cm ?? ""} onChange={(e) => upd("muac_cm", e.target.value)} />
                </Field>
              </div>
            )}
            {type === "child_u5" && sec.key === "symptoms" && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Temperature (°C)">
                  <Input type="number" step="0.1" value={data.temperature_c ?? ""} onChange={(e) => upd("temperature_c", e.target.value)} />
                </Field>
                <Field label="Cough (days)">
                  <Input type="number" value={data.cough_days ?? ""} onChange={(e) => upd("cough_days", e.target.value)} />
                </Field>
                <BoolRow label="Diarrhoea" value={data.diarrhea} onChange={(v) => upd("diarrhea", v)} />
                <BoolRow label="Vomiting" value={data.vomiting} onChange={(v) => upd("vomiting", v)} />
              </div>
            )}
            {type === "child_u5" && sec.key === "feeding" && (
              <div className="grid sm:grid-cols-2 gap-2">
                <BoolRow label="Still breastfeeding" value={data.bf} onChange={(v) => upd("bf", v)} />
                <BoolRow label="Complementary foods started" value={data.comp_food} onChange={(v) => upd("comp_food", v)} />
                <BoolRow label="Eating 3+ meals per day" value={data.meals_ok} onChange={(v) => upd("meals_ok", v)} />
              </div>
            )}
            {type === "child_u5" && sec.key === "immun" && (
              <div className="grid sm:grid-cols-2 gap-2">
                <BoolRow label="Immunizations up to date" value={data.immun_uptodate} onChange={(v) => upd("immun_uptodate", v)} />
                <BoolRow label="Developmental milestones on track" value={data.milestones_ok} onChange={(v) => upd("milestones_ok", v)} />
                <BoolRow label="Vitamin A in last 6 months" value={data.vit_a} onChange={(v) => upd("vit_a", v)} />
                <BoolRow label="Deworming in last 6 months" value={data.deworm} onChange={(v) => upd("deworm", v)} />
              </div>
            )}

            {type === "nutrition" && sec.key === "diet" && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Meals per day">
                  <Input type="number" value={data.meals_per_day ?? ""} onChange={(e) => upd("meals_per_day", e.target.value)} />
                </Field>
                <Field label="Food groups consumed yesterday" hint="Check all that apply">
                  <div className="grid grid-cols-2 gap-1.5">
                    {["Grains", "Legumes", "Dairy", "Meat/Fish", "Eggs", "Vegetables", "Fruit", "Oil"].map((g) => {
                      const arr: string[] = Array.isArray(data.food_groups) ? data.food_groups : [];
                      const on = arr.includes(g);
                      return (
                        <label key={g} className="flex items-center gap-2 text-sm">
                          <Checkbox checked={on} onCheckedChange={(v) => {
                            const next = v === true ? [...arr, g] : arr.filter((x) => x !== g);
                            upd("food_groups", next);
                          }} />
                          {g}
                        </label>
                      );
                    })}
                  </div>
                </Field>
              </div>
            )}
            {type === "nutrition" && sec.key === "security" && (
              <div className="grid sm:grid-cols-2 gap-2">
                <BoolRow label="Household reports food insecurity" value={data.food_insecure} onChange={(v) => upd("food_insecure", v)} />
                <BoolRow label="Access to clean water" value={data.clean_water} onChange={(v) => upd("clean_water", v)} />
                <BoolRow label="Access to fuel for cooking" value={data.cooking_fuel} onChange={(v) => upd("cooking_fuel", v)} />
              </div>
            )}
            {type === "nutrition" && sec.key === "special" && (
              <div className="grid sm:grid-cols-2 gap-2">
                <BoolRow label="Pregnant / breastfeeding" value={data.preg_bf} onChange={(v) => upd("preg_bf", v)} />
                <BoolRow label="Iron/folate supplement taken" value={data.iron_folate} onChange={(v) => upd("iron_folate", v)} />
                <BoolRow label="Iodized salt used" value={data.iodized_salt} onChange={(v) => upd("iodized_salt", v)} />
              </div>
            )}

            {type === "household" && sec.key === "composition" && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Number of household members">
                  <Input type="number" value={data.members ?? ""} onChange={(e) => upd("members", e.target.value)} />
                </Field>
                <Field label="Children under 5">
                  <Input type="number" value={data.under5 ?? ""} onChange={(e) => upd("under5", e.target.value)} />
                </Field>
              </div>
            )}
            {type === "household" && sec.key === "wash" && (
              <div className="grid sm:grid-cols-2 gap-2">
                <BoolRow label="No safe water access" value={data.no_safe_water} onChange={(v) => upd("no_safe_water", v)} />
                <BoolRow label="No functional latrine" value={data.no_latrine} onChange={(v) => upd("no_latrine", v)} />
                <BoolRow label="Hand-washing facilities available" value={data.handwash} onChange={(v) => upd("handwash", v)} />
                <BoolRow label="Bed nets used consistently" value={data.bednets} onChange={(v) => upd("bednets", v)} />
              </div>
            )}
            {type === "household" && sec.key === "access" && (
              <div className="grid sm:grid-cols-2 gap-2">
                <BoolRow label="Long distance to facility (>1h)" value={data.long_distance} onChange={(v) => upd("long_distance", v)} />
                <BoolRow label="Financial barriers to care" value={data.financial_hardship} onChange={(v) => upd("financial_hardship", v)} />
              </div>
            )}
            {type === "household" && sec.key === "concerns" && (
              <Textarea rows={3} value={data.concerns ?? ""} onChange={(e) => upd("concerns", e.target.value)} placeholder="Health concerns raised by the household…" />
            )}

            {type === "followup" && sec.key === "previous" && (
              <Textarea rows={2} value={data.prior_summary ?? ""} onChange={(e) => upd("prior_summary", e.target.value)} placeholder="Brief note of previous assessment findings…" />
            )}
            {type === "followup" && sec.key === "progress" && (
              <div className="grid sm:grid-cols-2 gap-2">
                <BoolRow label="Recommendations followed" value={data.recommendations_followed} onChange={(v) => upd("recommendations_followed", v)} />
                <BoolRow label="Condition improved" value={data.condition_improved} onChange={(v) => upd("condition_improved", v)} />
                <BoolRow label="Condition unchanged" value={data.condition_same} onChange={(v) => upd("condition_same", v)} />
                <BoolRow label="Condition worsened" value={data.condition_worsened} onChange={(v) => upd("condition_worsened", v)} />
              </div>
            )}
            {type === "followup" && sec.key === "current" && (
              <Textarea rows={3} value={data.current_condition ?? ""} onChange={(e) => upd("current_condition", e.target.value)} placeholder="Describe current condition and any new symptoms…" />
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Step: review ---------------- */

function ReviewStep({
  person, type, data, dangerSigns, rules, previous,
}: {
  person: Person;
  type: AssessmentType;
  data: Record<string, any>;
  dangerSigns: string[];
  rules: RulesOutput;
  previous: any | null;
}) {
  const meta = ASSESSMENT_META[type];
  const pr = PRIORITY_META[rules.priority];
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">Client</div>
          <div className="font-medium">{person.full_name}</div>
          <div className="text-xs text-muted-foreground">{calcAge(person.date_of_birth)} · {person.sex ?? "—"}</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">Assessment</div>
          <div className="font-medium">{meta.label}</div>
          <div className="text-xs text-muted-foreground">{meta.description}</div>
        </div>
      </div>

      <div className={cn(
        "rounded-xl border p-4",
        pr.tone === "destructive" && "border-destructive/40 bg-destructive/5",
        pr.tone === "warning" && "border-warning/40 bg-warning/5",
        pr.tone === "info" && "border-info/40 bg-info/5",
        pr.tone === "success" && "border-success/40 bg-success/5",
      )}>
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Rules-based priority</div>
        <div className="text-lg font-bold mt-1">{pr.label}</div>
        <div className="text-xs text-muted-foreground mt-1">{pr.description}</div>
        {rules.flags.length > 0 && (
          <ul className="mt-3 text-sm space-y-1">{rules.flags.map((f) => <li key={f.code}>• {f.message}</li>)}</ul>
        )}
      </div>

      {dangerSigns.length > 0 && (
        <div className="rounded-xl border p-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Danger signs reported</div>
          <ul className="text-sm space-y-1">
            {DANGER_SIGNS[type].filter((s) => dangerSigns.includes(s.key)).map((s) => (
              <li key={s.key}>• {s.label}{s.critical && <span className="text-destructive ml-2 text-xs uppercase tracking-widest">critical</span>}</li>
            ))}
          </ul>
        </div>
      )}

      {rules.missing.length > 0 && (
        <div className="rounded-xl border p-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Missing information</div>
          <ul className="text-sm space-y-1 text-muted-foreground">{rules.missing.map((m) => <li key={m}>• {m}</li>)}</ul>
        </div>
      )}

      {previous && (
        <div className="rounded-xl border p-4 bg-accent/20">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Previous assessment</div>
          <div className="text-sm">{new Date(previous.date).toLocaleDateString()} · {previous.type} · {previous.risk_level ?? "—"}</div>
          {previous.summary && <div className="text-xs text-muted-foreground mt-1">{previous.summary}</div>}
        </div>
      )}

      <details className="rounded-xl border p-4">
        <summary className="text-sm font-medium cursor-pointer">Recorded data ({Object.keys(data).length} fields)</summary>
        <pre className="text-[11px] mt-3 whitespace-pre-wrap text-muted-foreground max-h-64 overflow-auto">{JSON.stringify(data, null, 2)}</pre>
      </details>

      <div className="text-xs text-muted-foreground">
        Submitting will run AI-assisted review. The AI provides decision support only — clinical judgment stays with the health worker.
      </div>
    </div>
  );
}
