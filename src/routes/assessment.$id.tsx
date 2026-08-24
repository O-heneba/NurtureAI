import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, EmptyState, StatusPill, AIRecommendationCard } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  Send,
  Apple,
  Home,
  Info,
  CheckCircle2,
  Loader2,
  FileText,
  StickyNote,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getAssessment, markReviewed, appendNote, type AssessmentRow } from "@/lib/assessments";
import {
  ASSESSMENT_META,
  PRIORITY_META,
  DANGER_SIGNS,
  type AssessmentType,
  type Priority,
} from "@/lib/assessment-engine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/assessment/$id")({
  component: AssessmentDetail,
});

function AssessmentDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState<AssessmentRow | null | undefined>(undefined);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getAssessment(id)
      .then(setRow)
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Failed to load");
        setRow(null);
      });
  }, [id]);

  async function onReviewed() {
    if (!row) return;
    setBusy(true);
    try {
      const r = await markReviewed(row.id, note.trim() || undefined);
      setRow(r);
      setNote("");
      toast.success("Marked as reviewed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function onAddNote() {
    if (!row || !note.trim()) return;
    setBusy(true);
    try {
      const r = await appendNote(row.id, note.trim());
      setRow(r);
      setNote("");
      toast.success("Note added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (row === undefined) {
    return (
      <AppLayout>
        <div className="p-8 text-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
          Loading…
        </div>
      </AppLayout>
    );
  }
  if (row === null) {
    return (
      <AppLayout>
        <EmptyState
          title="Assessment not found"
          action={
            <Link to="/assessments">
              <Button>Back</Button>
            </Link>
          }
        />
      </AppLayout>
    );
  }

  const type = row.assessment_type as AssessmentType;
  const meta = ASSESSMENT_META[type];
  const priority = (row.inputs?.priority ?? "routine") as Priority;
  const pMeta = PRIORITY_META[priority];
  const ai = row.ai_result ?? {};
  const aiProvider = ai.provider === "local" ? "Local AI" : ai.provider === "cloud" ? "Cloud AI" : null;
  const status = row.inputs?.status ?? "submitted";
  const dangerKeys: string[] = row.inputs?.danger_signs ?? [];
  const dangerCatalog = DANGER_SIGNS[type] ?? [];
  const dangerSelected = dangerCatalog.filter((s) => dangerKeys.includes(s.key));
  const rulesFlags: Array<{ code: string; message: string; severity: string }> =
    row.inputs?.rules?.flags ?? [];
  const missing: string[] = row.inputs?.rules?.missing ?? [];
  const missingInformation = Array.from(
    new Set([...missing, ...(Array.isArray(ai.missing_information) ? ai.missing_information : [])]),
  );
  const notesLog: Array<{ at: string; note: string }> = row.inputs?.notes_log ?? [];

  return (
    <AppLayout>
      <PageHeader
        title="Assessment result"
        description={`${meta?.label ?? type} · ${new Date(row.created_at).toLocaleString()}`}
        breadcrumbs={[{ label: "Assessments", to: "/assessments" }, { label: "Result" }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                navigate({
                  to: "/followup/new",
                  search: {
                    assessment_id: row.id,
                    person_id: row.person_id ?? undefined,
                    referral_id: undefined,
                  },
                })
              }
            >
              Schedule follow-up
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                navigate({
                  to: "/referral/new",
                  search: { assessment_id: row.id, person_id: row.person_id ?? undefined },
                })
              }
            >
              <Send className="h-4 w-4 mr-1.5" /> Create referral
            </Button>
            <Button onClick={() => navigate({ to: "/assessment/new" })}>New assessment</Button>
          </div>
        }
      />

      <div
        className={cn(
          "rounded-2xl border p-6 mb-6",
          pMeta.tone === "destructive" &&
            "border-destructive/30 bg-gradient-to-br from-destructive/10 to-warning/10",
          pMeta.tone === "warning" &&
            "border-warning/30 bg-gradient-to-br from-warning/10 to-info/10",
          pMeta.tone === "info" && "border-info/30 bg-gradient-to-br from-info/10 to-primary/10",
          pMeta.tone === "success" &&
            "border-success/30 bg-gradient-to-br from-success/10 to-primary/10",
        )}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 items-start">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-semibold text-muted-foreground">
              <AlertTriangle className="h-4 w-4" /> Priority: {pMeta.label}
            </div>
            <h2 className="mt-2 text-2xl font-bold">{row.inputs?.person?.full_name ?? "Client"}</h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              {ai.summary ?? pMeta.description}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusPill
                tone={status === "draft" ? "warning" : status === "reviewed" ? "success" : "info"}
              >
                {status}
              </StatusPill>
              {typeof row.risk_score === "number" && (
                <StatusPill tone="muted">Score {row.risk_score}/100</StatusPill>
              )}
              <StatusPill tone="muted">{meta?.label ?? type}</StatusPill>
            </div>
          </div>
        </div>
      </div>

      {(ai.unavailable || ai.uncertainty_notice || ai.priority_level) && (
        <div className="mb-4">
          <AIRecommendationCard
            title={`AI-assisted decision support${aiProvider ? ` · ${aiProvider}` : ""}`}
            tone={
              pMeta.tone === "destructive"
                ? "destructive"
                : pMeta.tone === "warning"
                  ? "warning"
                  : "primary"
            }
          >
            {ai.unavailable ? (
              <p>{ai.message}</p>
            ) : (
              ai.summary && <p>{ai.summary}</p>
            )}
            {ai.uncertainty_notice && (
              <p className="text-xs text-muted-foreground border-t pt-2 mt-2">
                <strong>Limitations:</strong> {ai.uncertainty_notice}
              </p>
            )}
          </AIRecommendationCard>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card className="rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 font-semibold mb-3">
              <AlertTriangle className="h-4 w-4 text-warning" /> Contributing factors
            </div>
            <ul className="text-sm space-y-1.5 text-muted-foreground">
              {(ai.contributing_factors ?? []).map((f: string, i: number) => (
                <li key={i}>• {f}</li>
              ))}
              {(ai.contributing_factors ?? []).length === 0 && <li>• None identified</li>}
            </ul>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 font-semibold mb-3">
              <ShieldCheck className="h-4 w-4 text-primary" /> Recommended next steps
            </div>
            <ul className="text-sm space-y-1.5 text-muted-foreground">
              {(ai.recommended_next_steps ?? []).map((s: string, i: number) => (
                <li key={i}>• {s}</li>
              ))}
              {(ai.recommended_next_steps ?? []).length === 0 && <li>• Continue routine care</li>}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card className="rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 font-semibold mb-3">
              <FileText className="h-4 w-4" /> Rules engine flags
            </div>
            {rulesFlags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No safety-rule flags.</p>
            ) : (
              <ul className="text-sm space-y-1.5 text-muted-foreground">
                {rulesFlags.map((f) => (
                  <li key={f.code}>
                    •{" "}
                    <span
                      className={cn(
                        "uppercase text-[10px] tracking-widest mr-1",
                        f.severity === "urgent" && "text-destructive",
                        f.severity === "warn" && "text-warning",
                      )}
                    >
                      [{f.severity}]
                    </span>
                    {f.message}
                  </li>
                ))}
              </ul>
            )}
            {dangerSelected.length > 0 && (
              <>
                <div className="mt-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Danger signs
                </div>
                <ul className="text-sm mt-2 space-y-1">
                  {dangerSelected.map((s) => (
                    <li key={s.key}>
                      • {s.label}
                      {s.critical && (
                        <span className="text-destructive ml-2 text-[10px] uppercase tracking-widest">
                          critical
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {missingInformation.length > 0 && (
              <>
                <div className="mt-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Missing info
                </div>
                <ul className="text-sm mt-2 space-y-1 text-muted-foreground">
                  {missingInformation.map((m) => (
                    <li key={m}>• {m}</li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 font-semibold mb-3">
              <Send className="h-4 w-4" /> Referral & follow-up
            </div>
            {ai.referral_consideration ? (
              <p className="text-sm text-muted-foreground">{ai.referral_consideration}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No referral indicated by AI review.</p>
            )}
            {ai.follow_up_suggestion && (
              <>
                <div className="mt-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Follow-up
                </div>
                <p className="text-sm mt-1 text-muted-foreground">{ai.follow_up_suggestion}</p>
              </>
            )}
            {ai.nutrition_guidance && (
              <>
                <div className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <Apple className="h-3.5 w-3.5" /> Nutrition
                </div>
                <p className="text-sm mt-1 text-muted-foreground">{ai.nutrition_guidance}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl mb-4">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 font-semibold mb-3">
            <StickyNote className="h-4 w-4" /> Reviewer notes
          </div>
          {notesLog.length > 0 && (
            <ul className="text-sm space-y-2 mb-3">
              {notesLog.map((n, i) => (
                <li key={i} className="rounded-lg border p-3">
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(n.at).toLocaleString()}
                  </div>
                  <div>{n.note}</div>
                </li>
              ))}
            </ul>
          )}
          <Textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a review or follow-up note…"
          />
          <div className="mt-3 flex flex-wrap gap-2 justify-end">
            <Button variant="outline" onClick={onAddNote} disabled={busy || !note.trim()}>
              {busy ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <StickyNote className="h-4 w-4 mr-1.5" />
              )}
              Add note
            </Button>
            <Button onClick={onReviewed} disabled={busy || status === "reviewed"}>
              {status === "reviewed" ? (
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
              ) : (
                <ShieldCheck className="h-4 w-4 mr-1.5" />
              )}
              {status === "reviewed" ? "Reviewed" : "Mark reviewed"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-accent/40 border text-xs text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          This AI-assisted review is a decision-support aid based on the structured data captured.
          It does not replace clinical judgment. Follow Ghana Health Service protocols and refer
          when in doubt.
        </div>
      </div>

      <details className="mt-4 rounded-xl border p-4">
        <summary className="text-sm font-medium cursor-pointer flex items-center gap-2">
          <Home className="h-4 w-4" /> Raw inputs
        </summary>
        <pre className="text-[11px] mt-3 whitespace-pre-wrap text-muted-foreground max-h-96 overflow-auto">
          {JSON.stringify(row.inputs?.sections ?? {}, null, 2)}
        </pre>
      </details>
    </AppLayout>
  );
}
