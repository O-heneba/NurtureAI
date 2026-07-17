import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, RiskBadge, EmptyState, AIRecommendationCard, StatCard } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { HeartPulse, Calendar, Send, Activity, Scale } from "lucide-react";
import { pregnancies, ancHistory } from "@/lib/demo-data";

export const Route = createFileRoute("/pregnancy/$id")({
  loader: ({ params }) => {
    const pr = pregnancies.find((x) => x.id === params.id);
    if (!pr) throw notFound();
    return { pr };
  },
  component: PregnancyProfile,
  notFoundComponent: () => (
    <AppLayout>
      <EmptyState title="Pregnancy record not found" action={<Link to="/maternal"><Button>Back to maternal care</Button></Link>} />
    </AppLayout>
  ),
});

function PregnancyProfile() {
  const { pr } = Route.useLoaderData();
  const gwk = parseInt(pr.gestation);
  const pct = Math.round((gwk / 40) * 100);
  const anc = ancHistory[pr.id] ?? [];

  return (
    <AppLayout>
      <PageHeader
        title={pr.mother}
        description={`${pr.age}y · ${pr.community} · ${pr.gravida}`}
        icon={<HeartPulse className="h-5 w-5" />}
        breadcrumbs={[{ label: "Maternal Care", to: "/maternal" }, { label: pr.mother }]}
        actions={<RiskBadge level={pr.risk} />}
      />

      <Card className="rounded-xl mb-4">
        <CardContent className="p-5">
          <div className="flex justify-between mb-2 text-sm">
            <span className="font-semibold">Gestation · {pr.gestation}</span>
            <span className="text-muted-foreground">EDD {pr.edd}</span>
          </div>
          <Progress value={pct} className="h-3" />
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            <span>Trimester 1</span><span>Trimester 2</span><span>Trimester 3</span><span>Term</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="ANC visits" value={`${pr.anc}/8`} icon={<Calendar className="h-4 w-4" />} tone="primary" />
        <StatCard label="BP" value={pr.bp} icon={<Activity className="h-4 w-4" />} tone={pr.risk === "high" ? "destructive" : "info"} />
        <StatCard label="Weight" value={`${pr.weight} kg`} icon={<Scale className="h-4 w-4" />} tone="success" />
        <StatCard label="Risk" value={pr.risk} icon={<HeartPulse className="h-4 w-4" />} tone={pr.risk === "high" ? "destructive" : pr.risk === "medium" ? "warning" : "success"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card className="rounded-xl">
          <CardHeader className="pb-3"><CardTitle className="text-base">ANC history</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {anc.length === 0 && <div className="p-6"><EmptyState title="No ANC visits yet" /></div>}
              {anc.map((a) => (
                <div key={a.visit} className="p-4">
                  <div className="flex justify-between text-sm font-medium"><span>{a.visit}</span><span className="text-muted-foreground text-xs">{a.date}</span></div>
                  <div className="text-xs text-muted-foreground mt-0.5">BP {a.bp} · {a.weight} kg</div>
                  <div className="text-sm mt-1">{a.notes}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <AIRecommendationCard title="AI recommendation" tone={pr.risk === "high" ? "destructive" : "primary"}>
            <p>{pr.risk === "high" ? "Elevated BP with symptomatic complaints — refer to a higher-level facility for confirmatory workup. Recheck vitals within 4 hours." : "Continue routine ANC schedule. Reinforce iron/folate compliance and danger-sign education."}</p>
          </AIRecommendationCard>
          <Card className="rounded-xl">
            <CardHeader className="pb-3"><CardTitle className="text-base">Clinical notes</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">{pr.notes}</p></CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardHeader className="pb-3"><CardTitle className="text-base">Referral status</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{pr.risk === "high" ? "Urgent referral in transit to KATH" : "No active referral"}</span>
              <Link to="/referrals"><Button size="sm" variant="outline" className="rounded-lg"><Send className="mr-1 h-3.5 w-3.5" /> View</Button></Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
