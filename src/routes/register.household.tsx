import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Home, Loader2, MapPin, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { insertHousehold, listCommunities } from "@/lib/registrations";

export const Route = createFileRoute("/register/household")({
  component: RegisterHousehold,
});

const schema = z.object({
  community_id: z.string().uuid("Select a community"),
  house_no: z.string().trim().min(1, "House number required").max(20),
  head_name: z.string().trim().min(2, "Head of household required").max(60),
  phone: z.string().trim().regex(/^\+?\d[\d\s]{6,}$/, "Enter a valid phone"),
  address: z.string().trim().min(3).max(120),
  gps: z.string().optional(),
  notes: z.string().max(400).optional(),
});

function RegisterHousehold() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ community_id: "", house_no: "", head_name: "", phone: "", address: "", gps: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [communities, setCommunities] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => { listCommunities().then(setCommunities).catch((e) => toast.error(e.message)); }, []);

  const set = (k: keyof typeof values, v: string) => setValues({ ...values, [k]: v });

  async function submit() {
    const r = schema.safeParse(values);
    if (!r.success) {
      const e: Record<string, string> = {};
      r.error.issues.forEach((i) => { e[i.path[0] as string] = i.message; });
      setErrors(e);
      toast.error("Please fix the highlighted fields");
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await insertHousehold(r.data);
      setDone(true);
      toast.success("Household registered");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const communityName = communities.find((c) => c.id === values.community_id)?.name ?? "";

  if (done) {
    return (
      <AppLayout>
        <Card className="rounded-2xl max-w-lg mx-auto mt-8 card-elevated">
          <CardContent className="p-8 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-success/10 text-success mx-auto mb-4 animate-float-slow">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold">Household registered</h2>
            <p className="mt-2 text-sm text-muted-foreground">{values.head_name}'s household ({values.house_no}) has been added to {communityName}.</p>
            <div className="mt-6 flex justify-center gap-2">
              <Link to="/households"><Button variant="outline">View households</Button></Link>
              <Button onClick={() => { setDone(false); setValues({ community_id: "", house_no: "", head_name: "", phone: "", address: "", gps: "", notes: "" }); }}>Register another</Button>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Register household"
        description="Add a new household to your CHPS register"
        icon={<Home className="h-5 w-5" />}
        breadcrumbs={[{ label: "Households", to: "/households" }, { label: "Register" }]}
      />

      <Card className="rounded-xl max-w-3xl">
        <CardContent className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Community" error={errors.community_id}>
              <Select value={values.community_id} onValueChange={(v) => set("community_id", v)}>
                <SelectTrigger><SelectValue placeholder={communities.length ? "Select community" : "Loading…"} /></SelectTrigger>
                <SelectContent>{communities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="House number" error={errors.house_no}><Input value={values.house_no} onChange={(e) => set("house_no", e.target.value)} placeholder="e.g. K-142" maxLength={20} /></Field>
            <Field label="Head of household" error={errors.head_name}><Input value={values.head_name} onChange={(e) => set("head_name", e.target.value)} placeholder="e.g. Kofi Owusu Ansah" maxLength={60} /></Field>
            <Field label="Phone" error={errors.phone}><Input value={values.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+233 24 000 0000" /></Field>
            <Field label="Address" error={errors.address} className="sm:col-span-2"><Input value={values.address} onChange={(e) => set("address", e.target.value)} placeholder="Street / landmark" maxLength={120} /></Field>
            <Field label="GPS location (placeholder)"><div className="relative"><MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={values.gps} onChange={(e) => set("gps", e.target.value)} placeholder="Auto-detect on device" /></div></Field>
            <Field label="Notes" className="sm:col-span-2"><Textarea rows={3} value={values.notes} onChange={(e) => set("notes", e.target.value)} maxLength={400} placeholder="Optional notes about the household" /></Field>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => navigate({ to: "/households" })}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              Save household
            </Button>
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
