import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, EmptyState } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Users, Home, HeartPulse, Baby, AlertTriangle } from "lucide-react";
import { communities } from "@/lib/demo-data";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/communities")({
  component: Communities,
});

function Communities() {
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState<string>("all");
  const allDistricts = useMemo(() => Array.from(new Set(communities.map((c) => c.district))), []);
  const filtered = communities.filter((c) =>
    c.name.toLowerCase().includes(q.toLowerCase()) && (district === "all" || c.district === district),
  );

  return (
    <AppLayout>
      <PageHeader title="Communities" description="Communities under your CHPS zone coverage" icon={<MapPin className="h-5 w-5" />} />

      <div className="flex flex-wrap gap-2 mb-5">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search communities…" className="pl-9" />
        </div>
        <Select value={district} onValueChange={setDistrict}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Filter by district" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All districts</SelectItem>
            {allDistricts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No matching communities" description="Try adjusting the search or district filter." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Link key={c.id} to="/community/$id" params={{ id: c.id }} className="contents">
              <Card className="rounded-xl card-elevated hover-lift cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1"><MapPin className="h-3.5 w-3.5" /> {c.district}</div>
                      <div className="text-lg font-bold truncate">{c.name}</div>
                    </div>
                    <Badge variant="outline" className="bg-success/10 text-success border-success/30 shrink-0">{c.coverage}%</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t">
                    <Stat icon={<Home className="h-3.5 w-3.5" />} label="Households" value={c.households} />
                    <Stat icon={<Users className="h-3.5 w-3.5" />} label="Population" value={c.population} />
                    <Stat icon={<HeartPulse className="h-3.5 w-3.5" />} label="Pregnant" value={c.pregnant} />
                    <Stat icon={<Baby className="h-3.5 w-3.5" />} label="Under 5" value={c.under5} />
                  </div>
                  <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs">
                    <span><span className="text-muted-foreground">CHPS worker: </span><span className="font-medium">{c.worker}</span></span>
                    {c.highRisk > 0 && <span className="inline-flex items-center gap-1 text-destructive font-medium"><AlertTriangle className="h-3 w-3" />{c.highRisk} high-risk</span>}
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

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon} {label}</div>
      <div className="font-semibold mt-0.5 tabular-nums">{value}</div>
    </div>
  );
}
