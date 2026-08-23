import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, StatCard, EmptyState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { AlertTriangle, ClipboardCheck, HeartPulse, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { listCommunities, listHouseholds, listPersons, listPregnancies } from "@/lib/registrations";

export const Route = createFileRoute("/reports")({
  component: Reports,
});

const pieColors = ["var(--color-success)", "var(--color-warning)", "var(--color-destructive)"];

function formatMonth(date: Date) {
  return date.toLocaleString("default", { month: "short" });
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function getRecentMonths(count: number) {
  const now = new Date();
  const months: Array<{ key: string; label: string }> = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: monthKey(date), label: formatMonth(date) });
  }
  return months;
}

function Reports() {
  const [communities, setCommunities] = useState<Array<{ id: string; name: string }>>([]);
  const [households, setHouseholds] = useState<Array<{ community_id: string | null }>>([]);
  const [persons, setPersons] = useState<Array<unknown>>([]);
  const [pregnancies, setPregnancies] = useState<
    Array<{ status: string | null; created_at: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([listCommunities(), listHouseholds(), listPersons(), listPregnancies()])
      .then(([communitiesData, householdsData, personsData, pregnanciesData]) => {
        setCommunities(communitiesData);
        setHouseholds(householdsData);
        setPersons(personsData);
        setPregnancies(pregnanciesData);
      })
      .catch(() => {
        setCommunities([]);
        setHouseholds([]);
        setPersons([]);
        setPregnancies([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalAssessments = persons.length;
  const totalReferrals = 0;
  const highRiskCount = pregnancies.filter((p) => p.status === "high").length;
  const ancCoverage = persons.length ? Math.round((pregnancies.length / persons.length) * 100) : 0;

  const monthlyAssessments = useMemo(() => {
    const months = getRecentMonths(6);
    const grouped = new Map<string, { month: string; assessments: number; referrals: number }>();
    months.forEach((m) => grouped.set(m.key, { month: m.label, assessments: 0, referrals: 0 }));
    pregnancies.forEach((pregnancy) => {
      const date = pregnancy.created_at ? new Date(pregnancy.created_at) : new Date();
      const key = monthKey(date);
      const row = grouped.get(key);
      if (row) row.assessments += 1;
    });
    return Array.from(grouped.values());
  }, [pregnancies]);

  const riskTrend = useMemo(() => {
    const months = getRecentMonths(4);
    return months.map((month) => {
      const point = { week: month.label, low: 0, medium: 0, high: 0 };
      pregnancies.forEach((pregnancy) => {
        const date = pregnancy.created_at ? new Date(pregnancy.created_at) : new Date();
        if (monthKey(date) === month.key) {
          if (pregnancy.status === "high") point.high += 1;
          else if (pregnancy.status === "medium") point.medium += 1;
          else point.low += 1;
        }
      });
      return point;
    });
  }, [pregnancies]);

  const communityCoverage = useMemo(
    () =>
      communities.map((community) => ({
        name: community.name,
        coverage: households.filter((household) => household.community_id === community.id).length,
      })),
    [communities, households],
  );

  if (loading) {
    return (
      <AppLayout>
        <PageHeader title="Reports" description="Loading health indicators…" />
        <div className="p-8 text-center text-muted-foreground">Loading report data...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Reports"
        description="Health indicators and community trends across your CHPS zone"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          label="People registered"
          value={totalAssessments}
          hint="Active records"
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone="primary"
        />
        <StatCard
          label="Referrals"
          value={totalReferrals}
          hint="Live referrals unavailable"
          icon={<Send className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label="High-risk cases"
          value={highRiskCount}
          hint="From pregnancy register"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="destructive"
        />
        <StatCard
          label="ANC coverage"
          value={`${ancCoverage}%`}
          hint="Estimated from live data"
          icon={<HeartPulse className="h-5 w-5" />}
          tone="success"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card className="rounded-xl lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Monthly assessments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyAssessments}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" fontSize={12} stroke="var(--color-muted-foreground)" />
                  <YAxis fontSize={12} stroke="var(--color-muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-card)",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="assessments" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Risk distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskTrend}
                    dataKey="high"
                    nameKey="week"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {riskTrend.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-card)",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Risk trend (last 4 periods)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={riskTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="week" fontSize={12} stroke="var(--color-muted-foreground)" />
                  <YAxis fontSize={12} stroke="var(--color-muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-card)",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line dataKey="low" stroke="var(--color-success)" strokeWidth={2} />
                  <Line dataKey="medium" stroke="var(--color-warning)" strokeWidth={2} />
                  <Line dataKey="high" stroke="var(--color-destructive)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Community coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={communityCoverage} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" fontSize={12} stroke="var(--color-muted-foreground)" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    fontSize={12}
                    stroke="var(--color-muted-foreground)"
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-card)",
                    }}
                  />
                  <Bar dataKey="coverage" fill="var(--color-primary)" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
