import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { StatCard } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  CalendarCheck, AlertTriangle, Send, RefreshCw, HeartPulse, Baby, MapPin,
  UserPlus, ClipboardCheck, Apple, Wifi, Activity, Home as HomeIcon,
} from "lucide-react";
import { currentUser, recentActivities, upcomingVisits, communities } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

const quickActions = [
  { to: "/households", label: "Register Household", icon: HomeIcon, tone: "bg-primary/10 text-primary" },
  { to: "/people", label: "Register Person", icon: UserPlus, tone: "bg-info/10 text-info" },
  { to: "/assessments", label: "Start Assessment", icon: ClipboardCheck, tone: "bg-success/10 text-success" },
  { to: "/referrals", label: "Create Referral", icon: Send, tone: "bg-warning/15 text-warning" },
  { to: "/nutrition", label: "Nutrition Assistant", icon: Apple, tone: "bg-destructive/10 text-destructive" },
];

function Dashboard() {
  const totalCoverage = Math.round(
    communities.reduce((a, c) => a + c.coverage, 0) / communities.length,
  );

  return (
    <AppLayout>
      {/* Welcome card */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-6 sm:p-8 shadow-sm mb-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm/relaxed opacity-90">Akwaaba, welcome back</div>
            <h2 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight truncate">
              {currentUser.name.split(" ")[0]} 👋
            </h2>
            <p className="mt-2 text-sm opacity-90 max-w-xl">
              You have <span className="font-semibold">6 visits</span> and{" "}
              <span className="font-semibold">2 high-risk cases</span> to review today at {currentUser.facility}.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs">
            <Wifi className="h-3.5 w-3.5" /> Synced · just now
          </div>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard label="Today's Visits" value={6} hint="4 ANC · 2 child" icon={<CalendarCheck className="h-5 w-5" />} tone="primary" />
        <StatCard label="High Risk Cases" value={12} hint="+3 this week" icon={<AlertTriangle className="h-5 w-5" />} tone="destructive" />
        <StatCard label="Pending Referrals" value={5} hint="1 urgent" icon={<Send className="h-5 w-5" />} tone="warning" />
        <StatCard label="Follow Ups" value={9} hint="Due within 7 days" icon={<RefreshCw className="h-5 w-5" />} tone="info" />
        <StatCard label="Pregnant Women" value={38} hint="5 high-risk" icon={<HeartPulse className="h-5 w-5" />} tone="destructive" />
        <StatCard label="Children Under 5" value={214} hint="94% immunised" icon={<Baby className="h-5 w-5" />} tone="success" />
        <StatCard label="Communities" value={communities.length} hint="Ashanti Region" icon={<MapPin className="h-5 w-5" />} tone="info" />
        <StatCard label="Coverage" value={`${totalCoverage}%`} hint="Household reach" icon={<Activity className="h-5 w-5" />} tone="primary" />
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
                <div className="text-sm font-semibold group-hover:text-primary transition-colors">{a.label}</div>
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
            <Button variant="ghost" size="sm">View all</Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentActivities.map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-lg p-3 hover:bg-accent/50">
                <div
                  className={cn(
                    "mt-0.5 h-2 w-2 rounded-full shrink-0",
                    a.tone === "success" && "bg-success",
                    a.tone === "warning" && "bg-warning",
                    a.tone === "info" && "bg-primary",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{a.text}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.time}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Upcoming visits */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Upcoming Visits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingVisits.map((v) => (
              <div key={v.id} className="flex items-center gap-3 rounded-lg border p-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {v.patient.split(" ").map((x) => x[0]).slice(0, 2).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{v.patient}</div>
                  <div className="text-xs text-muted-foreground truncate">{v.type} · {v.community}</div>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">{v.when.split(",")[0]}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Community coverage */}
      <Card className="rounded-xl mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Community Coverage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {communities.slice(0, 4).map((c) => (
            <div key={c.id}>
              <div className="flex items-center justify-between mb-1.5 text-sm">
                <span className="font-medium">{c.name}</span>
                <span className="text-muted-foreground">{c.coverage}% · {c.households} households</span>
              </div>
              <Progress value={c.coverage} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
