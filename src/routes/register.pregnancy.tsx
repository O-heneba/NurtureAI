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
import { CheckCircle2, HeartPulse, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { insertPregnancy, listPersons } from "@/lib/registrations";

export const Route = createFileRoute("/register/pregnancy")({
  component: RegisterPregnancy,
});

const riskFactorsList = [
  "Previous complications",
  "Multiple pregnancies",
  "Age <18 or >35",
  "Chronic conditions",
  "Anemia",
  "HIV positive",
];
const dangerSigns = [
  "Severe headache",
  "Blurred vision",
  "Vaginal bleeding",
  "Reduced fetal movement",
  "Persistent vomiting",
  "Swelling of hands/face",
];

function RegisterPregnancy() {
  const nav = useNavigate();
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [personId, setPersonId] = useState("");
  const [status, setStatus] = useState("confirmed");
  const [ga, setGA] = useState("28");
  const [edd, setEDD] = useState("");
  const [anc, setAnc] = useState("3");
  const [bp, setBp] = useState("");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [prev, setPrev] = useState("");
  const [medical, setMedical] = useState("");
  const [risks, setRisks] = useState<string[]>([]);
  const [signs, setSigns] = useState<string[]>([]);
  const [persons, setPersons] = useState<
    Array<{ id: string; full_name: string; sex: string | null }>
  >([]);

  useEffect(() => {
    listPersons()
      .then((p) => setPersons(p.filter((x) => x.sex !== "M")))
      .catch((e) => toast.error(e.message));
  }, []);

  function toggle(list: string[], setList: (v: string[]) => void, v: string) {
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  async function submit() {
    if (!personId) {
      toast.error("Select the pregnant person");
      return;
    }
    if (!edd) {
      toast.error("Expected delivery date is required");
      return;
    }
    setSaving(true);
    try {
      const combinedNotes = [
        `GA: ${ga}w`,
        bp && `BP: ${bp}`,
        weight && `Weight: ${weight}kg`,
        prev && `Prev: ${prev}`,
        medical && `Medical: ${medical}`,
        risks.length && `Risks: ${risks.join(", ")}`,
        signs.length && `Danger signs: ${signs.join(", ")}`,
        notes && `Notes: ${notes}`,
      ]
        .filter(Boolean)
        .join(" | ");
      await insertPregnancy({
        person_id: personId,
        edd_date: edd,
        anc_visits: Number(anc) || 0,
        status,
        notes: combinedNotes,
      });
      setDone(true);
      toast.success("Pregnancy registered");
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
            <h2 className="text-2xl font-bold">Pregnancy registered</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A new pregnancy record has been added. You can now schedule ANC visits.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Link to="/maternal">
                <Button variant="outline">View maternal care</Button>
              </Link>
              <Button onClick={() => setDone(false)}>Register another</Button>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );

  return (
    <AppLayout>
      <PageHeader
        title="Register pregnancy"
        description="Capture antenatal booking data for a new patient"
        icon={<HeartPulse className="h-5 w-5" />}
        breadcrumbs={[{ label: "Maternal Care", to: "/maternal" }, { label: "Register" }]}
      />
      <Card className="rounded-xl max-w-3xl">
        <CardContent className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Pregnant person" required className="sm:col-span-2">
              <Select value={personId} onValueChange={setPersonId}>
                <SelectTrigger>
                  <SelectValue placeholder={persons.length ? "Select person" : "Loading…"} />
                </SelectTrigger>
                <SelectContent>
                  {persons.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Pregnancy status">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="suspected">Suspected</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Gestational age (weeks)">
              <Input
                type="number"
                value={ga}
                onChange={(e) => setGA(e.target.value)}
                min={1}
                max={45}
              />
            </Field>
            <Field label="Expected delivery date" required>
              <Input type="date" value={edd} onChange={(e) => setEDD(e.target.value)} />
            </Field>
            <Field label="ANC visits completed">
              <Input
                type="number"
                value={anc}
                onChange={(e) => setAnc(e.target.value)}
                min={0}
                max={10}
              />
            </Field>
            <Field label="Blood pressure">
              <Input value={bp} onChange={(e) => setBp(e.target.value)} placeholder="e.g. 120/80" />
            </Field>
            <Field label="Weight (kg)">
              <Input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                step="0.1"
              />
            </Field>
            <Field label="Previous pregnancies" className="sm:col-span-2">
              <Input
                value={prev}
                onChange={(e) => setPrev(e.target.value)}
                placeholder="e.g. G2 P1 — one SVD 2022"
              />
            </Field>
            <Field label="Medical conditions" className="sm:col-span-2">
              <Textarea
                rows={2}
                value={medical}
                onChange={(e) => setMedical(e.target.value)}
                placeholder="Chronic conditions, medications…"
                maxLength={400}
              />
            </Field>
          </div>

          <div>
            <Label className="mb-2 block">Risk factors</Label>
            <div className="grid sm:grid-cols-2 gap-2">
              {riskFactorsList.map((r) => (
                <label
                  key={r}
                  className="flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer hover:bg-accent/40"
                >
                  <Checkbox
                    checked={risks.includes(r)}
                    onCheckedChange={() => toggle(risks, setRisks, r)}
                  />
                  <span className="text-sm">{r}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Danger signs reported</Label>
            <div className="grid sm:grid-cols-2 gap-2">
              {dangerSigns.map((r) => (
                <label
                  key={r}
                  className="flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer hover:bg-accent/40"
                >
                  <Checkbox
                    checked={signs.includes(r)}
                    onCheckedChange={() => toggle(signs, setSigns, r)}
                  />
                  <span className="text-sm">{r}</span>
                </label>
              ))}
            </div>
          </div>

          <Field label="Additional notes">
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={400}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => nav({ to: "/maternal" })}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1 h-4 w-4" />
              )}
              Save pregnancy
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
