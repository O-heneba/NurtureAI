import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { CalendarCheck, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { listPersons } from "@/lib/registrations";
import {
  createFollowUp,
  type ContactMethod,
  type FollowUpPriority,
  type FollowUpType,
} from "@/lib/followups";
import { getAssessment } from "@/lib/assessments";
import { getReferral } from "@/lib/referrals";

const TYPES: FollowUpType[] = [
  "post_referral",
  "maternal",
  "newborn",
  "child_health",
  "nutrition",
  "medication",
  "missed_appointment",
  "general",
  "household_visit",
  "other",
];

const schema = z.object({
  person_id: z.string().uuid().optional(),
  type: z.enum([
    "post_referral",
    "maternal",
    "newborn",
    "child_health",
    "nutrition",
    "medication",
    "missed_appointment",
    "general",
    "household_visit",
    "other",
  ]),
  purpose: z.string().trim().max(500).optional(),
  priority: z.enum(["routine", "priority", "urgent"]),
  due_date: z.string().min(4),
  contact_method: z.enum([
    "household_visit",
    "phone_call",
    "community_visit",
    "facility_coordination",
  ]),
  notes: z.string().trim().max(1000).optional(),
});

export const Route = createFileRoute("/followup/new")({
  validateSearch: (s: Record<string, unknown>) => ({
    person_id: typeof s.person_id === "string" ? s.person_id : undefined,
    referral_id: typeof s.referral_id === "string" ? s.referral_id : undefined,
    assessment_id: typeof s.assessment_id === "string" ? s.assessment_id : undefined,
  }),
  component: NewFollowUp,
});

function todayPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function NewFollowUp() {
  const { person_id, referral_id, assessment_id } = useSearch({ from: "/followup/new" });
  const navigate = useNavigate();
  const [persons, setPersons] = useState<Array<{ id: string; full_name: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    person_id: person_id ?? "",
    type: (referral_id ? "post_referral" : "general") as FollowUpType,
    purpose: "",
    priority: "routine" as FollowUpPriority,
    due_date: todayPlus(referral_id ? 7 : 3),
    contact_method: "household_visit" as ContactMethod,
    notes: "",
  });

  useEffect(() => {
    listPersons()
      .then((p) => setPersons(p.map((x) => ({ id: x.id, full_name: x.full_name }))))
      .catch(() => {});
    if (referral_id) {
      getReferral(referral_id)
        .then((r) => {
          if (!r) return;
          setForm((f) => ({
            ...f,
            person_id: r.person_id ?? f.person_id,
            purpose: f.purpose || `Post-referral follow-up: ${r.reason ?? r.category ?? ""}`,
            priority: (r.urgency === "emergency" || r.urgency === "urgent"
              ? "urgent"
              : r.urgency === "priority"
                ? "priority"
                : "routine") as FollowUpPriority,
          }));
        })
        .catch(() => {});
    } else if (assessment_id) {
      getAssessment(assessment_id)
        .then((a) => {
          if (!a) return;
          setForm((f) => ({
            ...f,
            person_id: a.person_id ?? f.person_id,
            purpose:
              f.purpose ||
              (a.ai_result?.follow_up_suggestion ?? `Follow-up on ${a.assessment_type} assessment`),
            priority: (a.risk_level === "critical"
              ? "urgent"
              : a.risk_level === "high"
                ? "priority"
                : "routine") as FollowUpPriority,
          }));
        })
        .catch(() => {});
    }
  }, [referral_id, assessment_id]);

  async function onSubmit() {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setBusy(true);
    try {
      const row = await createFollowUp({
        ...parsed.data,
        person_id: parsed.data.person_id || null,
        referral_id: referral_id ?? null,
        assessment_id: assessment_id ?? null,
      });
      toast.success("Follow-up scheduled");
      navigate({ to: "/followup/$id", params: { id: row.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppLayout>
      <PageHeader
        title="Schedule follow-up"
        description="Plan a visit, call, or coordination task"
        icon={<CalendarCheck className="h-5 w-5" />}
        breadcrumbs={[{ label: "Follow-ups", to: "/followups" }, { label: "New" }]}
        actions={
          <Link to="/followups" search={{ scope: "all" }}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
        }
      />

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">Follow-up details</CardTitle>
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
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as FollowUpType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm((f) => ({ ...f, priority: v as FollowUpPriority }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["routine", "priority", "urgent"].map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due date</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Contact method</Label>
              <Select
                value={form.contact_method}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, contact_method: v as ContactMethod }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "household_visit",
                    "phone_call",
                    "community_visit",
                    "facility_coordination",
                  ].map((m) => (
                    <SelectItem key={m} value={m}>
                      {m.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Purpose</Label>
            <Textarea
              rows={2}
              value={form.purpose}
              onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
              placeholder="What needs to be checked or done?"
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={onSubmit} disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <CalendarCheck className="h-4 w-4 mr-1.5" />
              )}
              Schedule follow-up
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
