import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, StatCard, EmptyState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Baby, Syringe } from "lucide-react";
import { getChildProfile, getPerson } from "@/lib/registrations";
import { useChildImmunizationStatus, useChildImmunizations, useImmunizationSchedule } from "@/lib/immunization";

export const Route = createFileRoute("/child/$id")({
  loader: async ({ params }) => {
    const child = await getChildProfile(params.id);
    if (!child) throw notFound();
    const childPerson = await getPerson(child.person_id);
    if (!childPerson) throw notFound();
    const motherPerson = child.mother_person_id ? await getPerson(child.mother_person_id) : null;
    return { child, childPerson, motherPerson };
  },
  component: ChildProfile,
  notFoundComponent: () => (
    <AppLayout>
      <EmptyState
        title="Child not found"
        action={
          <Link to="/child-health">
            <Button>Back to child health</Button>
          </Link>
        }
      />
    </AppLayout>
  ),
});

function ChildProfile() {
  const { child, childPerson, motherPerson } = Route.useLoaderData();
  const { records } = useChildImmunizations(child.id);
  const { schedule } = useImmunizationSchedule();
  const summary = useChildImmunizationStatus(child.id, childPerson.date_of_birth);
  const growthNotes = child.growth_notes || "No growth notes available.";

  const immunizationStatus =
    summary.numberReceived === 0
      ? "Not started"
      : summary.overallStatus === "overdue"
        ? "Overdue"
        : summary.overallStatus === "due"
          ? "Due soon"
          : "Up to date";

  const vaccineNames = records.map((record) => {
    const match = schedule.find(
      (item) =>
        (record.schedule_id && item.id === record.schedule_id) ||
        (!!record.vaccine_code && item.vaccine_code === record.vaccine_code),
    );
    return match?.display_name ?? record.vaccine_code ?? "Recorded vaccine";
  });

  return (
    <AppLayout>
      <PageHeader
        title={childPerson.full_name}
        description={motherPerson ? `Child of ${motherPerson.full_name}` : "Child health profile"}
        icon={<Baby className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Child Health", to: "/child-health" },
          { label: childPerson.full_name },
        ]}
        actions={<Badge variant="outline">{immunizationStatus}</Badge>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard
          label="Birth weight"
          value={child.birth_weight_kg ? `${child.birth_weight_kg} kg` : "Unknown"}
          icon={<Baby className="h-4 w-4" />}
          tone="primary"
        />
        <StatCard
          label="Immunizations"
          value={`${summary.numberReceived}/${summary.items.length || 0}`}
          icon={<Syringe className="h-4 w-4" />}
          tone={summary.overallStatus === "overdue" ? "warning" : "success"}
        />
        <StatCard
          label="Mother"
          value={motherPerson?.full_name ?? "Not linked"}
          icon={<Baby className="h-4 w-4" />}
          tone="info"
        />
        <StatCard
          label="Profile"
          value={childPerson.sex || "Unknown"}
          icon={<Baby className="h-4 w-4" />}
          tone="info"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Growth notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{growthNotes}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Immunization record</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {records.length > 0 ? (
              <>
                <div className="text-sm font-medium">
                  {summary.nextMilestone
                    ? `Next milestone: ${summary.nextMilestone}`
                    : "All routine doses currently accounted for"}
                </div>
                {summary.nextDueDate && (
                  <div className="text-xs text-muted-foreground">
                    Next due date: {summary.nextDueDate}
                  </div>
                )}
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  {vaccineNames.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No immunization data recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
