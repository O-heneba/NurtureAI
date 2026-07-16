import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, StatCard } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { AlertTriangle, ClipboardCheck, HeartPulse, Send } from "lucide-react";
import { monthlyAssessments, riskTrend, communities } from "@/lib/demo-data";

export const Route = createFileRoute("/reports")({
  component: Reports,
});

const pieColors = ["var(--color-success)", "var(--color-warning)", "var(--color-destructive)"];
const pieData = [
  { name: "Low", value: 71 },
  { name: "Medium", value: 20 },
  { name: "High", value: 9 },
];

function Reports() {
  return (
    <AppLayout>
      <PageHeader
        title="Reports"
        description="Health indicators and community trends across your CHPS zone"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard label="Assessments (Nov)" value={91} hint="+8% vs Oct" icon={<ClipboardCheck className="h-5 w-5" />} tone="primary" />
        <StatCard label="Referrals" value={22} hint="6 urgent" icon={<Send className="h-5 w-5" />} tone="warning" />
        <StatCard label="High-risk cases" value={12} hint="Under review" icon={<AlertTriangle className="h-5 w-5" />} tone="destructive" />
        <StatCard label="ANC coverage" value="86%" hint="+3% MoM" icon={<HeartPulse className="h-5 w-5" />} tone="success" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card className="rounded-xl lg:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-base">Monthly assessments & referrals</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyAssessments}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" fontSize={12} stroke="var(--color-muted-foreground)" />
                  <YAxis fontSize={12} stroke="var(--color-muted-foreground)" />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="assessments" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="referrals" fill="var(--color-warning)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="pb-3"><CardTitle className="text-base">Risk distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="rounded-xl">
          <CardHeader className="pb-3"><CardTitle className="text-base">High-risk trend (last 4 weeks)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={riskTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="week" fontSize={12} stroke="var(--color-muted-foreground)" />
                  <YAxis fontSize={12} stroke="var(--color-muted-foreground)" />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)" }} />
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
          <CardHeader className="pb-3"><CardTitle className="text-base">Community coverage</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={communities} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" fontSize={12} stroke="var(--color-muted-foreground)" />
                  <YAxis dataKey="name" type="category" fontSize={12} stroke="var(--color-muted-foreground)" width={70} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)" }} />
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
