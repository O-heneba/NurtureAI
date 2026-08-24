import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, StatCard, EmptyState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Baby, Plus, Syringe, TrendingUp, Activity } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useEffect, useMemo, useState } from "react";
import { listChildProfiles, listPersonsByIds } from "@/lib/registrations";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/child-health")({
  component: ChildHealth,
});

function nutritionColor(n: string) {
  if (n === "Normal") return "bg-success/10 text-success border-success/30";
  if (n === "Underweight") return "bg-warning/15 text-warning border-warning/30";
  return "bg-destructive/10 text-destructive border-destructive/30";
}

type ChildHealthRow = {
  id: string;
  person_id: string;
  mother_person_id: string | null;
  birth_weight_kg: number | null;
  immunizations: string[] | null;
  growth_notes: string | null;
  created_at: string;
};

type PersonRow = {
  id: string;
  full_name: string;
  sex: string | null;
  date_of_birth: string | null;
};

function ChildHealth() {
  const [children, setChildren] = useState<ChildHealthRow[]>([]);
  const [persons, setPersons] = useState<PersonRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listChildProfiles()
      .then(async (childData) => {
        setChildren(childData);
        const personIds = Array.from(
          new Set(
            childData.flatMap(
              (child) => [child.person_id, child.mother_person_id].filter(Boolean) as string[],
            ),
          ),
        );
        const personData = await listPersonsByIds(personIds);
        setPersons(personData as PersonRow[]);
      })
      .catch(() => {
        setChildren([]);
        setPersons([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const personsById = useMemo(() => new Map(persons.map((p) => [p.id, p])), [persons]);
  const childRows = useMemo(
    () =>
      children.map((child) => ({
        ...child,
        person: personsById.get(child.person_id),
        mother: child.mother_person_id ? personsById.get(child.mother_person_id) : null,
      })),
    [children, personsById],
  );

  const total = childRows.length;
  const immunizedCount = childRows.filter((child) => child.immunizations?.length).length;
  const growthCount = childRows.filter((child) => child.growth_notes).length;
  const atRiskCount = childRows.filter(
    (child) => !child.immunizations?.length || !child.growth_notes,
  ).length;

  const monthlyRegistrations = useMemo(() => {
    const months: Record<string, number> = {};
    const sorted = [...children].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    sorted.forEach((child) => {
      const date = new Date(child.created_at);
      const key = date.toLocaleString("default", { month: "short", year: "numeric" });
      months[key] = (months[key] ?? 0) + 1;
    });
    return Object.entries(months).map(([month, count]) => ({ month, count }));
  }, [children]);

  const scheduleItems = useMemo(() => {
    const known = [
      "BCG + OPV0",
      "Penta 1",
      "Penta 2",
      "Penta 3",
      "Measles 1",
      "MMR + Yellow fever",
    ];
    const counts = new Map(known.map((name) => [name, 0]));
    childRows.forEach((child) => {
      child.immunizations?.forEach((item) => {
        if (counts.has(item)) counts.set(item, counts.get(item)! + 1);
      });
    });
    return known.map((name) => ({ name, count: counts.get(name) ?? 0 }));
  }, [childRows]);

  if (loading) {
    return (
      <AppLayout>
        <PageHeader title="Child Health" description="Loading child health register…" />
        <div className="p-8 text-center text-muted-foreground">Loading child health data...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Child Health"
        description="Growth monitoring & immunization tracking for children under 5"
        actions={
          <Link
            to="/register/child"
            search={{
              person_id: undefined,
              person_name: undefined,
              person_sex: undefined,
              person_dob: undefined,
              household_id: undefined,
            }}
          >
            <Button className="rounded-xl">
              <Plus className="mr-1 h-4 w-4" /> Register child
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          label="Under 5"
          value={total}
          icon={<Baby className="h-5 w-5" />}
          tone="primary"
        />
        <StatCard
          label="Immunised"
          value={`${total ? Math.round((immunizedCount / total) * 100) : 0}%`}
          icon={<Syringe className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Growth notes"
          value={growthCount}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="info"
        />
        <StatCard
          label="At risk"
          value={atRiskCount}
          icon={<Activity className="h-5 w-5" />}
          tone="warning"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card className="rounded-xl lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Child registrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyRegistrations}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-card)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="var(--color-primary)"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Immunization timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {scheduleItems.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{item.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {item.count} child{item.count === 1 ? "" : "ren"} recorded
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    item.count
                      ? "bg-success/10 text-success border-success/30"
                      : "bg-warning/10 text-warning border-warning/30"
                  }
                >
                  {item.count > 0 ? "Recorded" : "Pending"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Children register</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {childRows.length === 0 ? (
            <EmptyState
              title="No registered children"
              description="Register a child to start monitoring growth and immunizations."
              action={
                <Link
                  to="/register/child"
                  search={{
                    person_id: undefined,
                    person_name: undefined,
                    person_sex: undefined,
                    person_dob: undefined,
                    household_id: undefined,
                  }}
                >
                  <Button>Register child</Button>
                </Link>
              }
            />
          ) : (
            <div className="divide-y">
              {childRows.map((child) => {
                const person = child.person;
                return (
                  <Link
                    key={child.id}
                    to="/child/$id"
                    params={{ id: child.id }}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 sm:flex sm:items-center hover:bg-accent/40 transition-colors"
                  >
                    <div className="min-w-0 sm:flex-1">
                      <div className="font-semibold truncate">
                        {person?.full_name ?? "Unknown child"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {person?.date_of_birth
                          ? `${Math.floor((Date.now() - new Date(person.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365))} yrs · ${person.sex === "F" ? "Female" : person.sex === "M" ? "Male" : "Unknown"}`
                          : "Birth date unknown"}
                        {child.mother ? ` · ${child.mother.full_name}` : ""}
                      </div>
                    </div>
                    <div className="hidden sm:block text-sm text-muted-foreground shrink-0 w-32">
                      {child.birth_weight_kg ? `${child.birth_weight_kg} kg` : "Weight unknown"}
                    </div>
                    <div className="hidden md:block text-xs text-muted-foreground shrink-0 w-32 truncate">
                      {child.immunizations?.join(", ") || "No immunizations"}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0",
                        child.growth_notes
                          ? "bg-success/10 text-success border-success/30"
                          : "bg-warning/10 text-warning border-warning/30",
                      )}
                    >
                      {child.growth_notes ? "Growth noted" : "Needs review"}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
