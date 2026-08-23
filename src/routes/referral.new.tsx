import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { AppLayout } from "@/components/app-layout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { listPersons } from "@/lib/registrations";
import { listFacilities, createReferral, type FacilityRow, type Urgency } from "@/lib/referrals";
import { getAssessment } from "@/lib/assessments";

const schema = z.object({
  person_id: z.string().uuid(),
  facility_id: z.string().uuid().optional(),
  facility: z.string().trim().max(120).optional(),
  category: z.string().trim().min(2).max(60),
  reason: z.string().trim().min(4).max(500),
  symptoms: z.string().trim().max(1000).optional(),
  findings: z.string().trim().max(1000).optional(),
  requested_service: z.string().trim().max(200).optional(),
  urgency: z.enum(["routine", "priority", "urgent", "emergency"]),
  follow_up_required: z.boolean(),
});

export const Route = createFileRoute("/referral/new")({
  validateSearch: (s: Record<string, unknown>) => ({
    person_id: typeof s.person_id === "string" ? s.person_id : undefined,
    assessment_id: typeof s.assessment_id === "string" ? s.assessment_id : undefined,
  }),
  component: NewReferral,
});

function NewReferral() {
  const { person_id, assessment_id } = useSearch({ from: "/referral/new" });
  const navigate = useNavigate();
  const [persons, setPersons] = useState<Array<{ id: string; full_name: string }>>([]);
  const [facilities, setFacilities] = useState<FacilityRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    person_id: person_id ?? "",
    facility_id: "" as string,
    category: "",
    reason: "",
    symptoms: "",
    findings: "",
    requested_service: "",
    urgency: "priority" as Urgency,
    follow_up_required: true,
  });

  useEffect(() => {
    listPersons()
      .then((p) => setPersons(p.map((x) => ({ id: x.id, full_name: x.full_name }))))
      .catch(() => {});
    listFacilities()
      .then(setFacilities)
      .catch(() => {});
    if (assessment_id) {
      getAssessment(assessment_id)
        .then((a) => {
          if (!a) return;
          setForm((f) => ({
            ...f,
            person_id: a.person_id ?? f.person_id,
            category: f.category || (a.assessment_type ?? ""),
            reason:
              f.reason ||
              (a.summary ??
                a.ai_result?.referral_consideration ??
                "Referral following clinical assessment"),
            findings: f.findings || (a.ai_result?.summary ?? ""),
            urgency: (a.risk_level === "critical"
              ? "urgent"
              : a.risk_level === "high"
                ? "priority"
                : f.urgency) as Urgency,
          }));
        })
        .catch(() => {});
    }
  }, [assessment_id]);

  const selectedFacility = useMemo(
    () => facilities.find((f) => f.id === form.facility_id),
    [facilities, form.facility_id],
  );

  async function onSubmit(submit: boolean) {
    const parsed = schema.safeParse({
      ...form,
      facility_id: form.facility_id || undefined,
      facility: selectedFacility?.name,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setBusy(true);
    try {
      const row = await createReferral({
        ...parsed.data,
        assessment_id: assessment_id ?? null,
        submit,
      });
      toast.success(submit ? "Referral submitted" : "Draft saved");
      navigate({ to: "/referral/$id", params: { id: row.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create referral");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppLayout>
      <PageHeader
        title="New referral"
        description="Refer a person to a higher-level facility"
        icon={<Send className="h-5 w-5" />}
        breadcrumbs={[{ label: "Referrals", to: "/referrals" }, { label: "New" }]}
        actions={
          <Link to="/referrals">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
        }
      />

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">Referral details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Person</Label>
              <Select
                value={form.person_id}
                onValueChange={(v) => setForm((f) => ({ ...f, person_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  {persons.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Referring to (facility)</Label>
              <Select
                value={form.facility_id}
                onValueChange={(v) => setForm((f) => ({ ...f, facility_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select facility" />
                </SelectTrigger>
                <SelectContent>
                  {facilities.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name} · {f.type.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedFacility && (
                <div className="text-xs text-muted-foreground mt-1">
                  {selectedFacility.district ?? ""} · {selectedFacility.contact_phone ?? "no phone"}
                </div>
              )}
            </div>
            <div>
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="e.g. Maternal, Newborn, Child, Emergency"
              />
            </div>
            <div>
              <Label>Urgency</Label>
              <Select
                value={form.urgency}
                onValueChange={(v) => setForm((f) => ({ ...f, urgency: v as Urgency }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["routine", "priority", "urgent", "emergency"].map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Reason for referral</Label>
            <Textarea
              rows={2}
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="Concise clinical reason"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Presenting symptoms</Label>
              <Textarea
                rows={3}
                value={form.symptoms}
                onChange={(e) => setForm((f) => ({ ...f, symptoms: e.target.value }))}
              />
            </div>
            <div>
              <Label>CHPS findings</Label>
              <Textarea
                rows={3}
                value={form.findings}
                onChange={(e) => setForm((f) => ({ ...f, findings: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label>Requested service</Label>
            <Input
              value={form.requested_service}
              onChange={(e) => setForm((f) => ({ ...f, requested_service: e.target.value }))}
              placeholder="e.g. Emergency obstetric care, Paediatric review"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.follow_up_required}
              onCheckedChange={(v) => setForm((f) => ({ ...f, follow_up_required: v === true }))}
            />
            Schedule a follow-up after the visit
          </label>

          <div className="flex flex-wrap gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => onSubmit(false)} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null} Save as draft
            </Button>
            <Button onClick={() => onSubmit(true)} disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-1.5" />
              )}
              Submit referral
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
