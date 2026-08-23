import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, EmptyState } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MapPin,
  Home,
  HeartPulse,
  Baby,
  AlertTriangle,
  Plus,
  TrendingUp,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { listCommunities } from "@/lib/registrations";
import { useAuth } from "@/hooks/use-auth";

type CommunitySummary = {
  id: string;
  name: string;
  district: string | null;
  region: string | null;
  chpsZone: string | null;
  worker: string | null;
  status: string | null;
  population: number;
  coverage: number;
  households: number;
  pregnant: number;
  under5: number;
  highRisk: number;
  dataCoverageIncomplete: boolean;
  subDistrict: string | null;
};

export const Route = createFileRoute("/communities")({
  component: Communities,
});

function Communities() {
  const { roles } = useAuth();
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState<string>("all");
  const [region, setRegion] = useState<string>("all");
  const [chpsZone, setChpsZone] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"coverage" | "population" | "name">("coverage");

  useEffect(() => {
    listCommunities()
      .then((rows) =>
        setCommunities(
          rows.map((row) => ({
            id: row.id,
            name: row.name,
            district: null,
            region: null,
            chpsZone: null,
            worker: null,
            status: "active",
            population: 0,
            coverage: 0,
            households: 0,
            pregnant: 0,
            under5: 0,
            highRisk: 0,
            dataCoverageIncomplete: false,
            subDistrict: null,
          })),
        ),
      )
      .catch(() => setCommunities([]));
  }, []);

  const accessibleCommunities = useMemo(() => {
    if (!roles.length) return [];
    return communities;
  }, [communities, roles]);

  const allDistricts = useMemo(
    () => Array.from(new Set(accessibleCommunities.map((c) => c.district).filter(Boolean))) as string[],
    [accessibleCommunities],
  );
  const allRegions = useMemo(
    () => Array.from(new Set(accessibleCommunities.map((c) => c.region).filter(Boolean))) as string[],
    [accessibleCommunities],
  );
  const allChpsZones = useMemo(
    () => Array.from(new Set(accessibleCommunities.map((c) => c.chpsZone).filter(Boolean))) as string[],
    [accessibleCommunities],
  );

  const filtered = useMemo(() => {
    const next = accessibleCommunities.filter((c) => {
      const haystack = `${c.name} ${c.district ?? ""} ${c.subDistrict ?? ""} ${c.chpsZone ?? ""} ${c.worker ?? ""}`.toLowerCase();
      const matchesQuery = haystack.includes(q.toLowerCase());
      const matchesDistrict = district === "all" || c.district === district;
      const matchesRegion = region === "all" || c.region === region;
      const matchesZone = chpsZone === "all" || c.chpsZone === chpsZone;
      const matchesStatus = status === "all" || c.status === status;
      return matchesQuery && matchesDistrict && matchesRegion && matchesZone && matchesStatus;
    });

    next.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "population") return b.population - a.population;
      return b.coverage - a.coverage;
    });

    return next;
  }, [accessibleCommunities, q, district, region, chpsZone, status, sortBy]);

  return (
    <AppLayout>
      <PageHeader
        title="Communities"
        description="Communities under your CHPS zone coverage"
        icon={<MapPin className="h-5 w-5" />}
        actions={
          <Link to="/community/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New community
            </Button>
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2 mb-5">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search communities…"
            className="pl-9"
          />
        </div>
        <Select value={district} onValueChange={setDistrict}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filter by district" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All districts</SelectItem>
            {allDistricts.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filter by region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All regions</SelectItem>
            {allRegions.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={chpsZone} onValueChange={setChpsZone}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filter by CHPS zone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All CHPS zones</SelectItem>
            {allChpsZones.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="needs_attention">Needs attention</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={sortBy}
          onValueChange={(v) => setSortBy(v as "coverage" | "population" | "name")}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="coverage">Coverage %</SelectItem>
            <SelectItem value="population">Population</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No matching communities"
          description="Try adjusting the search or filters."
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Link key={c.id} to="/community/$id" params={{ id: c.id }} className="contents">
              <Card className="rounded-xl card-elevated hover-lift cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <MapPin className="h-3.5 w-3.5" /> {c.district}
                      </div>
                      <div className="text-lg font-bold truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {c.chpsZone} · {c.region}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-success/10 text-success border-success/30 shrink-0"
                    >
                      {c.coverage}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t">
                    <Stat
                      icon={<Home className="h-3.5 w-3.5" />}
                      label="Households"
                      value={c.households}
                    />
                    <Stat
                      icon={<Users className="h-3.5 w-3.5" />}
                      label="Population"
                      value={c.population}
                    />
                    <Stat
                      icon={<HeartPulse className="h-3.5 w-3.5" />}
                      label="Pregnant"
                      value={c.pregnant}
                    />
                    <Stat
                      icon={<Baby className="h-3.5 w-3.5" />}
                      label="Under 5"
                      value={c.under5}
                    />
                  </div>
                  <div className="mt-4 pt-4 border-t space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">CHPS worker</span>
                      <span className="font-medium">{c.worker}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Coverage status</span>
                      <span className="font-medium">
                        {c.coverage >= 85
                          ? "On track"
                          : c.coverage >= 75
                            ? "Needs follow-up"
                            : "Below target"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Data coverage</span>
                      <span
                        className={`font-medium ${c.dataCoverageIncomplete ? "text-warning" : "text-success"}`}
                      >
                        {c.dataCoverageIncomplete ? "Incomplete" : "Complete"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <TrendingUp className="h-3.5 w-3.5" /> {c.coverage}% complete
                    </div>
                    {c.highRisk > 0 && (
                      <span className="inline-flex items-center gap-1 text-destructive font-medium">
                        <AlertTriangle className="h-3 w-3" />
                        {c.highRisk} high-risk
                      </span>
                    )}
                    {c.dataCoverageIncomplete && (
                      <span className="inline-flex items-center gap-1 text-warning font-medium">
                        <ShieldAlert className="h-3 w-3" />
                        Needs update
                      </span>
                    )}
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
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <div className="font-semibold mt-0.5 tabular-nums">{value}</div>
    </div>
  );
}
