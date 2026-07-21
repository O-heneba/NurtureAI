import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, EmptyState, StatusPill } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, Plus, Loader2, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import {
  listFollowUps, type FollowUpRow, type FollowUpStatus,
} from "@/lib/followups";

const SCOPES = ["all","mine","due","upcoming","missed","completed"] as const;
type Scope = (typeof SCOPES)[number];

const scopeSchema = z.enum(SCOPES);

export const Route = createFileRoute("/followups")({
  validateSearch: (s: Record<string, unknown>) => {
    const p = scopeSchema.safeParse(s.scope);
    return { scope: p.success ? p.data : ("mine" as Scope) };
  },
  component: FollowUpsPage,
});

const STATUS_TONE: Record<FollowUpStatus, "success" | "info" | "warning" | "destructive" | "muted"> = {
  draft: "muted", scheduled: "info", due: "warning", in_progress: "info",
  completed: "success", missed: "destructive", cancelled: "muted",
};

function FollowUpsPage() {
  const { scope } = useSearch({ from: "/followups" });
  const navigate = useNavigate();
  const [rows, setRows] = useState<FollowUpRow[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    setRows(null);
    listFollowUps({ scope })
      .then(setRows)
      .catch((e) => { toast.error(e instanceof Error ? e.message : "Failed"); setRows([]); });
  }, [scope]);

  const filtered = (rows ?? []).filter((r) =>
    !q.trim() || (r.purpose ?? "").toLowerCase().includes(q.toLowerCase()) || (r.type ?? "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <AppLayout>
      <PageHeader
        title="Follow-ups"
        description="Care continuity — track and complete home visits, phone calls, and referral follow-ups"
        icon={<CalendarCheck className="h-5 w-5" />}
        actions={<Link to="/followup/new"><Button><Plus className="h-4 w-4 mr-1" /> New follow-up</Button></Link>}
      />

      <div className="flex flex-wrap gap-2 mb-5">
        <div className="flex gap-1 bg-accent/40 rounded-xl p-1">
          {SCOPES.map((s) => (
            <button
              key={s}
              onClick={() => navigate({ to: "/followups", search: { scope: s } })}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${scope === s ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >{s}</button>
          ))}
        </div>
        <Input placeholder="Search purpose or type…" value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 min-w-[220px] max-w-md" />
      </div>

      {rows === null ? (
        <div className="p-10 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No follow-ups"
          description="Schedule a new follow-up or change the scope filter."
          action={<Link to="/followup/new"><Button><Plus className="h-4 w-4 mr-1" /> New follow-up</Button></Link>}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Link key={r.id} to="/followup/$id" params={{ id: r.id }} className="block">
              <Card className="rounded-xl hover-lift">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-semibold capitalize truncate">{r.type.replace(/_/g," ")}</div>
                        <Badge variant="outline" className="capitalize">{r.priority}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">{r.purpose ?? "—"}</div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Due {new Date(r.due_date).toLocaleDateString()}</span>
                        {r.contact_method && <span className="flex items-center gap-1"><User className="h-3 w-3" />{r.contact_method.replace(/_/g," ")}</span>}
                      </div>
                    </div>
                    <StatusPill tone={STATUS_TONE[r.status]}>{r.status.replace(/_/g," ")}</StatusPill>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
