import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { StatCard } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
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
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSyncStatus } from "@/hooks/use-sync-status";
import { cn } from "@/lib/utils";
import { syncQueueStore } from "@/lib/storage/local-store";
import type { SyncQueueOperation } from "@/lib/storage/types";
import { syncManager } from "@/lib/storage/sync-manager";
import { useEffect, useState } from "react";
import { listAssessments } from "@/lib/assessments";
import { listReferrals } from "@/lib/referrals";
import { listFollowUps } from "@/lib/followups";
import { listWorkflowHouseholds, listWorkflowPersons } from "@/lib/household-person.service";
import { useAI } from "@/ai";
import { toast } from "sonner";

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
  const [showPending, setShowPending] = useState(false);
  const [operations, setOperations] = useState<SyncQueueOperation[]>([]);
  const [recentActivities, setRecentActivities] = useState<
    Array<{ id: string; text: string; time: string; tone: string }>
  >([]);
  const [upcomingVisits, setUpcomingVisits] = useState<
    Array<{ id: string; patient: string; type: string; when: string }>
  >([]);
  const userName = profile?.full_name?.split(" ")[0] || "User";
  const facility = profile?.facility || "CHPS Facility";

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
      listAssessments(20),
      listReferrals(),
      listFollowUps({ scope: "all" }),
      listWorkflowPersons(),
      listWorkflowHouseholds(),
    ])
      .then(([assessments, referrals, followUps, persons, households]) => {
        if (!active) return;
        const personNames = new Map(persons.map((person) => [person.id, person.full_name]));
        const householdNames = new Map(
          households.map((household) => [household.id, household.head_name]),
        );
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
      .catch(() => {
        if (active) {
          setRecentActivities([]);
          setUpcomingVisits([]);
        }
      });
    return () => {
      active = false;
    };
  }, []);

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

      {/* Stat grid - populated from server functions, not hardcoded */}
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
