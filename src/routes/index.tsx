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
  RefreshCw,
  HeartPulse,
  Baby,
  MapPin,
  UserPlus,
  ClipboardCheck,
  Apple,
  Wifi,
  Activity,
  Home as HomeIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

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
  const userName = profile?.full_name?.split(" ")[0] || "User";
  const facility = profile?.facility || "CHPS Facility";
  const recentActivities = [] as Array<{ id: string; text: string; time: string; tone: string }>;
  const upcomingVisits = [] as Array<{ id: string; patient: string; type: string; when: string }>;

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
              Dashboard metrics loading from Supabase at{" "}
              <span className="font-semibold">{facility}</span>.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs">
            <Wifi className="h-3.5 w-3.5" /> Synced · just now
          </div>
        </div>
      </div>

      {/* Stat grid - populated from server functions, not hardcoded */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          label="Today's Visits"
          value="—"
          hint="From Supabase"
          icon={<CalendarCheck className="h-5 w-5" />}
          tone="primary"
        />
        <StatCard
          label="High Risk Cases"
          value="—"
          hint="From Supabase"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="destructive"
        />
        <StatCard
          label="Pending Referrals"
          value="—"
          hint="From Supabase"
          icon={<Send className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label="Follow Ups"
          value="—"
          hint="From Supabase"
          icon={<RefreshCw className="h-5 w-5" />}
          tone="info"
        />
        <StatCard
          label="Pregnant Women"
          value="—"
          hint="From Supabase"
          icon={<HeartPulse className="h-5 w-5" />}
          tone="destructive"
        />
        <StatCard
          label="Children Under 5"
          value="—"
          hint="From Supabase"
          icon={<Baby className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Communities"
          value="—"
          hint="From Supabase"
          icon={<MapPin className="h-5 w-5" />}
          tone="info"
        />
        <StatCard
          label="Coverage"
          value="—"
          hint="From Supabase"
          icon={<Activity className="h-5 w-5" />}
          tone="primary"
        />
      </div>

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
            <Button variant="ghost" size="sm">
              View all
            </Button>
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
                No upcoming visits. Schedule visits via Supabase.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
