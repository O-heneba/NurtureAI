import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, EmptyState, StatusPill, ListRowSkeleton } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardCheck, Plus, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { listAssessments, type AssessmentRow } from "@/lib/assessments";
import {
  ASSESSMENT_META,
  type AssessmentType,
  PRIORITY_META,
  type Priority,
} from "@/lib/assessment-engine";
import { toast } from "sonner";

export const Route = createFileRoute("/assessments")({
  component: AssessmentsList,
});

function AssessmentsList() {
  const [rows, setRows] = useState<AssessmentRow[] | null>(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");

  useEffect(() => {
    listAssessments(200)
      .then(setRows)
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Failed to load assessments");
        setRows([]);
      });
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      if (type !== "all" && r.assessment_type !== type) return false;
      if (priority !== "all" && (r.inputs?.priority ?? "") !== priority) return false;
      if (q.trim()) {
        const hay = `${r.inputs?.person?.full_name ?? ""} ${r.summary ?? ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, q, type, priority]);

  return (
    <AppLayout>
      <PageHeader
        title="Assessments"
        description="Modular field assessments with rule-based safety checks and AI decision support"
        icon={<ClipboardCheck className="h-5 w-5" />}
        actions={
          <Link to="/assessment/new">
            <Button className="rounded-lg">
              <Plus className="h-4 w-4 mr-1.5" /> Start assessment
            </Button>
          </Link>
        }
      />

      <Card className="rounded-xl mb-4">
        <CardContent className="p-4 grid gap-3 sm:grid-cols-[1fr_200px_200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by person or summary…"
              className="pl-9"
            />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.entries(ASSESSMENT_META).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {Object.entries(PRIORITY_META).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {rows === null ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <ListRowSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-6 w-6" />}
          title="No assessments yet"
          description="Start a new field assessment to see it here with rules-based priority and AI-assisted review."
          action={
            <Link to="/assessment/new">
              <Button>Start assessment</Button>
            </Link>
          }
        />
      ) : (
        <Card className="rounded-xl overflow-hidden">
          <CardContent className="p-0 divide-y">
            {filtered.map((r) => {
              const meta = ASSESSMENT_META[r.assessment_type as AssessmentType];
              const pr = (r.inputs?.priority ?? "routine") as Priority;
              const prMeta = PRIORITY_META[pr];
              const status = r.inputs?.status ?? "submitted";
              return (
                <Link
                  key={r.id}
                  to="/assessment/$id"
                  params={{ id: r.id }}
                  className="grid grid-cols-[auto_1fr_auto] items-start gap-4 p-4 hover:bg-accent/30 transition-colors"
                >
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary text-lg">
                    {meta?.icon ?? "📝"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">
                        {r.inputs?.person?.full_name ?? "Unknown person"}
                      </span>
                      <StatusPill tone="muted">{meta?.label ?? r.assessment_type}</StatusPill>
                      <StatusPill
                        tone={
                          status === "draft"
                            ? "warning"
                            : status === "reviewed"
                              ? "success"
                              : "info"
                        }
                      >
                        {status}
                      </StatusPill>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                    {r.summary && (
                      <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {r.summary}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <StatusPill
                      tone={
                        prMeta.tone === "destructive"
                          ? "destructive"
                          : prMeta.tone === "warning"
                            ? "warning"
                            : prMeta.tone === "info"
                              ? "info"
                              : "success"
                      }
                    >
                      {prMeta.label}
                    </StatusPill>
                    {typeof r.risk_score === "number" && (
                      <div className="text-xs text-muted-foreground">Score {r.risk_score}</div>
                    )}
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}
