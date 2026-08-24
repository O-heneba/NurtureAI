import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { insertChild, insertPerson, listHouseholds, listPersons } from "@/lib/registrations";

export const Route = createFileRoute("/register/child")({
  component: RegisterChild,
});

const milestones = ["Head control", "Sitting", "Crawling", "Standing", "Walking", "First words"];
const immSchedule = [
  "BCG + OPV0",
  "Penta 1",
  "Penta 2",
  "Penta 3",
  "Measles 1",
  "MMR + Yellow fever",
];

function RegisterChild() {
  const nav = useNavigate();
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [v, setV] = useState<Record<string, string>>({ nutrition: "Normal", bf: "Exclusive" });
  const [ms, setMs] = useState<string[]>([]);
  const [imm, setImm] = useState<string[]>([]);
  const [households, setHouseholds] = useState<
    Array<{ id: string; head_name: string; house_no: string }>
  >([]);
  const [mothers, setMothers] = useState<
    Array<{ id: string; full_name: string; sex: string | null }>
  >([]);
  const s = (k: string, val: string) => setV({ ...v, [k]: val });

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

  async function submit() {
    if (!v.dob || !v.name) {
      toast.error("Child name and birth date are required");
      return;
    }
    if (!v.household) {
      toast.error("Select a household");
      return;
    }
    setSaving(true);
    try {
      const person = await insertPerson({
        household_id: v.household,
        full_name: v.name,
        sex: v.sex || undefined,
        date_of_birth: v.dob,
        notes: v.notes || undefined,
      });
      const growthNotes = [
        v.cw && `Current weight: ${v.cw}kg`,
        v.h && `Height: ${v.h}cm`,
        `Nutrition: ${v.nutrition}`,
        `Breastfeeding: ${v.bf}`,
        v.imm && `Immunization: ${v.imm}`,
        ms.length && `Milestones: ${ms.join(", ")}`,
        v.notes && `Notes: ${v.notes}`,
      ]
        .filter(Boolean)
        .join(" | ");
      await insertChild({
        person_id: person.id,
        mother_person_id: v.mother || undefined,
        birth_weight_kg: v.bw ? Number(v.bw) : undefined,
        immunizations: imm,
        growth_notes: growthNotes,
      });
      setDone(true);
      toast.success("Child registered");
    } catch (e) {
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
                  setImm([]);
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
            <Field label="Mother (optional)">
              <Select value={v.mother} onValueChange={(x) => s("mother", x)}>
                <SelectTrigger>
                  <SelectValue placeholder={mothers.length ? "Select mother" : "Loading…"} />
                </SelectTrigger>
                <SelectContent>
                  {mothers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Birth date" required>
              <Input type="date" value={v.dob ?? ""} onChange={(e) => s("dob", e.target.value)} />
            </Field>
            <Field label="Sex">
              <Select value={v.sex} onValueChange={(x) => s("sex", x)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
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
            <Field label="Immunization status">
              <Select value={v.imm} onValueChange={(x) => s("imm", x)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {["Up-to-date", "Due: MMR", "Due: Measles", "Delayed"].map((n) => (
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
            <Label className="mb-2 block">Immunizations received</Label>
            <div className="grid sm:grid-cols-2 gap-2">
              {immSchedule.map((m) => (
                <label
                  key={m}
                  className="flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer hover:bg-accent/40"
                >
                  <Checkbox
                    checked={imm.includes(m)}
                    onCheckedChange={() => toggle(imm, setImm, m)}
                  />
                  <span className="text-sm">{m}</span>
                </label>
              ))}
            </div>
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
