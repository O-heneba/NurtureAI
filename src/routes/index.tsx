import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { StatCard } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarCheck,
  AlertTriangle,
  Send,
  UserPlus,
  ClipboardCheck,
  Apple,
  Wifi,
  Home as HomeIcon,
  RefreshCw,
  Sparkles,
  MapPin,
  Search,
  ChevronRight,
  Users,
  HeartPulse,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSyncStatus } from "@/hooks/use-sync-status";
import { cn } from "@/lib/utils";
import { syncQueueStore } from "@/lib/storage/local-store";
import type { SyncQueueOperation } from "@/lib/storage/types";
import { syncManager } from "@/lib/storage/sync-manager";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listAssessments } from "@/lib/assessments";
import { listReferrals } from "@/lib/referrals";
import { listFollowUps } from "@/lib/followups";
import { listWorkflowHouseholds, listWorkflowPersons } from "@/lib/household-person.service";
import { fetchCommunities, sanitizeCommunityRecords } from "@/lib/server.functions";
import {
  buildCommunityIssueSignals,
  COMMUNITY_ISSUES,
  type CommunityIssueId,
} from "@/lib/community-issues";
import bundledCommunities from "../../data/northern-ghana-community-records.json";
import { useAI } from "@/ai";
import { toast } from "sonner";

type DashboardCommunity = {
  id: string;
  name: string;
  district: string | null;
  region: string | null;
  priorityHouseholds: number;
  overdueFollowUps: number;
  upcomingFollowUps: number;
  issueSignals: Array<{
    id: CommunityIssueId;
    label: string;
    householdCount: number;
    communityReported: boolean;
  }>;
};

type ReferralAttention = {
  id: string;
  personName: string;
  facility: string | null;
  urgency: string;
  status: string;
  createdAt: string;
  action: string;
};

export const Route = createFileRoute("/")({
  component: Dashboard,
});

const quickActions = [
  {
    to: "/households",
    label: "Register Household",
    icon: HomeIcon,
    tone: "bg-primary/10 text-primary",
  },
  { to: "/people", label: "Register Person", icon: UserPlus, tone: "bg-info/10 text-info" },
  {
    to: "/assessments",
    label: "Start Assessment",
    icon: ClipboardCheck,
    tone: "bg-success/10 text-success",
  },
  { to: "/referrals", label: "Create Referral", icon: Send, tone: "bg-warning/15 text-warning" },
  {
    to: "/nutrition",
    label: "Nutrition Assistant",
    icon: Apple,
    tone: "bg-destructive/10 text-destructive",
  },
];

function Dashboard() {
  const { profile } = useAuth();
  const sync = useSyncStatus();
  const ai = useAI();
  const navigate = useNavigate();
  const fetchCommunitiesFn = useServerFn(fetchCommunities);
  const [showPending, setShowPending] = useState(false);
  const [operations, setOperations] = useState<SyncQueueOperation[]>([]);
  const [communities, setCommunities] = useState<DashboardCommunity[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [newAssessmentCount, setNewAssessmentCount] = useState(0);
  const [referralAttention, setReferralAttention] = useState<{
    awaitingAcknowledgment: number;
    urgentOpen: number;
    items: ReferralAttention[];
  }>({ awaitingAcknowledgment: 0, urgentOpen: 0, items: [] });
  const [communitySearch, setCommunitySearch] = useState("");
  const [issueFilter, setIssueFilter] = useState<CommunityIssueId | "all">("all");
  const [attentionFilter, setAttentionFilter] = useState<
    "all" | "attention" | "priority" | "overdue" | "upcoming"
  >("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [recentActivities, setRecentActivities] = useState<
    Array<{ id: string; text: string; time: string; tone: string }>
  >([]);
  const [upcomingVisits, setUpcomingVisits] = useState<
    Array<{ id: string; patient: string; type: string; when: string }>
  >([]);
  const userName = profile?.full_name?.split(" ")[0] || "User";
  const facility = profile?.facility || "CHPS Facility";

  function showCommunityPriorities(filter: "attention" | "priority" | "overdue" | "upcoming") {
    setIssueFilter("all");
    setAttentionFilter(filter);
    document.getElementById("community-care-priorities")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function prepareOfflineAI() {
    try {
      await ai.initialize();
      toast.success("Offline AI is ready on this device.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Offline AI could not be prepared.");
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      listAssessments(1000),
      listReferrals(),
      listFollowUps({ scope: "all" }),
      listWorkflowPersons(),
      listWorkflowHouseholds(),
      fetchCommunitiesFn(),
    ])
      .then(([assessments, referrals, followUps, persons, households, communityRows]) => {
        if (!active) return;

        const sanitizedCommunities = sanitizeCommunityRecords(
          communityRows as Array<Record<string, unknown>>,
          bundledCommunities as Array<Record<string, unknown>>,
        );
        const personNames = new Map(persons.map((person) => [person.id, person.full_name]));
        const personById = new Map(
          persons.flatMap((person) => [
            [person.id, person] as const,
            ...(person.localId ? ([[person.localId, person]] as const) : []),
          ]),
        );
        const householdNames = new Map(
          households.map((household) => [household.id, household.head_name]),
        );
        const householdById = new Map(
          households.flatMap((household) => [
            [household.id, household] as const,
            ...(household.localId ? ([[household.localId, household]] as const) : []),
          ]),
        );
        const canonicalHouseholdId = (id: string) => householdById.get(id)?.id ?? id;
        const personReports = assessments.flatMap((assessment) => {
          if (
            assessment.inputs?.status === "draft" ||
            !Array.isArray(assessment.inputs?.context_issues)
          ) {
            return [];
          }
          const person = assessment.person_id ? personById.get(assessment.person_id) : undefined;
          if (!person?.household_id) return [];
          return [
            {
              id: person.id,
              household_id: canonicalHouseholdId(person.household_id),
              context_issues: assessment.inputs.context_issues as string[],
            },
          ];
        });
        const issueSignals = buildCommunityIssueSignals(
          sanitizedCommunities.map((row) => ({
            id: String(row.id ?? row.community_code ?? row.name),
            common_health_challenges: Array.isArray(row.common_health_challenges)
              ? (row.common_health_challenges as string[])
              : [],
          })),
          households,
          personReports,
        );
        const priorityHouseholdsByCommunity = new Map<string, Set<string>>();
        for (const household of households) {
          if (
            household.community_id &&
            ["priority", "urgent"].includes((household.priority_status ?? "").toLowerCase())
          ) {
            const priorityHouseholds =
              priorityHouseholdsByCommunity.get(household.community_id) ?? new Set<string>();
            priorityHouseholds.add(household.id);
            priorityHouseholdsByCommunity.set(household.community_id, priorityHouseholds);
          }
        }
        const latestAssessmentByPerson = new Map<string, (typeof assessments)[number]>();
        for (const assessment of [...assessments].sort((left, right) =>
          left.created_at.localeCompare(right.created_at),
        )) {
          if (!assessment.person_id) continue;
          const person = personById.get(assessment.person_id);
          latestAssessmentByPerson.set(person?.id ?? assessment.person_id, assessment);
        }
        for (const [personId, assessment] of latestAssessmentByPerson) {
          if (assessment.inputs?.status === "draft") continue;
          const person = personById.get(personId);
          const household = person?.household_id
            ? householdById.get(person.household_id)
            : undefined;
          if (!household?.community_id) continue;
          const priority = String(
            assessment.inputs?.priority ?? assessment.risk_level ?? "",
          ).toLowerCase();
          if (!["priority_review", "urgent", "high", "critical"].includes(priority)) continue;
          const priorityHouseholds =
            priorityHouseholdsByCommunity.get(household.community_id) ?? new Set<string>();
          priorityHouseholds.add(household.id);
          priorityHouseholdsByCommunity.set(household.community_id, priorityHouseholds);
        }

        const today = new Date().toISOString().slice(0, 10);
        const followUpCountsByCommunity = new Map<string, { overdue: number; upcoming: number }>();
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
          const counts = followUpCountsByCommunity.get(communityId) ?? {
            overdue: 0,
            upcoming: 0,
          };
          if (followUp.due_date < today || followUp.status === "missed") counts.overdue += 1;
          else if (followUp.due_date > today) counts.upcoming += 1;
          followUpCountsByCommunity.set(communityId, counts);
        }

        const issueSignalsByCommunity = new Map(
          issueSignals.map((signal) => [signal.communityId, signal.issues]),
        );
        setCommunities(
          sanitizedCommunities.map((row) => {
            const id = String(row.id ?? row.community_code ?? row.name);
            return {
              id,
              name: String(row.name ?? "Unknown community"),
              district: typeof row.district === "string" ? row.district : null,
              region: typeof row.region === "string" ? row.region : null,
              priorityHouseholds: priorityHouseholdsByCommunity.get(id)?.size ?? 0,
              overdueFollowUps: followUpCountsByCommunity.get(id)?.overdue ?? 0,
              upcomingFollowUps: followUpCountsByCommunity.get(id)?.upcoming ?? 0,
              issueSignals: issueSignalsByCommunity.get(id) ?? [],
            };
          }),
        );

        const openReferrals = referrals.filter((referral) =>
          ["submitted", "acknowledged", "accepted", "in_progress", "pending"].includes(
            referral.status,
          ),
        );
        const urgencyOrder: Record<string, number> = {
          emergency: 0,
          urgent: 1,
          priority: 2,
          routine: 3,
        };
        setReferralAttention({
          awaitingAcknowledgment: openReferrals.filter(
            (referral) => referral.status === "submitted",
          ).length,
          urgentOpen: openReferrals.filter((referral) =>
            ["emergency", "urgent"].includes(referral.urgency),
          ).length,
          items: [...openReferrals]
            .sort(
              (left, right) =>
                urgencyOrder[left.urgency] - urgencyOrder[right.urgency] ||
                left.created_at.localeCompare(right.created_at),
            )
            .slice(0, 4)
            .map((referral) => ({
              id: referral.id,
              personName: personById.get(referral.person_id ?? "")?.full_name ?? "Person",
              facility: referral.facility,
              urgency: referral.urgency,
              status: referral.status,
              createdAt: referral.submitted_at ?? referral.created_at,
              action:
                referral.status === "submitted"
                  ? "Awaiting facility acknowledgment"
                  : referral.status === "acknowledged"
                    ? "Confirm facility acceptance"
                    : referral.status === "accepted"
                      ? "Confirm attendance"
                      : "Record outcome or follow-up",
            })),
        });

        const activities = [
          ...assessments.map((item) => ({
            id: `assessment-${item.id}`,
            text: `Assessment recorded for ${item.inputs?.person?.full_name ?? "person"}`,
            time: item.created_at,
            tone: "info",
          })),
          ...referrals.map((item) => ({
            id: `referral-${item.id}`,
            text: `Referral ${item.status.replace(/_/g, " ")} for ${personNames.get(item.person_id ?? "") ?? "person"}`,
            time: item.created_at,
            tone: item.urgency === "emergency" ? "destructive" : "warning",
          })),
          ...followUps.map((item) => ({
            id: `followup-${item.id}`,
            text: `Follow-up ${item.status.replace(/_/g, " ")} for ${personNames.get(item.person_id ?? "") ?? householdNames.get(item.household_id ?? "") ?? "client"}`,
            time: item.created_at,
            tone: "success",
          })),
          ...persons.map((item) => ({
            id: `person-${item.id}`,
            text: `${item.full_name} registered`,
            time: item.createdAt,
            tone: "info",
          })),
        ].sort((left, right) => right.time.localeCompare(left.time));
        setRecentActivities(activities.slice(0, 6));
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        setNewAssessmentCount(
          assessments.filter(
            (assessment) =>
              assessment.inputs?.status !== "draft" &&
              new Date(assessment.created_at).getTime() >= oneWeekAgo,
          ).length,
        );
        setUpcomingVisits(
          followUps
            .filter(
              (item) =>
                item.due_date >= new Date().toISOString().slice(0, 10) &&
                ["scheduled", "due", "in_progress"].includes(item.status),
            )
            .slice(0, 4)
            .map((item) => ({
              id: item.id,
              patient:
                personNames.get(item.person_id ?? "") ??
                householdNames.get(item.household_id ?? "") ??
                "Client",
              type: item.type.replace(/_/g, " "),
              when: item.due_date,
            })),
        );
      })
      .catch((error: unknown) => {
        if (active) {
          setRecentActivities([]);
          setUpcomingVisits([]);
          toast.error(
            error instanceof Error
              ? `Dashboard priorities could not be loaded: ${error.message}`
              : "Dashboard priorities could not be loaded. Please try again.",
          );
        }
      })
      .finally(() => {
        if (active) setDashboardLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchCommunitiesFn]);

  const priorityHouseholdCount = useMemo(
    () => communities.reduce((total, community) => total + community.priorityHouseholds, 0),
    [communities],
  );
  const overdueFollowUpCount = useMemo(
    () => communities.reduce((total, community) => total + community.overdueFollowUps, 0),
    [communities],
  );
  const upcomingFollowUpCount = useMemo(
    () => communities.reduce((total, community) => total + community.upcomingFollowUps, 0),
    [communities],
  );
  const needsAttentionCount = useMemo(
    () =>
      communities.filter(
        (community) =>
          community.priorityHouseholds > 0 ||
          community.overdueFollowUps > 0 ||
          community.issueSignals.length > 0,
      ).length,
    [communities],
  );
  const filteredCommunities = useMemo(() => {
    return communities
      .filter((community) => {
        const matchesSearch =
          `${community.name} ${community.district ?? ""} ${community.region ?? ""}`
            .toLowerCase()
            .includes(communitySearch.trim().toLowerCase());
        const matchesIssue =
          issueFilter === "all" ||
          community.issueSignals.some((signal) => signal.id === issueFilter);
        const matchesAttention =
          attentionFilter === "all" ||
          (attentionFilter === "attention" &&
            (community.priorityHouseholds > 0 ||
              community.overdueFollowUps > 0 ||
              community.issueSignals.length > 0)) ||
          (attentionFilter === "priority" && community.priorityHouseholds > 0) ||
          (attentionFilter === "overdue" && community.overdueFollowUps > 0) ||
          (attentionFilter === "upcoming" && community.upcomingFollowUps > 0);
        const matchesRegion = regionFilter === "all" || community.region === regionFilter;
        const matchesDistrict = districtFilter === "all" || community.district === districtFilter;
        return (
          matchesSearch && matchesIssue && matchesAttention && matchesRegion && matchesDistrict
        );
      })
      .sort(
        (left, right) =>
          right.priorityHouseholds - left.priorityHouseholds ||
          right.overdueFollowUps - left.overdueFollowUps ||
          Math.max(...right.issueSignals.map((signal) => signal.householdCount), 0) -
            Math.max(...left.issueSignals.map((signal) => signal.householdCount), 0) ||
          left.name.localeCompare(right.name),
      )
      .slice(0, 8);
  }, [communities, communitySearch, issueFilter, attentionFilter, regionFilter, districtFilter]);
  const regions = useMemo(
    () =>
      Array.from(
        new Set(
          communities
            .map((community) => community.region)
            .filter((value): value is string => !!value),
        ),
      ).sort(),
    [communities],
  );
  const districts = useMemo(
    () =>
      Array.from(
        new Set(
          communities
            .filter((community) => regionFilter === "all" || community.region === regionFilter)
            .map((community) => community.district)
            .filter((value): value is string => !!value),
        ),
      ).sort(),
    [communities, regionFilter],
  );

  useEffect(() => {
    if (!showPending) return;
    const load = () => {
      void syncQueueStore
        .list()
        .then((rows) =>
          setOperations(
            rows.filter((row) =>
              ["pending", "syncing", "retrying", "failed"].includes(row.syncStatus),
            ),
          ),
        );
    };
    load();
    window.addEventListener("nurture-sync-status", load);
    return () => window.removeEventListener("nurture-sync-status", load);
  }, [showPending, sync.pending, sync.failed]);

  return (
    <AppLayout>
      {/* Welcome card - uses real user profile from Supabase */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-6 sm:p-8 shadow-sm mb-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm/relaxed opacity-90">Akwaaba, welcome back</div>
            <h2 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight truncate">
              {userName} 👋
            </h2>
            <p className="mt-2 text-sm opacity-90 max-w-xl">
              Work saved on this device remains available at{" "}
              <span className="font-semibold">{facility}</span>, even without internet.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs">
            <Wifi className="h-3.5 w-3.5" />
            {sync.online
              ? sync.syncing
                ? "Syncing"
                : sync.pending
                  ? `${sync.pending} pending`
                  : "Synced"
              : "Offline · saved locally"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <StatCard
          label="Communities needing attention"
          value={dashboardLoading ? "—" : needsAttentionCount}
          hint="Priority households, overdue care, or recorded concerns"
          icon={<MapPin className="h-5 w-5" />}
          tone="destructive"
          onClick={() => showCommunityPriorities("attention")}
        />
        <StatCard
          label="Priority households"
          value={dashboardLoading ? "—" : priorityHouseholdCount}
          hint="Household or assessment priority"
          icon={<HomeIcon className="h-5 w-5" />}
          tone="warning"
          onClick={() => showCommunityPriorities("priority")}
        />
        <StatCard
          label="Overdue follow-ups"
          value={dashboardLoading ? "—" : overdueFollowUpCount}
          hint="Open follow-ups past due"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="destructive"
          onClick={() => showCommunityPriorities("overdue")}
        />
        <StatCard
          label="Upcoming follow-ups"
          value={dashboardLoading ? "—" : upcomingFollowUpCount}
          hint="Scheduled after today"
          icon={<CalendarCheck className="h-5 w-5" />}
          tone="info"
          onClick={() => showCommunityPriorities("upcoming")}
        />
        <StatCard
          label="Assessments this week"
          value={dashboardLoading ? "—" : newAssessmentCount}
          hint="Recorded in the last 7 days"
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone="success"
          onClick={() => void navigate({ to: "/assessments" })}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          label="Conflicts to Review"
          value={sync.conflicts.toString()}
          hint={sync.conflicts ? "Review conflicts" : "No conflicts waiting"}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="destructive"
        />
        <StatCard
          label="Pending Sync Changes"
          value={sync.pending.toString()}
          hint={sync.failed ? `${sync.failed} sync failed` : "Local changes awaiting sync"}
          icon={<Send className="h-5 w-5" />}
          tone="warning"
          onClick={() => setShowPending((current) => !current)}
        />
      </div>

      <Card id="community-care-priorities" className="mb-6 scroll-mt-6 rounded-xl">
        <CardHeader className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Community care priorities</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Communities are ranked by priority households, overdue follow-ups, and recorded issue
              signals.
            </p>
          </div>
          <Link to="/communities" className="text-sm text-primary hover:underline">
            View all communities
          </Link>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={communitySearch}
                onChange={(event) => setCommunitySearch(event.target.value)}
                placeholder="Search community, district, or region"
                className="pl-9"
                aria-label="Search communities"
              />
            </div>
            <Select
              value={issueFilter}
              onValueChange={(value) => setIssueFilter(value as CommunityIssueId | "all")}
            >
              <SelectTrigger className="w-full sm:w-64" aria-label="Filter communities by issue">
                <SelectValue placeholder="Filter by issue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All recorded issues</SelectItem>
                {COMMUNITY_ISSUES.map((issue) => (
                  <SelectItem key={issue.id} value={issue.id}>
                    {issue.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={attentionFilter}
              onValueChange={(value) =>
                setAttentionFilter(
                  value as "all" | "attention" | "priority" | "overdue" | "upcoming",
                )
              }
            >
              <SelectTrigger className="w-full sm:w-52" aria-label="Filter by care priority">
                <SelectValue placeholder="Filter by attention" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All communities</SelectItem>
                <SelectItem value="attention">Needs attention</SelectItem>
                <SelectItem value="priority">Priority households</SelectItem>
                <SelectItem value="overdue">Overdue follow-ups</SelectItem>
                <SelectItem value="upcoming">Upcoming follow-ups</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={regionFilter}
              onValueChange={(value) => {
                setRegionFilter(value);
                setDistrictFilter("all");
              }}
            >
              <SelectTrigger className="w-full sm:w-48" aria-label="Filter by region">
                <SelectValue placeholder="All regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All regions</SelectItem>
                {regions.map((region) => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={districtFilter} onValueChange={setDistrictFilter}>
              <SelectTrigger className="w-full sm:w-48" aria-label="Filter by district">
                <SelectValue placeholder="All districts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All districts</SelectItem>
                {districts.map((district) => (
                  <SelectItem key={district} value={district}>
                    {district}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {dashboardLoading ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Loading care priorities…
            </p>
          ) : filteredCommunities.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No communities match these filters.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredCommunities.map((community) => (
                <Link
                  key={community.id}
                  to="/community/$id"
                  params={{ id: community.id }}
                  className="group rounded-xl border p-4 transition-colors hover:border-primary/40 hover:bg-accent/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold group-hover:text-primary">
                        {community.name}
                      </h3>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {[community.district, community.region].filter(Boolean).join(" · ") ||
                          "Location not recorded"}
                      </p>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline" className="gap-1.5">
                      <Users className="h-3 w-3" />
                      {community.priorityHouseholds} priority households
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1.5",
                        community.overdueFollowUps > 0 && "border-destructive/40 text-destructive",
                      )}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {community.overdueFollowUps} overdue
                    </Badge>
                    {community.upcomingFollowUps > 0 && (
                      <Badge variant="outline" className="gap-1.5">
                        <CalendarCheck className="h-3 w-3" />
                        {community.upcomingFollowUps} upcoming
                      </Badge>
                    )}
                  </div>
                  {community.issueSignals.length > 0 ? (
                    <div className="mt-3">
                      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        <HeartPulse className="h-3 w-3" />
                        Recorded concern signals
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[...community.issueSignals]
                          .sort(
                            (left, right) =>
                              right.householdCount - left.householdCount ||
                              left.label.localeCompare(right.label),
                          )
                          .slice(0, 3)
                          .map((signal) => (
                            <Badge
                              key={signal.id}
                              variant="secondary"
                              className="max-w-full truncate font-normal"
                              title={signal.label}
                            >
                              {signal.label}
                              {signal.householdCount > 0
                                ? ` · ${signal.householdCount} households`
                                : " · community reported"}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">
                      No concern signals recorded.
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Issue counts show recorded reports, not community prevalence. Follow-up indicators use
            the records currently available to the app.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6 rounded-xl">
        <CardHeader className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Referral attention</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Keep urgent referrals moving and confirm that facilities have acknowledged submitted
              referrals.
            </p>
          </div>
          <Link to="/referrals" className="text-sm text-primary hover:underline">
            Open referral tracker
          </Link>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge variant="outline">
              {referralAttention.awaitingAcknowledgment} awaiting acknowledgment
            </Badge>
            <Badge
              variant="outline"
              className={
                referralAttention.urgentOpen > 0
                  ? "border-destructive/40 text-destructive"
                  : undefined
              }
            >
              {referralAttention.urgentOpen} urgent or emergency open
            </Badge>
          </div>
          {referralAttention.items.length ? (
            <div className="grid gap-2 md:grid-cols-2">
              {referralAttention.items.map((referral) => (
                <Link
                  key={referral.id}
                  to="/referral/$id"
                  params={{ id: referral.id }}
                  className="flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-accent/20"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{referral.personName}</div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      {referral.action}
                      {referral.facility ? ` · ${referral.facility}` : ""}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      referral.urgency === "emergency"
                        ? "shrink-0 border-destructive/40 text-destructive"
                        : referral.urgency === "urgent"
                          ? "shrink-0 border-warning/40 text-warning"
                          : "shrink-0"
                    }
                  >
                    {referral.urgency}
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No open referrals in the available records.
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Counts reflect the referrals currently available to the app.
          </p>
        </CardContent>
      </Card>

      {/* Sync status remains visible, separate from care need. */}
      <Card className="mb-6 rounded-xl">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">Offline AI</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {ai.status === "ready"
                  ? "Ready for local questions without internet."
                  : ai.isLoading
                    ? `Preparing SmolLM2 locally (${ai.progress}%). Keep this screen open.`
                    : "Prepare the local model once before field work or offline use."}
              </p>
              {ai.error && <p className="mt-1 text-xs text-destructive">{ai.error.message}</p>}
            </div>
          </div>
          <Button
            variant={ai.isReady ? "outline" : "default"}
            size="sm"
            onClick={() => void prepareOfflineAI()}
            disabled={ai.isLoading || ai.isReady || ai.status === "unavailable"}
          >
            <Sparkles className="mr-1.5 h-4 w-4" />
            {ai.isLoading
              ? `Preparing ${ai.progress}%`
              : ai.isReady
                ? "Offline AI ready"
                : ai.status === "error"
                  ? "Try Again"
                  : "Prepare Offline AI"}
          </Button>
        </CardContent>
      </Card>

      {showPending && (
        <Card className="mb-6 rounded-xl">
          <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
            <div>
              <CardTitle className="text-base">Pending sync changes</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Saved on this device and waiting to reach Supabase.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void syncManager.retryFailed()}
              disabled={!sync.online || sync.syncing || operations.length === 0}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry sync
            </Button>
          </CardHeader>
          <CardContent>
            {operations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending changes.</p>
            ) : (
              <div className="divide-y rounded-lg border">
                {operations.map((operation) => (
                  <div
                    key={operation.id}
                    className="grid gap-2 p-3 text-sm sm:grid-cols-[1fr_auto]"
                  >
                    <div className="min-w-0">
                      <div className="font-medium">
                        {operation.operationType === "create"
                          ? "New"
                          : operation.operationType === "update"
                            ? "Updated"
                            : "Deleted"}{" "}
                        {operation.entityType.replace(/_/g, " ")}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {String(
                          operation.payload.full_name ??
                            operation.payload.name ??
                            operation.localId,
                        )}
                      </div>
                      {operation.lastError && (
                        <div className="text-xs text-destructive">{operation.lastError}</div>
                      )}
                    </div>
                    <div
                      className={cn(
                        "text-xs capitalize",
                        operation.syncStatus === "failed"
                          ? "text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {operation.syncStatus}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <Card className="rounded-xl mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {quickActions.map((a) => (
              <Link
                key={a.label}
                to={a.to}
                className="group rounded-xl border p-4 hover:border-primary/40 hover:shadow-sm transition-all"
              >
                <div className={cn("grid h-10 w-10 place-items-center rounded-xl mb-3", a.tone)}>
                  <a.icon className="h-5 w-5" />
                </div>
                <div className="text-sm font-semibold group-hover:text-primary transition-colors">
                  {a.label}
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent activities */}
        <Card className="rounded-xl lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Activities</CardTitle>
            <Link to="/assessments" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentActivities.length > 0 ? (
              recentActivities.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 rounded-lg p-3 hover:bg-accent/50"
                >
                  <div
                    className={cn(
                      "mt-0.5 h-2 w-2 rounded-full shrink-0",
                      a.tone === "success" && "bg-success",
                      a.tone === "warning" && "bg-warning",
                      a.tone === "destructive" && "bg-destructive",
                      a.tone === "info" && "bg-primary",
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.text}</p>
                    <p className="text-xs text-muted-foreground">{a.time}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No recent activities. Activities will appear here from Supabase.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming visits */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Upcoming Visits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingVisits.length > 0 ? (
              upcomingVisits.map((v) => (
                <div key={v.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                    <CalendarCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{v.patient}</p>
                    <p className="text-xs text-muted-foreground">{v.type}</p>
                    <p className="text-xs text-muted-foreground">{v.when}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No upcoming visits scheduled.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
