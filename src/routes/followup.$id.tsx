import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, EmptyState, StatusPill } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarCheck, Loader2, PhoneCall, ClipboardCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  getFollowUp,
  listAttempts,
  getFollowUpOutcome,
  recordAttempt,
  completeFollowUp,
  markMissed,
  cancelFollowUp,
  type FollowUpRow,
  type FollowUpAttempt,
  type ContactMethod,
} from "@/lib/followups";

const STATUS_TONE: Record<string, "success" | "info" | "warning" | "destructive" | "muted"> = {
  draft: "muted",
  scheduled: "info",
  due: "warning",
  in_progress: "info",
  completed: "success",
  missed: "destructive",
  cancelled: "muted",
};

export const Route = createFileRoute("/followup/$id")({
  component: FollowUpDetail,
});

function FollowUpDetail() {
  const { id } = Route.useParams();
  const [row, setRow] = useState<FollowUpRow | null | undefined>(undefined);
  const [attempts, setAttempts] = useState<FollowUpAttempt[]>([]);
  const [outcome, setOutcome] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState({
    method: "household_visit" as ContactMethod,
    contacted: true,
    result: "contacted",
    barrier: "",
    next_attempt_at: "",
    notes: "",
  });
  const [complete, setComplete] = useState({
    contact_status: "person_contacted",
    current_condition: "unchanged",
    referral_completed: false,
    care_received: "",
    barriers: [] as string[],
    new_symptoms: "",
    recommendations: "",
    next_follow_up_at: "",
    next_action: "close",
    notes: "",
  });

  async function reload() {
    const [r, a, o] = await Promise.all([
      getFollowUp(id),
      listAttempts(id),
      getFollowUpOutcome(id),
    ]);
    setRow(r);
    setAttempts(a);
    setOutcome(o);
    if (o)
      setComplete({
        contact_status: o.contact_status ?? "person_contacted",
        current_condition: o.current_condition ?? "unchanged",
        referral_completed: o.referral_completed ?? false,
        care_received: o.care_received ?? "",
        barriers: o.barriers ?? [],
        new_symptoms: o.new_symptoms ?? "",
        recommendations: o.recommendations ?? "",
        next_follow_up_at: o.next_follow_up_at ?? "",
        next_action: o.next_action ?? "close",
        notes: o.notes ?? "",
      });
  }
  useEffect(() => {
    reload().catch((e) => {
      toast.error(e instanceof Error ? e.message : "Failed");
      setRow(null);
    });
  }, [id]);

  async function onAttempt() {
    if (!row) return;
    setBusy(true);
    try {
      await recordAttempt({
        follow_up_id: row.id,
        method: attempt.method,
        contacted: attempt.contacted,
        result: attempt.result || undefined,
        barrier: attempt.barrier || undefined,
        next_attempt_at: attempt.next_attempt_at || undefined,
        notes: attempt.notes || undefined,
      });
      setAttempt((a) => ({ ...a, notes: "", barrier: "" }));
      await reload();
      toast.success("Attempt logged");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function onComplete() {
    if (!row) return;
    setBusy(true);
    try {
      await completeFollowUp({
        follow_up_id: row.id,
        contact_status: complete.contact_status,
        current_condition: complete.current_condition,
        referral_completed: complete.referral_completed,
        care_received: complete.care_received || undefined,
        barriers: complete.barriers,
        new_symptoms: complete.new_symptoms || undefined,
        recommendations: complete.recommendations || undefined,
        next_follow_up_at: complete.next_follow_up_at || undefined,
        next_action: complete.next_action,
        notes: complete.notes || undefined,
      });
      await reload();
      toast.success("Follow-up completed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function onMissed() {
    if (!row) return;
    setBusy(true);
    try {
      await markMissed(row.id);
      await reload();
      toast.success("Marked missed");
    } finally {
      setBusy(false);
    }
  }
  async function onCancel() {
    if (!row) return;
    setBusy(true);
    try {
      await cancelFollowUp(row.id);
      await reload();
      toast.success("Cancelled");
    } finally {
      setBusy(false);
    }
  }

  if (row === undefined)
    return (
      <AppLayout>
        <div className="p-8 text-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
          Loading…
        </div>
      </AppLayout>
    );
  if (row === null)
    return (
      <AppLayout>
        <EmptyState
          title="Follow-up not found"
          action={
            <Link to="/followups">
              <Button>Back</Button>
            </Link>
          }
        />
      </AppLayout>
    );

  const closed = row.status === "completed" || row.status === "cancelled";

  return (
    <AppLayout>
      <PageHeader
        title={row.type.replace(/_/g, " ")}
        description={row.purpose ?? "Care continuity follow-up"}
        icon={<CalendarCheck className="h-5 w-5" />}
        breadcrumbs={[{ label: "Follow-ups", to: "/followups" }, { label: "Detail" }]}
        actions={
          <div className="flex gap-2">
            <Badge variant="outline" className="capitalize">
              {row.priority}
            </Badge>
            <StatusPill tone={STATUS_TONE[row.status]}>{row.status.replace(/_/g, " ")}</StatusPill>
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PhoneCall className="h-4 w-4" /> Log an attempt
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Method</Label>
                  <Select
                    value={attempt.method}
                    onValueChange={(v) => setAttempt((a) => ({ ...a, method: v as ContactMethod }))}
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
                <div>
                  <Label>Result</Label>
                  <Select
                    value={attempt.result}
                    onValueChange={(v) =>
                      setAttempt((a) => ({ ...a, result: v, contacted: v === "contacted" }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "contacted",
                        "no_answer",
                        "phone_unavailable",
                        "person_not_home",
                        "person_moved",
                        "refused_contact",
                        "other",
                      ].map((r) => (
                        <SelectItem key={r} value={r}>
                          {r.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Barrier (if any)</Label>
                  <Input
                    value={attempt.barrier}
                    onChange={(e) => setAttempt((a) => ({ ...a, barrier: e.target.value }))}
                    placeholder="e.g. rains, no transport"
                  />
                </div>
                <div>
                  <Label>Next attempt</Label>
                  <Input
                    type="date"
                    value={attempt.next_attempt_at}
                    onChange={(e) => setAttempt((a) => ({ ...a, next_attempt_at: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  value={attempt.notes}
                  onChange={(e) => setAttempt((a) => ({ ...a, notes: e.target.value }))}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={onAttempt} disabled={busy || closed}>
                  {busy ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <PhoneCall className="h-4 w-4 mr-1.5" />
                  )}
                  Log attempt
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" /> Complete follow-up
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Contact status</Label>
                  <Select
                    value={complete.contact_status}
                    onValueChange={(v) => setComplete((c) => ({ ...c, contact_status: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "person_contacted",
                        "caregiver_contacted",
                        "not_reached",
                        "facility_contacted",
                      ].map((v) => (
                        <SelectItem key={v} value={v}>
                          {v.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Current condition</Label>
                  <Select
                    value={complete.current_condition}
                    onValueChange={(v) => setComplete((c) => ({ ...c, current_condition: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["improved", "unchanged", "worsened", "more_info_needed"].map((v) => (
                        <SelectItem key={v} value={v}>
                          {v.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Care received</Label>
                  <Input
                    value={complete.care_received}
                    onChange={(e) => setComplete((c) => ({ ...c, care_received: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Next action</Label>
                  <Select
                    value={complete.next_action}
                    onValueChange={(v) => setComplete((c) => ({ ...c, next_action: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "close",
                        "schedule_another",
                        "create_referral",
                        "escalate",
                        "start_assessment",
                      ].map((v) => (
                        <SelectItem key={v} value={v}>
                          {v.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Next follow-up date</Label>
                  <Input
                    type="date"
                    value={complete.next_follow_up_at}
                    onChange={(e) =>
                      setComplete((c) => ({ ...c, next_follow_up_at: e.target.value }))
                    }
                  />
                </div>
                <label className="flex items-center gap-2 text-sm mt-6">
                  <Checkbox
                    checked={complete.referral_completed}
                    onCheckedChange={(v) =>
                      setComplete((c) => ({ ...c, referral_completed: v === true }))
                    }
                  />
                  Prior referral was completed
                </label>
              </div>
              <div>
                <Label>New symptoms / concerns</Label>
                <Textarea
                  rows={2}
                  value={complete.new_symptoms}
                  onChange={(e) => setComplete((c) => ({ ...c, new_symptoms: e.target.value }))}
                />
              </div>
              <div>
                <Label>Recommendations</Label>
                <Textarea
                  rows={2}
                  value={complete.recommendations}
                  onChange={(e) => setComplete((c) => ({ ...c, recommendations: e.target.value }))}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  value={complete.notes}
                  onChange={(e) => setComplete((c) => ({ ...c, notes: e.target.value }))}
                />
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <Button variant="outline" onClick={onMissed} disabled={busy || closed}>
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Mark missed
                </Button>
                <Button variant="outline" onClick={onCancel} disabled={busy || closed}>
                  Cancel
                </Button>
                <Button onClick={onComplete} disabled={busy || closed}>
                  {busy ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <ClipboardCheck className="h-4 w-4 mr-1.5" />
                  )}
                  {outcome ? "Update outcome" : "Complete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            {attempts.length === 0 ? (
              <div className="text-sm text-muted-foreground">No attempts yet.</div>
            ) : (
              <ol className="relative border-l pl-5 space-y-4">
                {attempts.map((a) => (
                  <li key={a.id} className="relative">
                    <span
                      className={`absolute -left-[23px] top-1 grid h-3 w-3 place-items-center rounded-full ring-4 ${a.contacted ? "bg-success ring-success/15" : "bg-warning ring-warning/15"}`}
                    />
                    <div className="text-xs text-muted-foreground">
                      {new Date(a.attempted_at).toLocaleString()}
                    </div>
                    <div className="font-medium text-sm capitalize">
                      {(a.method ?? "attempt").replace(/_/g, " ")} —{" "}
                      {(a.result ?? "").replace(/_/g, " ")}
                    </div>
                    {a.notes && <div className="text-xs text-muted-foreground">{a.notes}</div>}
                    {a.next_attempt_at && (
                      <div className="text-[11px] text-muted-foreground">
                        Next: {a.next_attempt_at}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
