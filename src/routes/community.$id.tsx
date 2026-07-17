import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, StatCard, EmptyState, AIRecommendationCard } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Home, HeartPulse, Baby, AlertTriangle, Calendar, Send, ClipboardCheck } from "lucide-react";
import { communities, households, householdAssessments, referrals, upcomingVisits } from "@/lib/demo-data";

export const Route = createFileRoute("/community/$id")({
  loader: ({ params }) => {
    const c = communities.find((x) => x.id === params.id);
    if (!c) throw notFound();
    return { c };
  },
  component: CommunityDetail,
  notFoundComponent: () => (
    <AppLayout>
      <EmptyState title="Community not found" description="This community may have been removed or moved." action={<Link to="/communities"><Button>Back to communities</Button></Link>} />
    </AppLayout>
  ),
});

function CommunityDetail() {
  const { c } = Route.useLoaderData();
  const localHouseholds = households.filter((h) => h.community === c.name);
  const localAssessments = householdAssessments.filter((a) => localHouseholds.some((h) => h.id === a.householdId));
  const localReferrals = referrals.filter((r) => localHouseholds.some((h) => h.head === r.patient) || r.patient.includes(c.name));
  const localVisits = upcomingVisits.filter((v) => v.community === c.name);

  return (
    <AppLayout>
      <PageHeader
        title={c.name}
        description={`${c.district} · CHPS worker: ${c.worker}`}
        icon={<MapPin className="h-5 w-5" />}
        breadcrumbs={[{ label: "Communities", to: "/communities" }, { label: c.name }]}
        actions={<Badge variant="outline" className="bg-success/10 text-success border-success/30">{c.coverage}% coverage</Badge>}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <StatCard label="Households" value={c.households} icon={<Home className="h-5 w-5" />} tone="primary" />
        <StatCard label="Population" value={c.population} icon={<Users className="h-5 w-5" />} tone="info" />
        <StatCard label="Pregnant" value={c.pregnant} icon={<HeartPulse className="h-5 w-5" />} tone="success" />
        <StatCard label="Under 5" value={c.under5} icon={<Baby className="h-5 w-5" />} tone="warning" />
        <StatCard label="High-Risk" value={c.highRisk} icon={<AlertTriangle className="h-5 w-5" />} tone="destructive" />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="rounded-xl mb-4 overflow-x-auto flex w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="households">Households</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="visits">Upcoming visits</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <AIRecommendationCard title={`Focus areas in ${c.name}`}>
            <p>Prioritise ANC follow-up for {c.pregnant} pregnant women and complete the pending immunisations for children under 5. Coverage sits at <strong>{c.coverage}%</strong>; targeted home visits in the next 2 weeks could push this above 90%.</p>
          </AIRecommendationCard>
          <Card className="rounded-xl">
            <CardHeader className="pb-3"><CardTitle className="text-base">Community summary</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
              <div><div className="text-xs text-muted-foreground">District</div><div className="font-medium">{c.district}</div></div>
              <div><div className="text-xs text-muted-foreground">Assigned worker</div><div className="font-medium">{c.worker}</div></div>
              <div><div className="text-xs text-muted-foreground">Households</div><div className="font-medium">{c.households}</div></div>
              <div><div className="text-xs text-muted-foreground">Population</div><div className="font-medium">{c.population}</div></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="households">
          <Card className="rounded-xl"><CardContent className="p-0 divide-y">
            {localHouseholds.length === 0 && <div className="p-6"><EmptyState title="No households listed yet" /></div>}
            {localHouseholds.map((h) => (
              <Link key={h.id} to="/household/$id" params={{ id: h.id }} className="flex items-center gap-3 p-4 hover:bg-accent/40 transition-colors">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Home className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{h.head}</div>
                  <div className="text-xs text-muted-foreground truncate">{h.houseNo} · {h.members} members · {h.address}</div>
                </div>
                <Badge variant="outline" className="capitalize">{h.risk}</Badge>
              </Link>
            ))}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Avg household size" value={(c.population / c.households).toFixed(1)} icon={<Users className="h-5 w-5" />} tone="info" />
            <StatCard label="Assessments this month" value={localAssessments.length + 12} icon={<ClipboardCheck className="h-5 w-5" />} tone="primary" />
            <StatCard label="Referrals" value={localReferrals.length} icon={<Send className="h-5 w-5" />} tone="warning" />
          </div>
        </TabsContent>

        <TabsContent value="assessments">
          <Card className="rounded-xl"><CardContent className="p-0 divide-y">
            {localAssessments.length === 0 && <div className="p-6"><EmptyState title="No recent assessments" /></div>}
            {localAssessments.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{a.patient} — {a.type}</div>
                  <div className="text-xs text-muted-foreground truncate">{a.date} · {a.summary}</div>
                </div>
                <Badge variant="outline" className="capitalize">{a.risk}</Badge>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="referrals">
          <Card className="rounded-xl"><CardContent className="p-0 divide-y">
            {localReferrals.length === 0 && <div className="p-6"><EmptyState title="No pending referrals" /></div>}
            {localReferrals.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{r.patient} → {r.to}</div>
                  <div className="text-xs text-muted-foreground truncate">{r.reason}</div>
                </div>
                <Badge variant="outline" className="capitalize">{r.priority}</Badge>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="visits">
          <Card className="rounded-xl"><CardContent className="p-0 divide-y">
            {localVisits.length === 0 && <div className="p-6"><EmptyState title="No upcoming visits" /></div>}
            {localVisits.map((v) => (
              <div key={v.id} className="flex items-center gap-3 p-4">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-info/10 text-info"><Calendar className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{v.patient} — {v.type}</div>
                  <div className="text-xs text-muted-foreground">{v.when}</div>
                </div>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
