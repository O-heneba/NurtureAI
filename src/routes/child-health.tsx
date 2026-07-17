import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, StatCard } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Baby, Plus, Syringe, TrendingUp, Activity } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { children } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/child-health")({
  component: ChildHealth,
});

const growthData = [
  { m: "0", w: 3.2 }, { m: "3", w: 5.4 }, { m: "6", w: 7.1 },
  { m: "9", w: 8.2 }, { m: "12", w: 9.1 }, { m: "18", w: 10.4 },
  { m: "24", w: 11.6 }, { m: "36", w: 13.4 },
];

function nutritionColor(n: string) {
  if (n === "Normal") return "bg-success/10 text-success border-success/30";
  if (n === "Underweight") return "bg-warning/15 text-warning border-warning/30";
  return "bg-destructive/10 text-destructive border-destructive/30";
}

function ChildHealth() {
  return (
    <AppLayout>
      <PageHeader
        title="Child Health"
        description="Growth monitoring & immunization tracking for children under 5"
        actions={<Link to="/register/child"><Button className="rounded-xl"><Plus className="mr-1 h-4 w-4" /> Register child</Button></Link>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard label="Under 5" value={214} icon={<Baby className="h-5 w-5" />} tone="primary" />
        <StatCard label="Immunised" value="94%" icon={<Syringe className="h-5 w-5" />} tone="success" />
        <StatCard label="Growth OK" value={188} icon={<TrendingUp className="h-5 w-5" />} tone="info" />
        <StatCard label="At risk" value={26} icon={<Activity className="h-5 w-5" />} tone="warning" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card className="rounded-xl lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Growth chart — Kwame Owusu (3y)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="m" stroke="var(--color-muted-foreground)" fontSize={12} label={{ value: "Age (months)", position: "insideBottom", offset: -4, fontSize: 11 }} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} label={{ value: "Weight (kg)", angle: -90, position: "insideLeft", fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)" }} />
                  <Line type="monotone" dataKey="w" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Immunization timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { v: "BCG + OPV0", w: "At birth", done: true },
              { v: "Penta 1, OPV1", w: "6 weeks", done: true },
              { v: "Penta 2, OPV2", w: "10 weeks", done: true },
              { v: "Penta 3, OPV3", w: "14 weeks", done: true },
              { v: "Measles 1", w: "9 months", done: true },
              { v: "MMR + Yellow fever", w: "18 months", done: false },
            ].map((i) => (
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
      </div>

      <Card className="rounded-xl">
        <CardHeader className="pb-3"><CardTitle className="text-base">Children register</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {children.map((c) => (
              <Link key={c.id} to="/child/$id" params={{ id: c.id }} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 sm:flex sm:items-center hover:bg-accent/40 transition-colors">
                <div className="min-w-0 sm:flex-1">
                  <div className="font-semibold truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.age} · {c.sex === "F" ? "Female" : "Male"} · {c.community}</div>
                </div>
                <div className="hidden sm:block text-sm text-muted-foreground shrink-0 w-32">
                  {c.weight} kg · {c.height} cm
                </div>
                <div className="hidden md:block text-xs text-muted-foreground shrink-0 w-32 truncate">{c.immunization}</div>
                <Badge variant="outline" className={cn("shrink-0", nutritionColor(c.nutrition))}>{c.nutrition}</Badge>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
