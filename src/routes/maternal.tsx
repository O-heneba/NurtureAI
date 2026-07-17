import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, RiskBadge, StatCard } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { HeartPulse, Plus, Calendar, AlertTriangle, Baby } from "lucide-react";
import { pregnancies } from "@/lib/demo-data";

export const Route = createFileRoute("/maternal")({
  component: Maternal,
});

function Maternal() {
  const high = pregnancies.filter((p) => p.risk === "high").length;
  return (
    <AppLayout>
      <PageHeader
        title="Maternal Care"
        description="Pregnancy registrations and ANC follow-up"
        actions={<Link to="/register/pregnancy"><Button className="rounded-xl"><Plus className="mr-1 h-4 w-4" /> Register pregnancy</Button></Link>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard label="Pregnant Women" value={38} icon={<HeartPulse className="h-5 w-5" />} tone="primary" />
        <StatCard label="High-Risk" value={high + 3} icon={<AlertTriangle className="h-5 w-5" />} tone="destructive" />
        <StatCard label="ANC This Week" value={11} icon={<Calendar className="h-5 w-5" />} tone="info" />
        <StatCard label="Deliveries" value={4} hint="Last 30 days" icon={<Baby className="h-5 w-5" />} tone="success" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {pregnancies.map((p) => {
          const gwk = parseInt(p.gestation);
          const pct = Math.round((gwk / 40) * 100);
          return (
            <Link key={p.id} to="/pregnancy/$id" params={{ id: p.id }} className="contents"><Card className="rounded-xl card-elevated hover-lift cursor-pointer">
              <CardHeader className="flex-row items-start justify-between pb-3">
                <div>
                  <CardTitle className="text-base">{p.mother}</CardTitle>
                  <div className="text-xs text-muted-foreground mt-0.5">{p.age} yrs · {p.community}</div>
                </div>
                <RiskBadge level={p.risk} />
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium">Gestation · {p.gestation}</span>
                    <span className="text-muted-foreground">EDD {p.edd}</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">ANC visits</div>
                    <div className="font-semibold mt-0.5">{p.anc} of 8</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Notes</div>
                    <div className="text-sm mt-0.5 truncate">{p.notes}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppLayout>
  );
}
