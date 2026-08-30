import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, EmptyState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MapPin, Home, AlertTriangle, Clock3, UserRound } from "lucide-react";
import { listAssessments } from "@/lib/assessments";
import { listFollowUps } from "@/lib/followups";
import { getCommunity, listHouseholdsByCommunity, listPersons } from "@/lib/registrations";

export const Route = createFileRoute("/community/$id")({
  loader: async ({ params }) => {
    const c = await getCommunity(params.id);
    if (!c) throw notFound();
    const [households, people, followUps, assessments] = await Promise.all([
      listHouseholdsByCommunity(params.id),
      listPersons(),
      listFollowUps(),
      listAssessments(),
    ]);
    return { c, households, people, followUps, assessments };
  },
  component: CommunityDetail,
  notFoundComponent: () => (
    <AppLayout>
      <EmptyState
        title="Community not found"
        description="This community may have been removed or moved."
        action={
          <Link to="/communities">
            <button className="btn">Back to communities</button>
          </Link>
        }
      />
    </AppLayout>
  ),
});

function CommunityDetail() {
  const { c, households, people, followUps, assessments } = Route.useLoaderData();
  const hasHouseholds = households.length > 0;
  const householdIds = new Set(households.map((household) => household.id));
  const householdMembers = new Map<string, number>();
  const communityPeople = people.filter((person) => !!person.household_id && householdIds.has(person.household_id));

  for (const person of communityPeople) {
    if (!person.household_id) continue;
    householdMembers.set(person.household_id, (householdMembers.get(person.household_id) ?? 0) + 1);
  }

  const followUpHouseholdIds = new Set(
    followUps
      .filter((followUp) => followUp.household_id && householdIds.has(followUp.household_id))
      .filter((followUp) => !["completed", "cancelled"].includes(followUp.status))
      .map((followUp) => followUp.household_id as string),
  );

  const householdPriorityPeople = new Map<string, { personName: string; level: string; assessment: string | null }[]>();
  const personById = new Map(communityPeople.map((person) => [person.id, person]));

  for (const assessment of assessments) {
    if (!assessment.person_id) continue;
    const person = personById.get(assessment.person_id);
    if (!person || !person.household_id || !householdIds.has(person.household_id)) continue;

    const priority = assessment.inputs?.priority ?? assessment.risk_level ?? "";
    const normalizedPriority = String(priority).toLowerCase();
    const isPriorityCase = ["priority_review", "urgent", "high", "critical"].includes(normalizedPriority);
    if (!isPriorityCase) continue;

    const previous = householdPriorityPeople.get(person.household_id) ?? [];
    previous.push({
      personName: person.full_name,
      level: normalizedPriority === "priority_review" ? "Priority Review" : normalizedPriority === "urgent" ? "Urgent" : normalizedPriority === "high" ? "High" : "Critical",
      assessment: assessment.summary ?? "Assessment recorded",
    });
    householdPriorityPeople.set(person.household_id, previous);
  }

  const householdsRequiringFollowUp = households.filter((household) => followUpHouseholdIds.has(household.id));
  const householdsWithPriorityCases = households.filter((household) => householdPriorityPeople.has(household.id));
  const followUpSectionId = "households-requiring-follow-up";
  const prioritySectionId = "households-with-priority-cases";

  return (
    <AppLayout>
      <PageHeader
        title={c.name}
        description={`${c.district ?? "Unknown district"} · ${c.region ?? "Unknown region"}`}
        icon={<MapPin className="h-5 w-5" />}
        breadcrumbs={[{ label: "Communities", to: "/communities" }, { label: c.name }]}
        actions={<Badge variant="outline">{c.chps_facility_id || "CHPS facility"}</Badge>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 mb-6">
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Community overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">District:</span> {c.district || "N/A"}
            </div>
            <div>
              <span className="font-medium text-foreground">Region:</span> {c.region || "N/A"}
            </div>
            <div>
              <span className="font-medium text-foreground">Facility ID:</span>{" "}
              {c.chps_facility_id || "Not specified"}
            </div>
            <div>
              <span className="font-medium text-foreground">Community code:</span>{" "}
              {c.community_code || "N/A"}
            </div>
            <div>
              <span className="font-medium text-foreground">Notes:</span>{" "}
              {c.notes || "No notes available."}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Household summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              Total households in community:{" "}
              <span className="font-semibold text-foreground">{households.length}</span>
            </div>
            <div>Last updated data is sourced from the live household register.</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={hasHouseholds ? "households" : "overview"} className="w-full">
        <TabsList className="rounded-xl mb-4 overflow-x-auto flex w-full justify-start">
          <TabsTrigger value="households">Households</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="rounded-xl">
            <CardContent className="p-5 space-y-5">
              <div className="space-y-3">
                <div className="text-base font-semibold text-foreground">Community Summary</div>
                <div className="grid gap-3 md:grid-cols-3">
                  <SummaryCard label="Total Households" value={String(households.length)} helper="Registered households in this community" />
                  <SummaryCard
                    label="Households Requiring Follow-up"
                    value={String(householdsRequiringFollowUp.length)}
                    helper="Pending, overdue, or scheduled follow-ups"
                    href={`#${followUpSectionId}`}
                  />
                  <SummaryCard
                    label="Households with Priority Cases"
                    value={String(householdsWithPriorityCases.length)}
                    helper="Priority Review or Urgent cases"
                    href={`#${prioritySectionId}`}
                  />
                </div>
              </div>

              <div id={followUpSectionId} className="space-y-3 pt-2">
                <div>
                  <div className="text-base font-semibold text-foreground">Households Requiring Follow-up</div>
                  <p className="text-sm text-muted-foreground">Households with pending, overdue, or scheduled follow-up actions.</p>
                </div>
                {householdsRequiringFollowUp.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No households currently require follow-up.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {householdsRequiringFollowUp.map((household) => {
                      const householdFollowUps = followUps.filter(
                        (followUp) =>
                          followUp.household_id === household.id &&
                          !["completed", "cancelled"].includes(followUp.status),
                      );
                      const nextFollowUp = householdFollowUps.sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
                      return (
                        <Link key={household.id} to="/household/$id" params={{ id: household.id }} className="block">
                          <div className="rounded-lg border p-3 hover:bg-accent/30 transition-colors">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="font-medium text-foreground">{household.head_name}</div>
                                <div className="text-xs text-muted-foreground">{household.house_no}</div>
                              </div>
                              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                                {nextFollowUp?.status ?? "active"}
                              </Badge>
                            </div>
                            <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                              <div>
                                <div className="text-[10px] uppercase tracking-wide">Members</div>
                                <div className="font-medium text-foreground">{householdMembers.get(household.id) ?? 0}</div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase tracking-wide">Status</div>
                                <div className="font-medium text-foreground">{nextFollowUp?.priority ?? "routine"}</div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase tracking-wide">Due</div>
                                <div className="font-medium text-foreground">{nextFollowUp?.due_date ? new Date(nextFollowUp.due_date).toLocaleDateString() : "Not set"}</div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              <div id={prioritySectionId} className="space-y-3 pt-2">
                <div>
                  <div className="text-base font-semibold text-foreground">Households with Priority Cases</div>
                  <p className="text-sm text-muted-foreground">Households containing members classified as Priority Review or Urgent.</p>
                </div>
                {householdsWithPriorityCases.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No priority cases currently identified.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {householdsWithPriorityCases.map((household) => {
                      const cases = householdPriorityPeople.get(household.id) ?? [];
                      return (
                        <Link key={household.id} to="/household/$id" params={{ id: household.id }} className="block">
                          <div className="rounded-lg border p-3 hover:bg-accent/30 transition-colors">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="font-medium text-foreground">{household.head_name}</div>
                                <div className="text-xs text-muted-foreground">{household.house_no}</div>
                              </div>
                              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                                {cases[0]?.level ?? "Priority"}
                              </Badge>
                            </div>
                            <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                              {cases.map((item, index) => (
                                <div key={`${item.personName}-${index}`} className="rounded-md bg-muted/20 p-2">
                                  <div className="flex items-center gap-2 text-foreground">
                                    <UserRound className="h-3.5 w-3.5" />
                                    <span className="font-medium">{item.personName}</span>
                                    <span className="text-muted-foreground">· {item.level}</span>
                                  </div>
                                  <div className="mt-1">{item.assessment}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="households">
          <Card className="rounded-xl">
            <CardContent className="p-0 divide-y">
              {households.length === 0 && (
                <div className="p-6">
                  <EmptyState
                    title="No households in this community"
                    description="Add households from the households page."
                  />
                </div>
              )}
              {households.map((h) => (
                <button
                  key={h.id}
                  className="flex items-center gap-3 p-4 w-full text-left hover:bg-accent/40 transition-colors rounded-t-xl"
                  onClick={() => window.location.assign(`/household/${h.id}`)}
                >
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Home className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{h.head_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {h.house_no} · {h.address || "No address"}
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

function SummaryCard({ label, value, helper, href }: { label: string; value: string; helper: string; href?: string }) {
  const content = (
    <div className="rounded-xl border bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{helper}</div>
    </div>
  );

  if (!href) return content;

  return (
    <a href={href} className="block rounded-xl transition-opacity hover:opacity-90">
      {content}
    </a>
  );
}
