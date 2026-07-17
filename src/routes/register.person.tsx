import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Save, Users } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { households } from "@/lib/demo-data";

export const Route = createFileRoute("/register/person")({
  component: RegisterPerson,
});

const schema = z.object({
  firstName: z.string().trim().min(1).max(40),
  lastName: z.string().trim().min(1).max(40),
  gender: z.enum(["F", "M"], { message: "Select gender" }),
  dob: z.string().min(1, "Date of birth required"),
  phone: z.string().trim().max(20).optional(),
  nationalId: z.string().trim().max(30).optional(),
  relationship: z.string().min(1),
  household: z.string().min(1, "Select a household"),
  occupation: z.string().max(60).optional(),
  education: z.string().max(60).optional(),
  marital: z.string().max(20).optional(),
  emergency: z.string().max(120).optional(),
  medical: z.string().max(400).optional(),
});

function RegisterPerson() {
  const nav = useNavigate();
  const [v, setV] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const s = (k: string, val: string) => setV({ ...v, [k]: val });

  function submit() {
    const r = schema.safeParse(v);
    if (!r.success) {
      const e: Record<string, string> = {};
      r.error.issues.forEach((i) => { e[i.path[0] as string] = i.message; });
      setErrors(e);
      toast.error("Please fix the highlighted fields");
      return;
    }
    setErrors({});
    setDone(true);
    toast.success("Person registered");
  }

  if (done) {
    return (
      <AppLayout>
        <Card className="rounded-2xl max-w-lg mx-auto mt-8 card-elevated">
          <CardContent className="p-8 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-success/10 text-success mx-auto mb-4 animate-float-slow"><CheckCircle2 className="h-8 w-8" /></div>
            <h2 className="text-2xl font-bold">Person registered</h2>
            <p className="mt-2 text-sm text-muted-foreground">{v.firstName} {v.lastName} has been added to the {v.household} household.</p>
            <div className="mt-6 flex justify-center gap-2">
              <Link to="/people"><Button variant="outline">View people</Button></Link>
              <Button onClick={() => { setDone(false); setV({}); }}>Register another</Button>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Register person" description="Add a new individual to a household" icon={<Users className="h-5 w-5" />} breadcrumbs={[{ label: "People", to: "/people" }, { label: "Register" }]} />

      <Card className="rounded-xl max-w-3xl">
        <CardContent className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="First name" error={errors.firstName}><Input value={v.firstName ?? ""} onChange={(e) => s("firstName", e.target.value)} maxLength={40} /></Field>
            <Field label="Last name" error={errors.lastName}><Input value={v.lastName ?? ""} onChange={(e) => s("lastName", e.target.value)} maxLength={40} /></Field>
            <Field label="Gender" error={errors.gender}>
              <Select value={v.gender} onValueChange={(x) => s("gender", x)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="F">Female</SelectItem><SelectItem value="M">Male</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="Date of birth" error={errors.dob}><Input type="date" value={v.dob ?? ""} onChange={(e) => s("dob", e.target.value)} /></Field>
            <Field label="Phone number" error={errors.phone}><Input value={v.phone ?? ""} onChange={(e) => s("phone", e.target.value)} placeholder="+233…" /></Field>
            <Field label="National ID (placeholder)"><Input value={v.nationalId ?? ""} onChange={(e) => s("nationalId", e.target.value)} placeholder="GHA-XXXXXXXXX-X" /></Field>
            <Field label="Relationship" error={errors.relationship}>
              <Select value={v.relationship} onValueChange={(x) => s("relationship", x)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{["Head", "Spouse", "Child", "Parent", "Sibling", "Other"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Household" error={errors.household}>
              <Select value={v.household} onValueChange={(x) => s("household", x)}>
                <SelectTrigger><SelectValue placeholder="Select household" /></SelectTrigger>
                <SelectContent>{households.map((h) => <SelectItem key={h.id} value={h.head}>{h.head} ({h.community})</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Occupation"><Input value={v.occupation ?? ""} onChange={(e) => s("occupation", e.target.value)} maxLength={60} /></Field>
            <Field label="Education">
              <Select value={v.education} onValueChange={(x) => s("education", x)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{["None", "Primary", "JHS", "SHS", "Tertiary"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Marital status">
              <Select value={v.marital} onValueChange={(x) => s("marital", x)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{["Single", "Married", "Widowed", "Divorced"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Emergency contact" className="sm:col-span-2"><Input value={v.emergency ?? ""} onChange={(e) => s("emergency", e.target.value)} placeholder="Name + phone" maxLength={120} /></Field>
            <Field label="Medical notes" className="sm:col-span-2"><Textarea rows={3} value={v.medical ?? ""} onChange={(e) => s("medical", e.target.value)} maxLength={400} /></Field>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => nav({ to: "/people" })}>Cancel</Button>
            <Button onClick={submit}><Save className="mr-1 h-4 w-4" /> Save person</Button>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}

function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={"grid gap-1.5 " + (className ?? "")}>
      <Label>{label}</Label>
      {children}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
