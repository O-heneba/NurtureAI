import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, RiskBadge, StatCard, EmptyState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { HeartPulse, Plus, Calendar, AlertTriangle, Baby } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { listPregnancies } from "@/lib/registrations";

export const Route = createFileRoute("/maternal")({
  component: Maternal,
});

type PregnancyRow = {
  id: string;
  person_id: string;
  lmp_date: string | null;
  edd_date: string | null;
  anc_visits: number | null;
  status: string | null;
  notes: string | null;
  gravida: number | null;
};

function Maternal() {
  const [pregnancies, setPregnancies] = useState<PregnancyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPregnancies()
      .then(setPregnancies)
      .catch(() => setPregnancies([]))
      .finally(() => setLoading(false));
  }, []);

  const highRiskCount = useMemo(
    () => pregnancies.filter((p) => p.status === "high").length,
    [pregnancies],
  );

  const assessmentsThisWeek = useMemo(
    () => pregnancies.filter((p) => p.anc_visits && p.anc_visits > 0).length,
    [pregnancies],
  );

  if (loading) {
    return (
      <AppLayout>
        <PageHeader title="Maternal Care" description="Loading pregnancy register…" />
        <div className="p-8 text-center text-muted-foreground">Loading pregnancy records...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Maternal Care"
        description="Pregnancy registrations and ANC follow-up"
        actions={
          <Link to="/register/pregnancy">
            <Button className="rounded-xl">
              <Plus className="mr-1 h-4 w-4" /> Register pregnancy
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          label="Pregnant Women"
          value={pregnancies.length}
          icon={<HeartPulse className="h-5 w-5" />}
          tone="primary"
        />
        <StatCard
          label="High-Risk"
          value={highRiskCount}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="destructive"
        />
        <StatCard
          label="ANC visits recorded"
          value={assessmentsThisWeek}
          icon={<Calendar className="h-5 w-5" />}
          tone="info"
        />
        <StatCard
          label="Pregnancy records"
          value={pregnancies.length}
          hint="Live data"
          icon={<Baby className="h-5 w-5" />}
          tone="success"
        />
      </div>

      {pregnancies.length === 0 ? (
        <EmptyState
          title="No pregnancy records yet"
          description="Register the first pregnancy to begin tracking."
        />
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {pregnancies.map((p) => {
            const lmp = p.lmp_date ? new Date(p.lmp_date) : null;
            const now = new Date();
            const weeks = lmp
              ? Math.max(0, Math.floor((now.getTime() - lmp.getTime()) / (1000 * 60 * 60 * 24 * 7)))
              : 0;
            const pct = Math.min(100, Math.round((weeks / 40) * 100));
            return (
              <Link key={p.id} to="/pregnancy/$id" params={{ id: p.id }} className="contents">
                <Card className="rounded-xl card-elevated hover-lift cursor-pointer">
                  <CardHeader className="flex-row items-start justify-between pb-3">
                    <div>
                      <CardTitle className="text-base">Pregnancy ID {p.id.slice(0, 8)}</CardTitle>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Status: {p.status || "Unknown"}
                      </div>
                    </div>
                    <RiskBadge level={p.status === "high" ? "high" : "low"} />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-medium">Gestation</span>
                        <span className="text-muted-foreground">{weeks} weeks</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t text-sm">
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          ANC visits
                        </div>
                        <div className="font-semibold mt-0.5">{p.anc_visits ?? 0} recorded</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          EDD
                        </div>
                        <div className="text-sm mt-0.5">{p.edd_date || "Not set"}</div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {p.notes || "No additional notes."}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
