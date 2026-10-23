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
import { evaluateImmunizationStatus, useImmunizationSchedule } from "@/lib/immunization";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/child-health")({
  component: ChildHealth,
});

function nutritionColor(n: string) {
  if (n === "Normal") return "bg-success/10 text-success border-success/30";
  if (n === "Underweight") return "bg-warning/15 text-warning border-warning/30";
  return "bg-destructive/10 text-destructive border-destructive/30";
}

function formatChildHealthDate(value: string | null | undefined) {
  if (!value) return "No date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getChildStatusMeta(child: any) {
  const { summary } = child;

  if (summary.overallStatus === "overdue") {
    return {
      label: "Needs follow-up",
      detail: `${summary.nextMilestone ?? "Vaccine"} due ${formatChildHealthDate(summary.nextDueDate)}`,
    };
  }

  if (summary.numberDue > 0 || summary.numberUpcoming > 0) {
    return {
      label: "Due soon",
      detail: summary.nextDueDate
        ? `Next: ${summary.nextMilestone ?? "Vaccine"} · ${formatChildHealthDate(summary.nextDueDate)}`
        : "Due soon",
    };
  }

  if (summary.numberReceived > 0) {
    return {
      label: "Vaccinated",
      detail: `${summary.numberReceived} vaccine${summary.numberReceived === 1 ? "" : "s"} recorded`,
    };
  }

  return {
    label: "Not started",
    detail: "No immunizations recorded yet",
  };
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
  const [recordsByChild, setRecordsByChild] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const { schedule } = useImmunizationSchedule();

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

  useEffect(() => {
    if (!children.length) {
      setRecordsByChild({});
      return;
    }

    let active = true;
    const childIds = children.map((child) => child.id);

    (async () => {
      const { data, error } = await (supabase
        .from("child_immunizations" as any)
        .select("child_id, schedule_id, vaccine_code, administered_date, source")
        .in("child_id", childIds) as any);

      if (!active || error) {
        if (active) setRecordsByChild({});
        return;
      }

      const grouped: Record<string, any[]> = {};
      for (const match of data ?? []) {
        const key = match.child_id;
        grouped[key] = grouped[key] ?? [];
        grouped[key].push(match);
      }
      setRecordsByChild(grouped);
    })();

    return () => {
      active = false;
    };
  }, [children]);

  const personsById = useMemo(() => new Map(persons.map((p) => [p.id, p])), [persons]);
  const childRows = useMemo(() => {
    const childrenByPerson = new Map<string, ChildHealthRow[]>();
    for (const child of children) {
      const group = childrenByPerson.get(child.person_id) ?? [];
      group.push(child);
      childrenByPerson.set(child.person_id, group);
    }

    return Array.from(childrenByPerson.values()).map((group) => {
      const child = [...group].sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
      const person = personsById.get(child.person_id);
      const mother = child.mother_person_id ? personsById.get(child.mother_person_id) : null;
      const records = group.flatMap((item) => recordsByChild[item.id] ?? []);
      const summary = person?.date_of_birth
        ? evaluateImmunizationStatus({
            dob: person.date_of_birth,
            schedule,
            records,
          })
        : {
            items: [],
            overallStatus: "not_started" as const,
            nextMilestone: null,
            nextDueDate: null,
            numberReceived: 0,
            numberDue: 0,
            numberOverdue: 0,
            numberUpcoming: 0,
            completionPercentage: 0,
          };
      return { ...child, person, mother, summary, duplicateCount: group.length };
    });
  }, [children, personsById, recordsByChild, schedule]);

  const total = childRows.length;
  const immunizedCount = childRows.filter((child) => child.summary.numberReceived > 0).length;
  const growthCount = childRows.filter((child) => child.growth_notes).length;
  const overdueCount = childRows.filter(
    (child) => child.summary.overallStatus === "overdue",
  ).length;
  const missingGrowthCount = childRows.filter((child) => !child.growth_notes).length;
  const duplicateGroups = useMemo(() => {
    const groups = new Map<string, ChildHealthRow[]>();
    for (const child of children) {
      const name = personsById.get(child.person_id)?.full_name?.trim().toLowerCase();
      const dob = personsById.get(child.person_id)?.date_of_birth;
      if (!name || !dob) continue;
      const key = `${name}|${dob}`;
      const group = groups.get(key) ?? [];
      group.push(child);
      groups.set(key, group);
    }
    return Array.from(groups.entries())
      .map(([key, group]) => ({ key, group }))
      .filter(({ group }) => group.length > 1);
  }, [children, personsById]);

  const monthlyRegistrations = useMemo(() => {
    const sorted = [...children].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    if (sorted.length === 0) return [];

    const firstDate = new Date(sorted[0].created_at);
    const lastDate = new Date(sorted[sorted.length - 1].created_at);
    const months: Array<{ month: string; count: number }> = [];
    const cursor = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
    const end = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);

    while (cursor <= end) {
      const month = cursor.toLocaleString("default", { month: "short", year: "numeric" });
      const count = sorted.filter((child) => {
        const date = new Date(child.created_at);
        return date.getFullYear() === cursor.getFullYear() && date.getMonth() === cursor.getMonth();
      }).length;
      months.push({ month, count });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return months;
  }, [children]);

  const scheduleItems = useMemo(
    () =>
      schedule.map((item) => {
        const childIds = Object.entries(recordsByChild).reduce((ids, [childId, matches]) => {
          const matchesItem = matches.filter(
            (record) =>
              (record.schedule_id && record.schedule_id === item.id) ||
              (!!record.vaccine_code && record.vaccine_code === item.vaccine_code),
          );
          if (matchesItem.length > 0) ids.add(childId);
          return ids;
        }, new Set<string>());
        return { name: item.display_name, count: childIds.size };
      }),
    [recordsByChild, schedule],
  );

  if (loading) {
    return (
      <AppLayout>
        <PageHeader
          title="Child Health"
          description="Growth monitoring & immunization tracking for children under 5"
        />
        <div className="space-y-6" aria-label="Loading child health data" aria-busy="true">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {["under-five", "immunisation", "growth", "overdue"].map((label) => (
              <div key={label} className="h-32 animate-pulse rounded-xl border bg-card" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="h-80 animate-pulse rounded-xl border bg-card lg:col-span-2" />
            <div className="h-80 animate-pulse rounded-xl border bg-card" />
          </div>
          <div className="h-64 animate-pulse rounded-xl border bg-card" />
        </div>
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

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 mb-6">
        <StatCard
          label="Under 5"
          value={total}
          hint="Registered children"
          icon={<Baby className="h-5 w-5" />}
          tone="primary"
        />
        <StatCard
          label="Immunised"
          value={`${total ? Math.round((immunizedCount / total) * 100) : 0}%`}
          hint={`${immunizedCount} of ${total} children`}
          icon={<Syringe className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Growth notes"
          value={growthCount}
          hint={`${missingGrowthCount} missing records`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="info"
        />
        <StatCard
          label="Overdue vaccines"
          value={overdueCount}
          hint="Needs follow-up"
          icon={<Activity className="h-5 w-5" />}
          tone="warning"
        />
      </div>

      {duplicateGroups.length > 0 && (
        <Card className="mb-6 rounded-xl border-warning/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-warning">Possible duplicate children</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              These records have the same child name and birth date. Open the person records to
              review and remove duplicates.
            </p>
            {duplicateGroups.map(({ key, group }) => (
              <div key={key} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold">
                    {personsById.get(group[0].person_id)?.full_name}
                  </span>
                  <Badge variant="outline" className="border-warning/40 text-warning">
                    {group.length} records
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/person/$id"
                    params={{ id: group[0].person_id }}
                    className="text-sm text-primary underline underline-offset-2"
                  >
                    Open shared person record
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid min-w-0 gap-6 mb-6 lg:grid-cols-3">
        <Card className="min-w-0 rounded-xl lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Child registrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {monthlyRegistrations.length === 0 ? (
                <div className="grid h-full place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">
                  No registration data yet
                </div>
              ) : (
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
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Immunization coverage</CardTitle>
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
                const statusMeta = getChildStatusMeta(child);
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
                      <div className="mt-1 text-[11px] text-muted-foreground truncate">
                        {statusMeta.detail}
                        {child.duplicateCount > 1
                          ? ` · ${child.duplicateCount} linked profiles`
                          : ""}
                      </div>
                    </div>
                    <div className="hidden sm:block text-sm text-muted-foreground shrink-0 w-32">
                      {child.birth_weight_kg ? `${child.birth_weight_kg} kg` : "Weight unknown"}
                    </div>
                    <div className="hidden md:block text-xs text-muted-foreground shrink-0 w-40 truncate">
                      {child.summary.nextDueDate
                        ? `Due ${formatChildHealthDate(child.summary.nextDueDate)}`
                        : "No immunizations"}
                    </div>
                    <div className="hidden xl:block text-xs text-muted-foreground shrink-0 w-32 truncate">
                      {child.summary.nextMilestone ?? "No milestone"}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0",
                        child.summary.overallStatus === "overdue"
                          ? "bg-warning/10 text-warning border-warning/30"
                          : child.summary.numberReceived > 0
                            ? "bg-success/10 text-success border-success/30"
                            : "bg-muted text-muted-foreground border-border",
                      )}
                    >
                      {statusMeta.label}
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
