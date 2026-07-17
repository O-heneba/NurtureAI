import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, StatCard, EmptyState, AIRecommendationCard } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Baby, Scale, Ruler, Syringe, TrendingUp } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { children } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/child/$id")({
  loader: ({ params }) => {
    const c = children.find((x) => x.id === params.id);
    if (!c) throw notFound();
    return { c };
  },
  component: ChildProfile,
  notFoundComponent: () => (
    <AppLayout>
      <EmptyState title="Child not found" action={<Link to="/child-health"><Button>Back to child health</Button></Link>} />
    </AppLayout>
  ),
});

function weightSeries(current: number) {
  return [
    { m: "0", w: 3.0 }, { m: "3", w: 5.2 }, { m: "6", w: 6.8 },
    { m: "9", w: 7.9 }, { m: "12", w: 8.8 }, { m: "18", w: 10.0 },
    { m: "24", w: 11.4 }, { m: "now", w: current },
  ];
}
function heightSeries(current: number) {
  return [
    { m: "0", h: 50 }, { m: "3", h: 60 }, { m: "6", h: 66 },
    { m: "9", h: 71 }, { m: "12", h: 75 }, { m: "18", h: 82 },
    { m: "24", h: 87 }, { m: "now", h: current },
  ];
}

function ChildProfile() {
  const { c } = Route.useLoaderData();
  const tone = c.nutrition === "Normal" ? "success" : c.nutrition === "Underweight" ? "warning" : "destructive";
  const immTone = c.immunization === "Up-to-date" ? "bg-success/10 text-success border-success/30" : "bg-warning/15 text-warning border-warning/30";

  const schedule = [
    { v: "BCG + OPV0", w: "At birth", done: true },
    { v: "Penta 1, OPV1", w: "6 weeks", done: true },
    { v: "Penta 2, OPV2", w: "10 weeks", done: true },
    { v: "Penta 3, OPV3", w: "14 weeks", done: true },
    { v: "Measles 1", w: "9 months", done: c.immunization !== "Due: Measles" },
    { v: "MMR + Yellow fever", w: "18 months", done: c.immunization === "Up-to-date" },
  ];

  return (
    <AppLayout>
      <PageHeader
        title={c.name}
        description={`${c.age} · ${c.sex === "F" ? "Female" : "Male"} · ${c.community}`}
        icon={<Baby className="h-5 w-5" />}
        breadcrumbs={[{ label: "Child Health", to: "/child-health" }, { label: c.name }]}
        actions={<Badge variant="outline" className={immTone}>{c.immunization}</Badge>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Weight" value={`${c.weight} kg`} icon={<Scale className="h-4 w-4" />} tone="primary" />
        <StatCard label="Height" value={`${c.height} cm`} icon={<Ruler className="h-4 w-4" />} tone="info" />
        <StatCard label="Birth weight" value={`${c.birthWeight} kg`} icon={<Baby className="h-4 w-4" />} tone="success" />
        <StatCard label="Nutrition" value={c.nutrition} icon={<TrendingUp className="h-4 w-4" />} tone={tone} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card className="rounded-xl">
          <CardHeader className="pb-3"><CardTitle className="text-base">Weight history</CardTitle></CardHeader>
          <CardContent><div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightSeries(c.weight)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="m" fontSize={11} stroke="var(--color-muted-foreground)" />
                <YAxis fontSize={11} stroke="var(--color-muted-foreground)" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)" }} />
                <Line type="monotone" dataKey="w" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div></CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardHeader className="pb-3"><CardTitle className="text-base">Height history</CardTitle></CardHeader>
          <CardContent><div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={heightSeries(c.height)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="m" fontSize={11} stroke="var(--color-muted-foreground)" />
                <YAxis fontSize={11} stroke="var(--color-muted-foreground)" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)" }} />
                <Line type="monotone" dataKey="h" stroke="var(--color-success)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div></CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card className="rounded-xl">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Syringe className="h-4 w-4" /> Immunization timeline</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {schedule.map((i) => (
              <div key={i.v} className="flex items-center gap-3">
                <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", i.done ? "bg-success" : "bg-warning ring-2 ring-warning/30")} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{i.v}</div>
                  <div className="text-[11px] text-muted-foreground">{i.w}</div>
                </div>
                {!i.done && <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10 text-[10px]">Due</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <AIRecommendationCard title="Nutrition summary" tone={tone === "success" ? "success" : tone === "warning" ? "warning" : "destructive"}>
            <p>{c.nutrition === "Normal" ? "Growth is on track. Continue balanced complementary feeding with iron-rich local foods." : c.nutrition === "Underweight" ? "Weight-for-age below expected. Increase feeding frequency and enrich meals with groundnut paste and mashed egg yolk." : "Signs of acute malnutrition. Refer for therapeutic feeding programme immediately."}</p>
          </AIRecommendationCard>
          <Card className="rounded-xl">
            <CardHeader className="pb-3"><CardTitle className="text-base">Developmental milestones</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">{c.milestones}</p></CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardHeader className="pb-3"><CardTitle className="text-base">Feeding</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">Breastfeeding: <strong>{c.breastfed}</strong></p></CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
