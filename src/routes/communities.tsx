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
  Plus,
  Users,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { fetchCommunities, sanitizeCommunityRecords } from "@/lib/server.functions";
import { summarizeCommunityMetrics } from "@/lib/community-metrics";
import { listHouseholds, listPersons } from "@/lib/registrations";
import { listAssessments } from "@/lib/assessments";
import { listFollowUps } from "@/lib/followups";
import { toast } from "sonner";
import {
  buildCommunityIssueSignals,
  COMMUNITY_ISSUES,
  type CommunityIssueId,
} from "@/lib/community-issues";
import bundledCommunities from "../../data/northern-ghana-community-records.json";

type CommunityIssueSignal = {
  id: CommunityIssueId;
  label: string;
  householdCount: number;
  communityReported: boolean;
};

type CommunitySummary = {
  id: string;
  name: string;
  district: string | null;
  region: string | null;
  chpsZone: string | null;
  worker: string | null;
  status: string | null;
  peopleRegistered: number;
  households: number;
  pregnant: number;
  under5: number;
  subDistrict: string | null;
  issueSignals: CommunityIssueSignal[];
  priorityHouseholds: number;
  openFollowUps: number;
  overdueFollowUps: number;
};

export const Route = createFileRoute("/communities")({
  component: Communities,
});

function Communities() {
  const fetchCommunitiesFn = useServerFn(fetchCommunities);
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState<string>("all");
  const [region, setRegion] = useState<string>("all");
  const [chpsZone, setChpsZone] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [issue, setIssue] = useState<CommunityIssueId | "all">("all");
  const [sortBy, setSortBy] = useState<"attention" | "people" | "households" | "name">("attention");

  useEffect(() => {
    let active = true;

    async function loadCommunities() {
      try {
        const [rows, households, people, assessments, followUps] = await Promise.all([
          fetchCommunitiesFn(),
          listHouseholds(),
          listPersons(),
          listAssessments(1000),
          listFollowUps({ scope: "all" }),
        ]);

        if (!active) return;

        const sanitized = sanitizeCommunityRecords(
          rows as Array<Record<string, unknown>>,
          bundledCommunities as Array<Record<string, unknown>>,
        );
        const personById = new Map(people.map((person) => [person.id, person]));
        const householdById = new Map(
          households.flatMap((household) => [
            [household.id, household] as const,
            ...(household.localId ? ([[household.localId, household]] as const) : []),
          ]),
        );
        const canonicalHouseholdId = (id: string) => householdById.get(id)?.id ?? id;
        const personReports = assessments.flatMap((assessment) => {
          if (assessment.inputs?.status === "draft" || !Array.isArray(assessment.inputs?.context_issues)) {
            return [];
          }
          const person = assessment.person_id ? personById.get(assessment.person_id) : undefined;
          if (!person?.household_id) return [];
          return [
            {
              id: person.id,
              household_id: canonicalHouseholdId(person.household_id),
              context_issues: assessment.inputs.context_issues as string[],
              priority: assessment.inputs?.priority ?? assessment.risk_level,
              status: assessment.inputs?.status,
            },
          ];
        });
        const issueSignals = buildCommunityIssueSignals(
          sanitized.map((row) => ({
            id: String(row.id ?? row.community_code ?? row.name),
            common_health_challenges: Array.isArray(row.common_health_challenges)
              ? (row.common_health_challenges as string[])
              : [],
          })),
          households,
          personReports,
        );
        const priorityCommunityIds = new Map<string, Set<string>>();
        const followUpCounts = new Map<string, { open: number; overdue: number }>();

        for (const household of households) {
          if (!household.community_id) continue;
          if (!["priority", "urgent"].includes(household.priority_status ?? "")) continue;
          const prioritySet = priorityCommunityIds.get(household.community_id) ?? new Set<string>();
          prioritySet.add(household.id);
          priorityCommunityIds.set(household.community_id, prioritySet);
        }

        const latestAssessmentByPerson = new Map<
          string,
          (typeof assessments)[number]
        >();
        for (const assessment of [...assessments].sort((left, right) =>
          left.created_at.localeCompare(right.created_at),
        )) {
          if (assessment.person_id) latestAssessmentByPerson.set(assessment.person_id, assessment);
        }

        for (const assessment of latestAssessmentByPerson.values()) {
          if (assessment.inputs?.status === "draft" || !assessment.person_id) continue;
          const person = personById.get(assessment.person_id);
          const household = person?.household_id
            ? householdById.get(person.household_id)
            : undefined;
          if (!household?.community_id) continue;
          const priority = String(assessment.inputs?.priority ?? assessment.risk_level ?? "").toLowerCase();
          if (!["priority_review", "urgent", "high", "critical"].includes(priority)) continue;
          const prioritySet = priorityCommunityIds.get(household.community_id) ?? new Set<string>();
          prioritySet.add(household.id);
          priorityCommunityIds.set(household.community_id, prioritySet);
        }

        const today = new Date().toISOString().slice(0, 10);
        for (const followUp of followUps) {
          if (["completed", "cancelled", "draft"].includes(followUp.status)) continue;
          const person = followUp.person_id ? personById.get(followUp.person_id) : undefined;
          const household = followUp.household_id
            ? householdById.get(followUp.household_id)
            : person?.household_id
              ? householdById.get(person.household_id)
              : undefined;
          const communityId = followUp.community_id ?? household?.community_id;
          if (!communityId) continue;
          const counts = followUpCounts.get(communityId) ?? { open: 0, overdue: 0 };
          counts.open += 1;
          if (followUp.due_date < today || followUp.status === "missed") counts.overdue += 1;
          followUpCounts.set(communityId, counts);
        }

        setCommunities(
          summarizeCommunityMetrics(
            sanitized.map((row) => ({
              id: String(row.id ?? row.community_code ?? row.name),
              name: String(row.name ?? "Unknown community"),
              district: typeof row.district === "string" ? row.district : null,
              region: typeof row.region === "string" ? row.region : null,
              sub_district: typeof row.sub_district === "string" ? row.sub_district : null,
              chps_zone: typeof row.chps_zone === "string" ? row.chps_zone : null,
              status: typeof row.status === "string" ? row.status : null,
            })),
            households as Array<{ id: string; community_id?: string | null }>,
            people as Array<{ id: string; household_id?: string | null; profile_types?: string[] | null; date_of_birth?: string | null }>,
          ).map((row) => ({
            id: row.id,
            name: row.name,
            district: row.district,
            region: row.region,
            chpsZone: row.chpsZone,
            worker: row.worker,
            status: row.status,
            peopleRegistered: row.peopleRegistered,
            households: row.households,
            pregnant: row.pregnant,
            under5: row.under5,
            subDistrict: row.subDistrict,
            issueSignals:
              issueSignals.find((signal) => signal.communityId === row.id)?.issues ?? [],
            priorityHouseholds: priorityCommunityIds.get(row.id)?.size ?? 0,
            openFollowUps: followUpCounts.get(row.id)?.open ?? 0,
            overdueFollowUps: followUpCounts.get(row.id)?.overdue ?? 0,
          })),
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? `Community indicators could not be loaded: ${error.message}`
            : "Community indicators could not be loaded. Showing community records without issue summaries.",
        );
        const fallback = sanitizeCommunityRecords(
          [],
          bundledCommunities as Array<Record<string, unknown>>,
        );

        if (active) {
          setCommunities(
            summarizeCommunityMetrics(
              fallback.map((row) => ({
                id: String(row.id ?? row.community_code ?? row.name),
                name: String(row.name ?? "Unknown community"),
                district: typeof row.district === "string" ? row.district : null,
                region: typeof row.region === "string" ? row.region : null,
                sub_district: typeof row.sub_district === "string" ? row.sub_district : null,
                chps_zone: typeof row.chps_zone === "string" ? row.chps_zone : null,
                status: typeof row.status === "string" ? row.status : null,
              })),
              [],
              [],
            ).map((row) => ({
              id: row.id,
              name: row.name,
              district: row.district,
              region: row.region,
              chpsZone: row.chpsZone,
              worker: row.worker,
              status: row.status,
              peopleRegistered: row.peopleRegistered,
              households: row.households,
              pregnant: row.pregnant,
              under5: row.under5,
              subDistrict: row.subDistrict,
              issueSignals: [],
              priorityHouseholds: 0,
              openFollowUps: 0,
              overdueFollowUps: 0,
            })),
          );
        }
      }
    }

    loadCommunities();
    return () => { active = false; };
  }, []);

  const accessibleCommunities = communities;

  const allDistricts = useMemo(
    () =>
      Array.from(
        new Set(
          accessibleCommunities
            .filter((c) => region === "all" || c.region === region)
            .map((c) => c.district)
            .filter(Boolean),
        ),
      ) as string[],
    [accessibleCommunities, region],
  );
  const allRegions = useMemo(
    () =>
      Array.from(new Set(accessibleCommunities.map((c) => c.region).filter(Boolean))) as string[],
    [accessibleCommunities],
  );
  const allChpsZones = useMemo(
    () =>
      Array.from(
        new Set(
          accessibleCommunities
            .filter(
              (c) =>
                (region === "all" || c.region === region) &&
                (district === "all" || c.district === district),
            )
            .map((c) => c.chpsZone)
            .filter(Boolean),
        ),
      ) as string[],
    [accessibleCommunities, region, district],
  );

  useEffect(() => {
    if (district !== "all" && !allDistricts.includes(district)) {
      setDistrict("all");
    }
  }, [allDistricts, district]);

  useEffect(() => {
    if (chpsZone !== "all" && !allChpsZones.includes(chpsZone)) {
      setChpsZone("all");
    }
  }, [allChpsZones, chpsZone]);

  const filtered = useMemo(() => {
    const next = accessibleCommunities.filter((c) => {
      const haystack =
        `${c.name} ${c.district ?? ""} ${c.subDistrict ?? ""} ${c.chpsZone ?? ""} ${c.worker ?? ""}`.toLowerCase();
      const matchesQuery = haystack.includes(q.toLowerCase());
      const matchesDistrict = district === "all" || c.district === district;
      const matchesRegion = region === "all" || c.region === region;
      const matchesZone = chpsZone === "all" || c.chpsZone === chpsZone;
      const matchesStatus = status === "all" || c.status === status;
      const matchesIssue =
        issue === "all" || c.issueSignals.some((signal) => signal.id === issue);
      return (
        matchesQuery &&
        matchesDistrict &&
        matchesRegion &&
        matchesZone &&
        matchesStatus &&
        matchesIssue
      );
    });

    next.sort((a, b) => {
      if (sortBy === "attention") {
        return (
          b.priorityHouseholds - a.priorityHouseholds ||
          b.overdueFollowUps - a.overdueFollowUps ||
          Math.max(...b.issueSignals.map((signal) => signal.householdCount), 0) -
            Math.max(...a.issueSignals.map((signal) => signal.householdCount), 0) ||
          a.name.localeCompare(b.name)
        );
      }
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "households") return b.households - a.households;
      return b.peopleRegistered - a.peopleRegistered;
    });

    return next;
  }, [accessibleCommunities, q, district, region, chpsZone, status, issue, sortBy]);

  return (
    <AppLayout>
      <PageHeader
        title="Communities"
        description="Registered households and people across your communities"
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
        <Select
          value={district}
          onValueChange={(value) => {
            setDistrict(value);
            setChpsZone("all");
          }}
        >
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
        <Select
          value={region}
          onValueChange={(value) => {
            setRegion(value);
            setDistrict("all");
            setChpsZone("all");
          }}
        >
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
        <Select value={issue} onValueChange={(value) => setIssue(value as CommunityIssueId | "all")}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filter by recorded issue" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All recorded issues</SelectItem>
            {COMMUNITY_ISSUES.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={sortBy}
          onValueChange={(v) =>
            setSortBy(v as "attention" | "people" | "households" | "name")
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="attention">Needs attention</SelectItem>
            <SelectItem value="people">People registered</SelectItem>
            <SelectItem value="households">Households registered</SelectItem>
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
                  </div>
                  <div
                    className="mb-3 flex flex-wrap gap-1.5"
                    aria-label="Community priority indicators"
                  >
                    {c.priorityHouseholds > 0 && (
                      <Badge variant="destructive">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        {c.priorityHouseholds} priority household
                        {c.priorityHouseholds === 1 ? "" : "s"}
                      </Badge>
                    )}
                    {c.overdueFollowUps > 0 && (
                      <Badge variant="destructive">
                        <CalendarClock className="mr-1 h-3 w-3" />
                        {c.overdueFollowUps} overdue follow-up
                        {c.overdueFollowUps === 1 ? "" : "s"}
                      </Badge>
                    )}
                    {c.openFollowUps > c.overdueFollowUps && (
                      <Badge variant="outline">
                        {c.openFollowUps - c.overdueFollowUps} upcoming follow-up
                        {c.openFollowUps - c.overdueFollowUps === 1 ? "" : "s"}
                      </Badge>
                    )}
                    {c.priorityHouseholds === 0 && c.overdueFollowUps === 0 && (
                      <Badge variant="secondary">No recorded priority indicators</Badge>
                    )}
                  </div>
                  {c.issueSignals.length > 0 && (
                    <div className="mb-3">
                      <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                        Recorded community issues
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[...c.issueSignals]
                          .sort((a, b) => b.householdCount - a.householdCount)
                          .slice(0, 3)
                          .map((signal) => (
                            <Badge key={signal.id} variant="outline">
                              {signal.label}
                              {signal.householdCount > 0 && ` · ${signal.householdCount}`}
                              {signal.communityReported && signal.householdCount === 0 && " · reported"}
                            </Badge>
                          ))}
                        {c.issueSignals.length > 3 && (
                          <Badge variant="secondary">+{c.issueSignals.length - 3} more</Badge>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t">
                    <Stat
                      icon={<Home className="h-3.5 w-3.5" />}
                      label="Households registered"
                      value={c.households}
                    />
                    <Stat
                      icon={<Users className="h-3.5 w-3.5" />}
                      label="People registered"
                      value={c.peopleRegistered}
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
