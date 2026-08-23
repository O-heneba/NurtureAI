import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, EmptyState, StatusPill } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, Loader2, CalendarCheck, ClipboardCheck, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  getReferral,
  updateReferralStatus,
  listReferralHistory,
  getReferralOutcome,
  recordReferralOutcome,
  type ReferralRow,
  type ReferralStatus,
} from "@/lib/referrals";

const URGENCY_TONE: Record<string, string> = {
  routine: "bg-success/10 text-success border-success/30",
  priority: "bg-info/10 text-info border-info/30",
  urgent: "bg-warning/15 text-warning border-warning/30",
  emergency: "bg-destructive/10 text-destructive border-destructive/30",
};

const NEXT_STATUS: Record<ReferralStatus, ReferralStatus[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["acknowledged", "declined", "cancelled"],
  acknowledged: ["accepted", "declined"],
  accepted: ["in_progress", "completed"],
  in_progress: ["completed"],
  completed: [],
  declined: [],
  cancelled: [],
  pending: ["submitted", "cancelled"],
};

export const Route = createFileRoute("/referral/$id")({
  component: ReferralDetail,
});

function ReferralDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState<ReferralRow | null | undefined>(undefined);
  const [history, setHistory] = useState<Array<any>>([]);
  const [outcome, setOutcome] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [outForm, setOutForm] = useState({
    seen: true,
    attended_at: "",
    facility_attended: "",
    service_received: "",
    outcome: "care_received",
    barrier: "",
    further_action_required: false,
    notes: "",
  });

  async function reload() {
    const [r, h, o] = await Promise.all([
      getReferral(id),
      listReferralHistory(id),
      getReferralOutcome(id),
    ]);
    setRow(r);
    setHistory(h);
    setOutcome(o);
    if (o)
      setOutForm({
        seen: o.seen ?? true,
        attended_at: o.attended_at ?? "",
        facility_attended: o.facility_attended ?? "",
        service_received: o.service_received ?? "",
        outcome: o.outcome ?? "care_received",
        barrier: o.barrier ?? "",
        further_action_required: o.further_action_required ?? false,
        notes: o.notes ?? "",
      });
  }
  useEffect(() => {
    reload().catch((e) => {
      toast.error(e instanceof Error ? e.message : "Failed");
      setRow(null);
    });
  }, [id]);

  async function onTransition(to: ReferralStatus) {
    if (!row) return;
    setBusy(true);
    try {
      await updateReferralStatus(row.id, to, note.trim() || undefined);
      setNote("");
      await reload();
      toast.success(`Status → ${to.replace("_", " ")}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveOutcome() {
    if (!row) return;
    setBusy(true);
    try {
      await recordReferralOutcome({
        referral_id: row.id,
        seen: outForm.seen,
        attended_at: outForm.attended_at || undefined,
        facility_attended: outForm.facility_attended || undefined,
        service_received: outForm.service_received || undefined,
        outcome: outForm.outcome || undefined,
        barrier: outForm.barrier || undefined,
        further_action_required: outForm.further_action_required,
        notes: outForm.notes || undefined,
      });
      if (row.status !== "completed")
        await updateReferralStatus(row.id, "completed", "Outcome recorded");
      toast.success("Outcome recorded");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
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
          title="Referral not found"
          action={
            <Link to="/referrals">
              <Button>Back</Button>
            </Link>
          }
        />
      </AppLayout>
    );

  const nextOptions = NEXT_STATUS[row.status] ?? [];

  return (
    <AppLayout>
      <PageHeader
        title={row.category ?? "Referral"}
        description={`${row.facility ?? "Unassigned facility"} · created ${new Date(row.created_at).toLocaleString()}`}
        icon={<Send className="h-5 w-5" />}
        breadcrumbs={[{ label: "Referrals", to: "/referrals" }, { label: "Detail" }]}
        actions={
          <div className="flex gap-2">
            <Badge variant="outline" className={URGENCY_TONE[row.urgency]}>
              {row.urgency}
            </Badge>
            <StatusPill
              tone={
                row.status === "completed"
                  ? "success"
                  : row.status === "declined"
                    ? "destructive"
                    : "info"
              }
            >
              {row.status.replace("_", " ")}
            </StatusPill>
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">Clinical summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Reason</div>
                <div className="font-medium">{row.reason}</div>
              </div>
              {row.symptoms && (
                <div>
                  <div className="text-xs text-muted-foreground">Presenting symptoms</div>
                  <div>{row.symptoms}</div>
                </div>
              )}
              {row.findings && (
                <div>
                  <div className="text-xs text-muted-foreground">CHPS findings</div>
                  <div>{row.findings}</div>
                </div>
              )}
              {row.requested_service && (
                <div>
                  <div className="text-xs text-muted-foreground">Requested service</div>
                  <div>{row.requested_service}</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" /> Facility outcome
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={outForm.seen}
                    onCheckedChange={(v) => setOutForm((f) => ({ ...f, seen: v === true }))}
                  />{" "}
                  Person was seen
                </label>
                <div>
                  <Label>Date attended</Label>
                  <Input
                    type="date"
                    value={outForm.attended_at}
                    onChange={(e) => setOutForm((f) => ({ ...f, attended_at: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Facility attended</Label>
                  <Input
                    value={outForm.facility_attended}
                    onChange={(e) =>
                      setOutForm((f) => ({ ...f, facility_attended: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Service received</Label>
                  <Input
                    value={outForm.service_received}
                    onChange={(e) =>
                      setOutForm((f) => ({ ...f, service_received: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Outcome</Label>
                  <Select
                    value={outForm.outcome}
                    onValueChange={(v) => setOutForm((f) => ({ ...f, outcome: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "care_received",
                        "admitted",
                        "treated_discharged",
                        "further_referral",
                        "unable_to_attend",
                        "unreachable",
                        "other",
                      ].map((o) => (
                        <SelectItem key={o} value={o}>
                          {o.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Barrier (if any)</Label>
                  <Select
                    value={outForm.barrier}
                    onValueChange={(v) => setOutForm((f) => ({ ...f, barrier: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "transportation",
                        "financial",
                        "distance",
                        "unreachable",
                        "caregiver_constraint",
                        "facility_access",
                        "communication",
                        "other",
                      ].map((o) => (
                        <SelectItem key={o} value={o}>
                          {o.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  value={outForm.notes}
                  onChange={(e) => setOutForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={outForm.further_action_required}
                  onCheckedChange={(v) =>
                    setOutForm((f) => ({ ...f, further_action_required: v === true }))
                  }
                />{" "}
                Further follow-up required
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <Button onClick={onSaveOutcome} disabled={busy}>
                  {busy ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <ClipboardCheck className="h-4 w-4 mr-1.5" />
                  )}
                  {outcome ? "Update outcome" : "Record outcome"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">Workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Transition note (optional)"
              />
              <div className="flex flex-wrap gap-2">
                {nextOptions.map((to) => (
                  <Button
                    key={to}
                    variant="outline"
                    size="sm"
                    onClick={() => onTransition(to)}
                    disabled={busy}
                  >
                    {to.replace("_", " ")} <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                ))}
                {nextOptions.length === 0 && (
                  <div className="text-xs text-muted-foreground">This referral is closed.</div>
                )}
              </div>
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() =>
                    navigate({
                      to: "/followup/new",
                      search: {
                        referral_id: row.id,
                        person_id: row.person_id ?? undefined,
                        assessment_id: undefined,
                      },
                    })
                  }
                >
                  <CalendarCheck className="h-4 w-4 mr-1.5" /> Schedule follow-up
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-sm text-muted-foreground">No events yet.</div>
              ) : (
                <ol className="relative border-l pl-5 space-y-4">
                  {history.map((h) => (
                    <li key={h.id} className="relative">
                      <span className="absolute -left-[23px] top-1 grid h-3 w-3 place-items-center rounded-full bg-primary ring-4 ring-primary/15" />
                      <div className="text-xs text-muted-foreground">
                        {new Date(h.at).toLocaleString()}
                      </div>
                      <div className="font-medium text-sm">
                        {h.from_status ? `${h.from_status} → ${h.to_status}` : h.to_status}
                      </div>
                      {h.note && <div className="text-xs text-muted-foreground">{h.note}</div>}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
