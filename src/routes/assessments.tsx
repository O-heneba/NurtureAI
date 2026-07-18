import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft, ChevronRight, Sparkles, AlertTriangle, ShieldCheck,
  Send, Apple, Home, Info, CheckCircle2, Loader2,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { assessRisk } from "@/lib/ai.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/assessments")({
  component: Assessments,
});

const steps = [
  "General", "Vitals", "Symptoms", "Pregnancy", "Child health",
  "Nutrition", "Risk factors", "Summary",
];

type AIResultShape = {
  risk_level?: string;
  risk_score?: number;
  summary?: string;
  contributing_factors?: string[];
  recommended_actions?: string[];
  referral?: { recommended?: boolean; urgency?: string; facility_type?: string; reason?: string };
  nutrition_advice?: string;
  home_care?: string;
  disclaimer?: string;
};

function Assessments() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState<AIResultShape | null>(null);
  const [loading, setLoading] = useState(false);
  const callAssess = useServerFn(assessRisk);

  async function submit() {
    setLoading(true);
    try {
      const result = await callAssess({
        data: {
          assessmentType: "anc",
          patient: { name: "Ama Nyarko", age: 24, sex: "female", community: "Atonsu", visitType: "anc" },
          vitals: { temperature_c: 37.2, bp: "142/92", pulse: 92, spo2: 98, weight_kg: 64, height_cm: 162 },
          symptoms: ["Headache", "Swelling of feet", "Blurred vision"],
          pregnancy: { gestation_weeks: 32, gravida_para: "G2 P1", anc_visits: 3, edd: "2026-01-04" },
          nutrition: ["Access to clean water"],
          riskFactors: ["Age <18 or >35", "Long distance to facility"],
          notes: "Reports headaches and mild swelling for 4 days.",
        },
      });
      setSubmitted(result as AIResultShape);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI analysis failed");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) return <AIResult result={submitted} onNew={() => { setSubmitted(null); setStep(0); }} />;

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <AppLayout>
      <PageHeader
        title="New Assessment"
        description="Complete the multi-step wizard for AI-assisted risk analysis"
      />

      <Card className="rounded-xl">
        <CardContent className="p-6">
          <div className="mb-6">
            <div className="flex justify-between mb-2 text-xs">
              <span className="font-semibold">Step {step + 1} of {steps.length}</span>
              <span className="text-muted-foreground">{steps[step]}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="min-h-[320px]">
            {step === 0 && <General />}
            {step === 1 && <Vitals />}
            {step === 2 && <Symptoms />}
            {step === 3 && <Pregnancy />}
            {step === 4 && <ChildQ />}
            {step === 5 && <Nutrition />}
            {step === 6 && <RiskFactors />}
            {step === 7 && <Summary />}
          </div>

          <div className="flex justify-between mt-6 pt-6 border-t">
            <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep(step + 1)}>
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={loading} className="bg-primary">
                {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
                {loading ? "Analyzing…" : "Submit for AI analysis"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label>{label}</Label>{children}</div>;
}

function General() {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label="Patient"><Input defaultValue="Ama Nyarko" /></Field>
      <Field label="Age"><Input type="number" defaultValue={24} /></Field>
      <Field label="Community"><Input defaultValue="Atonsu" /></Field>
      <Field label="Visit type">
        <Select defaultValue="anc"><SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="anc">Antenatal (ANC)</SelectItem>
            <SelectItem value="pnc">Postnatal (PNC)</SelectItem>
            <SelectItem value="child">Child health</SelectItem>
            <SelectItem value="general">General</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}
function Vitals() {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label="Temperature (°C)"><Input type="number" step="0.1" defaultValue={37.2} /></Field>
      <Field label="Blood pressure"><Input defaultValue="142/92" /></Field>
      <Field label="Pulse (bpm)"><Input type="number" defaultValue={92} /></Field>
      <Field label="SpO₂ (%)"><Input type="number" defaultValue={98} /></Field>
      <Field label="Weight (kg)"><Input type="number" step="0.1" defaultValue={64} /></Field>
      <Field label="Height (cm)"><Input type="number" defaultValue={162} /></Field>
    </div>
  );
}
function Symptoms() {
  const list = ["Headache", "Blurred vision", "Swelling of feet", "Fever", "Cough", "Abdominal pain", "Bleeding", "Fatigue"];
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">Check any symptoms the patient reports.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {list.map((s) => (
          <label key={s} className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-accent/40">
            <Checkbox defaultChecked={["Headache", "Swelling of feet", "Blurred vision"].includes(s)} />
            <span className="text-sm">{s}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
function Pregnancy() {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label="Gestation (weeks)"><Input type="number" defaultValue={32} /></Field>
      <Field label="Gravida / Para"><Input defaultValue="G2 P1" /></Field>
      <Field label="ANC visits completed"><Input type="number" defaultValue={3} /></Field>
      <Field label="Expected delivery date"><Input type="date" defaultValue="2026-01-04" /></Field>
      <Field label="Notes"><Textarea rows={3} defaultValue="Reports headaches and mild swelling for 4 days." /></Field>
    </div>
  );
}
function ChildQ() {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label="Child weight (kg)"><Input type="number" step="0.1" placeholder="—" /></Field>
      <Field label="Child height (cm)"><Input type="number" placeholder="—" /></Field>
      <Field label="Immunizations up to date">
        <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent><SelectItem value="y">Yes</SelectItem><SelectItem value="n">No</SelectItem></SelectContent>
        </Select>
      </Field>
      <Field label="Feeding pattern"><Input placeholder="e.g. exclusive breastfeeding" /></Field>
    </div>
  );
}
function Nutrition() {
  const items = ["Iron/folate compliance", "Adequate protein intake", "Fruits & vegetables daily", "Access to clean water"];
  return (
    <div className="space-y-3">
      {items.map((i) => (
        <label key={i} className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-accent/40">
          <Checkbox defaultChecked={i === "Access to clean water"} />
          <span className="text-sm">{i}</span>
        </label>
      ))}
    </div>
  );
}
function RiskFactors() {
  const items = ["Previous complications", "Multiple pregnancies", "Age <18 or >35", "Chronic conditions", "Long distance to facility", "Financial hardship"];
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {items.map((i) => (
        <label key={i} className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-accent/40">
          <Checkbox defaultChecked={["Age <18 or >35", "Long distance to facility"].includes(i)} />
          <span className="text-sm">{i}</span>
        </label>
      ))}
    </div>
  );
}
function Summary() {
  return (
    <div>
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20 mb-4">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm">
          Review the assessment before submitting. The AI will analyze vitals, symptoms and risk factors
          to generate a clinical summary and recommendations.
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Patient</div><div className="font-medium">Ama Nyarko · 24y</div></div>
        <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Visit</div><div className="font-medium">ANC · Gestation 32w</div></div>
        <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Vitals</div><div className="font-medium">BP 142/92 · Temp 37.2</div></div>
        <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Symptoms</div><div className="font-medium">Headache · Swelling · Blurred vision</div></div>
      </div>
    </div>
  );
}

function AIResult({ result, onNew }: { result: AIResultShape; onNew: () => void }) {
  const level = (result.risk_level ?? "moderate").toLowerCase();
  const score = typeof result.risk_score === "number" ? Math.max(0, Math.min(100, result.risk_score)) : 50;
  const tone =
    level === "critical" || level === "high"
      ? { grad: "from-destructive/10 to-warning/10", ring: "border-destructive/20", chip: "text-destructive", pill: "bg-destructive text-destructive-foreground", label: "High risk detected" }
      : level === "moderate"
      ? { grad: "from-warning/10 to-info/10", ring: "border-warning/20", chip: "text-warning", pill: "bg-warning text-warning-foreground", label: "Moderate risk" }
      : { grad: "from-success/10 to-primary/10", ring: "border-success/20", chip: "text-success", pill: "bg-success text-success-foreground", label: "Low risk" };

  const referral = result.referral;
  const showReferral = referral?.recommended;

  return (
    <AppLayout>
      <PageHeader
        title="AI Assessment Result"
        description="AI-assisted clinical review"
        actions={<Button variant="outline" onClick={onNew}>New assessment</Button>}
      />

      <div className={cn("rounded-2xl bg-gradient-to-br border p-6 mb-6", tone.grad, tone.ring)}>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:justify-between">
          <div className="min-w-0">
            <div className={cn("flex items-center gap-2 text-xs font-semibold uppercase tracking-wide", tone.chip)}>
              <AlertTriangle className="h-4 w-4" /> {tone.label}
            </div>
            <h2 className="mt-2 text-2xl font-bold">Risk score {score} / 100</h2>
            {result.summary && (
              <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{result.summary}</p>
            )}
          </div>
          <div className={cn("grid h-20 w-20 shrink-0 place-items-center rounded-full text-2xl font-bold", tone.pill)}>
            {score}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card className="rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 font-semibold mb-3"><Sparkles className="h-4 w-4 text-primary" /> Clinical summary</div>
            <p className="text-sm leading-relaxed text-muted-foreground">{result.summary ?? "No summary returned."}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 font-semibold mb-3"><AlertTriangle className="h-4 w-4 text-warning" /> Contributing factors</div>
            <ul className="text-sm space-y-1.5 text-muted-foreground">
              {(result.contributing_factors ?? []).map((f, i) => <li key={i}>• {f}</li>)}
              {(result.contributing_factors ?? []).length === 0 && <li>• None identified</li>}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        {showReferral && (
          <Card className="rounded-xl border-destructive/30 bg-destructive/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 font-semibold mb-3 text-destructive"><Send className="h-4 w-4" /> Referral recommended</div>
              <p className="text-sm text-muted-foreground mb-3">
                {referral?.reason ?? "Refer to a higher-level facility."} {referral?.facility_type && <>Facility: <span className="font-medium text-foreground">{referral.facility_type}</span>.</>} Priority:{" "}
                <span className="font-semibold text-destructive">{referral?.urgency ?? "urgent"}</span>.
              </p>
              <Button size="sm" variant="destructive" className="rounded-lg">Create referral</Button>
            </CardContent>
          </Card>
        )}
        <Card className="rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 font-semibold mb-3"><ShieldCheck className="h-4 w-4 text-primary" /> Recommended actions</div>
            <ul className="text-sm space-y-1.5 text-muted-foreground">
              {(result.recommended_actions ?? []).map((a, i) => <li key={i}>• {a}</li>)}
              {(result.recommended_actions ?? []).length === 0 && <li>• Continue routine care</li>}
            </ul>
          </CardContent>
        </Card>
        {result.nutrition_advice && (
          <Card className="rounded-xl">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 font-semibold mb-3"><Apple className="h-4 w-4 text-success" /> Nutrition advice</div>
              <p className="text-sm text-muted-foreground">{result.nutrition_advice}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {result.home_care && (
        <Card className="rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 font-semibold mb-3"><Home className="h-4 w-4 text-info" /> Home care & follow-up</div>
            <p className="text-sm text-muted-foreground">{result.home_care}</p>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-accent/40 border text-xs text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
        <div>
          <strong>Medical disclaimer:</strong> {result.disclaimer ?? "This AI-generated assessment is a decision-support aid and does not replace clinical judgment. Always follow Ghana Health Service protocols and refer patients when in doubt."}
        </div>
      </div>
    </AppLayout>
  );
}
