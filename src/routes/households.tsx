import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { listAssessments } from "@/lib/assessments";
import { listFollowUps } from "@/lib/followups";
import { listCommunities, listPersons } from "@/lib/registrations";
import { listWorkflowHouseholds } from "@/lib/household-person.service";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/households")({
  component: Households,
});

const PAGE = 6;

type HouseholdRow = {
  id: string;
  head_name: string;
  house_no: string;
  community_id: string | null;
  address: string | null;
  phone: string | null;
};

type CommunityRow = {
  id: string;
  name: string;
};

function Households() {
  const nav = useNavigate();
  const { roles } = useAuth();
  const [q, setQ] = useState("");
  const [community, setCommunity] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [followUpFilter, setFollowUpFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [households, setHouseholds] = useState<HouseholdRow[]>([]);
  const [communities, setCommunities] = useState<CommunityRow[]>([]);
  const [people, setPeople] = useState<Array<{ id: string; household_id: string | null; full_name: string }>>([]);
  const [followUps, setFollowUps] = useState<Array<{ household_id: string | null; status: string | null; due_date?: string | null }>>([]);
  const [assessments, setAssessments] = useState<Array<{ person_id: string | null; inputs?: { priority?: string | null } | null; risk_level?: string | null; summary?: string | null }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([listWorkflowHouseholds(), listCommunities(), listPersons(), listFollowUps(), listAssessments()])
      .then(([householdData, communityData, personData, followUpData, assessmentData]) => {
        setHouseholds(householdData);
        setCommunities(communityData);
        setPeople(personData as any);
        setFollowUps(followUpData as any);
        setAssessments(assessmentData as any);
      })
      .catch(() => {
        setHouseholds([]);
        setCommunities([]);
        setPeople([]);
        setFollowUps([]);
        setAssessments([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const communityNames = useMemo(
    () => Object.fromEntries(communities.map((c) => [c.id, c.name])),
    [communities],
  );

  const accessibleHouseholds = useMemo(() => {
    if (roles.some((role) => ["administrator", "supervisor", "chps_worker"].includes(role))) {
      return households.map((h) => ({
        ...h,
        community: h.community_id ? (communityNames[h.community_id] ?? "Unknown") : "Unassigned",
      }));
    }
    return [];
  }, [roles, households, communityNames]);

  const allCommunities = useMemo(
    () =>
      Array.from(new Set(accessibleHouseholds.map((h) => h.community))).filter(Boolean) as string[],
    [accessibleHouseholds],
  );

  const attentionByHousehold = useMemo(() => {
    const householdIds = new Set(accessibleHouseholds.map((household) => household.id));
    const followUpHouseholdIds = new Set(
      followUps
        .filter((followUp) => followUp.household_id && householdIds.has(followUp.household_id))
        .filter((followUp) => !["completed", "cancelled"].includes(followUp.status ?? ""))
        .map((followUp) => followUp.household_id as string),
    );

    const priorityHouseholdIds = new Set<string>();
    const peopleById = new Map(people.map((person) => [person.id, person]));

    for (const assessment of assessments) {
      if (!assessment.person_id) continue;
      const person = peopleById.get(assessment.person_id);
      if (!person || !person.household_id || !householdIds.has(person.household_id)) continue;

      const priority = (assessment.inputs?.priority ?? assessment.risk_level ?? "").toString().toLowerCase();
      if (["priority_review", "urgent", "high", "critical"].includes(priority)) {
        priorityHouseholdIds.add(person.household_id);
      }
    }

    return Object.fromEntries(
      accessibleHouseholds.map((household) => {
        const isPriority = priorityHouseholdIds.has(household.id);
        const needsFollowUp = followUpHouseholdIds.has(household.id);
        let attention: "No current action" | "Follow-up required" | "Priority case" = "No current action";

        if (isPriority) attention = "Priority case";
        else if (needsFollowUp) attention = "Follow-up required";

        return [household.id, { attention, needsFollowUp, isPriority }];
      }),
    );
  }, [accessibleHouseholds, people, followUps, assessments]);

  const filtered = useMemo(() => {
    const search = q.toLowerCase();
    return accessibleHouseholds
      .filter((h) => {
        const attention = attentionByHousehold[h.id];
        const searchText = `${h.head_name} ${h.house_no} ${h.community} ${h.id} ${h.phone ?? ""} ${h.address ?? ""}`.toLowerCase();
        const matchesSearch = searchText.includes(search);
        const matchesCommunity = community === "all" || h.community === community;
        const matchesStatus = statusFilter === "all" || attention.attention === statusFilter;
        const matchesFollowUp = followUpFilter === "all" || (followUpFilter === "yes") === attention.needsFollowUp;
        const matchesPriority = priorityFilter === "all" || (priorityFilter === "yes") === attention.isPriority;

        return matchesSearch && matchesCommunity && matchesStatus && matchesFollowUp && matchesPriority;
      })
      .sort((a, b) => {
        if (sort === "name") return a.head_name.localeCompare(b.head_name);
        if (sort === "house") return a.house_no.localeCompare(b.house_no);
        return a.head_name.localeCompare(b.head_name);
      });
  }, [accessibleHouseholds, q, community, statusFilter, followUpFilter, priorityFilter, sort, attentionByHousehold]);

  const summary = useMemo(() => {
    const followUpHouseholds = Object.values(attentionByHousehold).filter((row) => row.needsFollowUp).length;
    const priorityHouseholds = Object.values(attentionByHousehold).filter((row) => row.isPriority).length;

    return {
      total: accessibleHouseholds.length,
      followUps: followUpHouseholds,
      priorityCases: priorityHouseholds,
    };
  }, [accessibleHouseholds.length, attentionByHousehold]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(page, pages);
  const pageRows = filtered.slice((safePage - 1) * PAGE, safePage * PAGE);

  if (loading) {
    return (
      <AppLayout>
        <PageHeader title="Households" description="Loading household register…" />
        <div className="p-8 text-center text-muted-foreground">Loading households...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Households"
        description={`${accessibleHouseholds.length} households registered`}
        actions={
          <Link to="/register/household" search={{ community_id: undefined }}>
            <Button className="rounded-xl">
              <Plus className="mr-1 h-4 w-4" /> Register
            </Button>
          </Link>
        }
      />

      <div className="grid gap-3 md:grid-cols-3 mb-4">
        <SummaryCard label="Total Households" value={String(summary.total)} helper="Households currently registered" />
        <SummaryCard
          label="Households Requiring Follow-up"
          value={String(summary.followUps)}
          helper="Unique households with active follow-up needs"
        />
        <SummaryCard
          label="Households with Priority Cases"
          value={String(summary.priorityCases)}
          helper="Unique households with priority review or urgent risk"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search households, ID, community, phone…"
            className="pl-9"
          />
        </div>
        <Select
          value={community}
          onValueChange={(v) => {
            setCommunity(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Community" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All communities</SelectItem>
            {allCommunities.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="No current action">No current action</SelectItem>
            <SelectItem value="Follow-up required">Follow-up required</SelectItem>
            <SelectItem value="Priority case">Priority case</SelectItem>
          </SelectContent>
        </Select>
        <Select value={followUpFilter} onValueChange={(v) => { setFollowUpFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Follow-up" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All follow-up</SelectItem>
            <SelectItem value="yes">Follow-up required</SelectItem>
            <SelectItem value="no">No follow-up</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priority</SelectItem>
            <SelectItem value="yes">Priority case</SelectItem>
            <SelectItem value="no">No priority</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Name</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="house">House number</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {pageRows.length === 0 ? (
        <EmptyState title="No households match" description="Try adjusting search or filters." />
      ) : (
        <Card className="rounded-xl overflow-hidden card-elevated">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Household</TableHead>
                    <TableHead>Community</TableHead>
                    <TableHead className="hidden sm:table-cell">Address</TableHead>
                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attention</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((h) => {
                    const attention = attentionByHousehold[h.id];
                    return (
                      <TableRow
                        key={h.id}
                        className="cursor-pointer"
                        onClick={() => nav({ to: "/household/$id", params: { id: h.id } })}
                      >
                        <TableCell>
                          <div className="font-medium">{h.head_name}</div>
                          <div className="text-xs text-muted-foreground">{h.house_no}</div>
                        </TableCell>
                        <TableCell>{h.community}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {h.address ?? "-"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {h.phone ?? "-"}
                        </TableCell>
                        <TableCell>
                          <span className="rounded-full border px-2 py-1 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                            Active
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`rounded-full border px-2 py-1 text-[11px] uppercase tracking-[0.15em] ${
                              attention?.isPriority
                                ? "border-destructive/40 bg-destructive/10 text-destructive"
                                : attention?.needsFollowUp
                                  ? "border-warning/40 bg-warning/10 text-warning"
                                  : "border-muted-foreground/20 bg-muted text-muted-foreground"
                            }`}
                          >
                            {attention?.attention ?? "No current action"}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {filtered.length > PAGE && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-muted-foreground">
            Page {safePage} of {pages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 1}
              onClick={() => setPage(safePage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === pages}
              onClick={() => setPage(safePage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function SummaryCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <Card className="rounded-xl border bg-muted/20">
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{helper}</div>
      </CardContent>
    </Card>
  );
}
