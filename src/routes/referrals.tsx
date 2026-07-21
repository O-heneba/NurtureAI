import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, EmptyState, StatusPill } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Send, MapPin, Calendar, Search, Loader2 } from "lucide-react";
import { listReferrals, type ReferralRow, type ReferralStatus, type Urgency } from "@/lib/referrals";
import { toast } from "sonner";

export const Route = createFileRoute("/referrals")({
  component: Referrals,
});

const URGENCY_TONE: Record<Urgency, string> = {
  routine: "bg-success/10 text-success border-success/30",
  priority: "bg-info/10 text-info border-info/30",
  urgent: "bg-warning/15 text-warning border-warning/30",
  emergency: "bg-destructive/10 text-destructive border-destructive/30",
};

const STATUS_TONE: Record<string, "success" | "info" | "warning" | "destructive" | "muted"> = {
  draft: "muted", submitted: "info", acknowledged: "info", accepted: "info",
  in_progress: "warning", completed: "success", declined: "destructive",
  cancelled: "muted", pending: "warning",
};

function Referrals() {
  const [rows, setRows] = useState<ReferralRow[] | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ReferralStatus | "all">("all");
  const [urgency, setUrgency] = useState<Urgency | "all">("all");

  useEffect(() => {
    listReferrals({ status, urgency })
      .then(setRows)
      .catch((e) => { toast.error(e instanceof Error ? e.message : "Failed to load"); setRows([]); });
  }, [status, urgency]);

  const filtered = (rows ?? []).filter((r) => {
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return (
      (r.reason ?? "").toLowerCase().includes(needle) ||
      (r.facility ?? "").toLowerCase().includes(needle) ||
      (r.category ?? "").toLowerCase().includes(needle)
    );
  });

  return (
    <AppLayout>
      <PageHeader
        title="Referrals"
        description="Track patients referred to higher-level facilities"
        icon={<Send className="h-5 w-5" />}
        actions={
          <Link to="/referral/new"><Button className="rounded-xl"><Plus className="mr-1 h-4 w-4" /> New referral</Button></Link>
        }
      />

      <div className="flex flex-wrap gap-2 mb-5">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reason, facility…" className="pl-9" />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as ReferralStatus | "all")}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            {["all","draft","submitted","acknowledged","accepted","in_progress","completed","declined","cancelled"].map((s) =>
              <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>
            )}
          </SelectContent>
        </Select>
        <Select value={urgency} onValueChange={(v) => setUrgency(v as Urgency | "all")}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Urgency" /></SelectTrigger>
          <SelectContent>
            {["all","routine","priority","urgent","emergency"].map((u) =>
              <SelectItem key={u} value={u}>{u}</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {rows === null ? (
        <div className="p-10 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No referrals found"
          description="Create the first referral for a person in your caseload."
          action={<Link to="/referral/new"><Button><Plus className="h-4 w-4 mr-1" /> New referral</Button></Link>}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Link key={r.id} to="/referral/$id" params={{ id: r.id }} className="block">
              <Card className="rounded-xl hover-lift">
                <CardContent className="p-5">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 md:flex md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-semibold truncate">{r.category ?? r.reason ?? "Referral"}</div>
                        <Badge variant="outline" className={URGENCY_TONE[r.urgency]}>{r.urgency}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">{r.reason}</div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.facility ?? "—"}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusPill tone={STATUS_TONE[r.status] ?? "muted"}>{r.status.replace("_"," ")}</StatusPill>
                    </div>
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
