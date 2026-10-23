import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, EmptyState, StatusPill } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Send, MapPin, Calendar, Search, Loader2, Clock3, UserRound } from "lucide-react";
import {
  listReferrals,
  type ReferralRow,
  type ReferralStatus,
  type Urgency,
} from "@/lib/referrals";
import { listCommunities, listHouseholds, listPersons } from "@/lib/registrations";
import { toast } from "sonner";

type ReferralListItem = ReferralRow & {
  personName: string;
  communityName: string;
};

export const Route = createFileRoute("/referrals")({
  component: Referrals,
});

const URGENCY_TONE: Record<Urgency, string> = {
  routine: "bg-success/10 text-success border-success/30",
  priority: "bg-info/10 text-info border-info/30",
  urgent: "bg-warning/15 text-warning border-warning/30",
  emergency: "bg-destructive/10 text-destructive border-destructive/30",
};

const STATUS_TONE: Record<string, "success" | "info" | "warning" | "destructive" | "muted"> = {
  draft: "muted",
  submitted: "info",
  acknowledged: "info",
  accepted: "info",
  in_progress: "warning",
  completed: "success",
  declined: "destructive",
  cancelled: "muted",
  pending: "warning",
};

function Referrals() {
  const [rows, setRows] = useState<ReferralListItem[] | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ReferralStatus | "all">("all");
  const [urgency, setUrgency] = useState<Urgency | "all">("all");

  useEffect(() => {
    let active = true;
    setRows(null);
    Promise.all([
      listReferrals({ status, urgency }),
      listPersons(),
      listHouseholds(),
      listCommunities(),
    ])
      .then(([referrals, persons, households, communities]) => {
        if (!active) return;
        const personById = new Map(
          persons.flatMap((person) => [
            [person.id, person] as const,
            ...("localId" in person && typeof person.localId === "string"
              ? ([[person.localId, person]] as const)
              : []),
          ]),
        );
        const householdById = new Map(
          households.flatMap((household) => [
            [household.id, household] as const,
            ...(household.localId ? ([[household.localId, household]] as const) : []),
          ]),
        );
        const communityNameById = new Map(
          communities.map((community) => [community.id, community.name]),
        );
        setRows(
          referrals.map((referral) => {
            const person = referral.person_id ? personById.get(referral.person_id) : undefined;
            const household = person?.household_id
              ? householdById.get(person.household_id)
              : undefined;
            return {
              ...referral,
              personName: person?.full_name ?? "Person not linked",
              communityName: household?.community_id
                ? (communityNameById.get(household.community_id) ?? "Community not found")
                : "Community not linked",
            };
          }),
        );
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Failed to load");
        if (active) setRows([]);
      });
    return () => {
      active = false;
    };
  }, [status, urgency]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...(rows ?? [])]
      .filter(
        (referral) =>
          !needle ||
          [
            referral.reason,
            referral.facility,
            referral.category,
            referral.personName,
            referral.communityName,
          ]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(needle)),
      )
      .sort((left, right) => {
        const leftOpen = !["completed", "declined", "cancelled"].includes(left.status);
        const rightOpen = !["completed", "declined", "cancelled"].includes(right.status);
        const urgencyOrder: Record<Urgency, number> = {
          emergency: 0,
          urgent: 1,
          priority: 2,
          routine: 3,
        };
        const leftWaiting = Date.now() - new Date(left.submitted_at ?? left.created_at).getTime();
        const rightWaiting =
          Date.now() - new Date(right.submitted_at ?? right.created_at).getTime();
        return (
          Number(rightOpen) - Number(leftOpen) ||
          urgencyOrder[left.urgency] - urgencyOrder[right.urgency] ||
          (rightOpen ? rightWaiting - leftWaiting : right.created_at.localeCompare(left.created_at))
        );
      });
  }, [rows, q]);

  function nextAction(referral: ReferralRow): string {
    if (referral.status === "draft" || referral.status === "pending") return "Submit referral";
    if (referral.status === "submitted") return "Awaiting facility acknowledgment";
    if (referral.status === "acknowledged") return "Confirm facility acceptance";
    if (referral.status === "accepted") return "Confirm attendance and care";
    if (referral.status === "in_progress") return "Record outcome or follow-up";
    if (referral.status === "declined") return "Review and plan next step";
    if (referral.status === "completed") return "Care outcome recorded";
    return "Referral closed";
  }

  function daysWaiting(referral: ReferralRow): number {
    const start = new Date(referral.submitted_at ?? referral.created_at).getTime();
    return Math.max(0, Math.floor((Date.now() - start) / (24 * 60 * 60 * 1000)));
  }

  return (
    <AppLayout>
      <PageHeader
        title="Referrals"
        description="Track patients referred to higher-level facilities"
        icon={<Send className="h-5 w-5" />}
        actions={
          <Link to="/referral/new" search={{ person_id: undefined, assessment_id: undefined }}>
            <Button className="rounded-xl">
              <Plus className="mr-1 h-4 w-4" /> New referral
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
            placeholder="Search reason, facility…"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as ReferralStatus | "all")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {[
              "all",
              "draft",
              "submitted",
              "acknowledged",
              "accepted",
              "in_progress",
              "completed",
              "declined",
              "cancelled",
            ].map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={urgency} onValueChange={(v) => setUrgency(v as Urgency | "all")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Urgency" />
          </SelectTrigger>
          <SelectContent>
            {["all", "routine", "priority", "urgent", "emergency"].map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rows === null ? (
        <div className="p-10 text-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No referrals found"
          description="Create the first referral for a person in your caseload."
          action={
            <Link to="/referral/new" search={{ person_id: undefined, assessment_id: undefined }}>
              <Button>
                <Plus className="h-4 w-4 mr-1" /> New referral
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Link key={r.id} to="/referral/$id" params={{ id: r.id }} className="block">
              <Card className="rounded-xl hover-lift">
                <CardContent className="p-5">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 md:flex md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-semibold truncate">
                          {r.category ?? r.reason ?? "Referral"}
                        </div>
                        <Badge variant="outline" className={URGENCY_TONE[r.urgency]}>
                          {r.urgency}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {r.reason ?? "Reason not recorded"}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <UserRound className="h-3 w-3" />
                          {r.personName}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {r.communityName}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {r.facility ?? "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(r.submitted_at ?? r.created_at).toLocaleDateString()}
                        </span>
                        {!["completed", "declined", "cancelled"].includes(r.status) && (
                          <span className="flex items-center gap-1">
                            <Clock3 className="h-3 w-3" />
                            {daysWaiting(r)} days waiting
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs font-medium text-primary">Next: {nextAction(r)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusPill tone={STATUS_TONE[r.status] ?? "muted"}>
                        {r.status.replace("_", " ")}
                      </StatusPill>
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
