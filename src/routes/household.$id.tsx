import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, EmptyState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Home, Users, Phone, MapPin } from "lucide-react";
import { getHousehold, listPersonsByHousehold } from "@/lib/registrations";

export const Route = createFileRoute("/household/$id")({
  loader: async ({ params }) => {
    const h = await getHousehold(params.id);
    if (!h) throw notFound();
    const members = await listPersonsByHousehold(params.id);
    return { h, members };
  },
  component: HouseholdDetail,
  notFoundComponent: () => (
    <AppLayout>
      <EmptyState
        title="Household not found"
        action={
          <Link to="/households">
            <button className="btn">Back to households</button>
          </Link>
        }
      />
    </AppLayout>
  ),
});

function HouseholdDetail() {
  const { h } = Route.useLoaderData();
  const members = people.filter((p) => p.householdId === h.id);
  const assessments = householdAssessments.filter((a) => a.householdId === h.id);
  const visits = visitHistory.filter((v) => v.householdId === h.id);
  const notes = householdNotes.filter((n) => n.householdId === h.id);
  const hRefs = referrals.filter((r) => members.some((m) => m.name === r.patient));
  const [visitStep, setVisitStep] = useState(0);
  const visitSteps = ["Prepare", "Observe", "Record", "Close"];

  const healthSummaryTone =
    h.risk === "high" ? "destructive" : h.risk === "medium" ? "warning" : "success";
  const healthSummary =
    h.risk === "high"
      ? "Known issue requiring urgent follow-up"
      : h.risk === "medium"
        ? "Known issue under monitoring"
        : "Known/Unknown/Missing data still needs confirmation";

  return (
    <AppLayout>
      <PageHeader
        title={h.head}
        description={`${h.houseNo} · ${h.community}`}
        icon={<Home className="h-5 w-5" />}
        breadcrumbs={[{ label: "Households", to: "/households" }, { label: h.head }]}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {h.priorityStatus}
            </Badge>
            <RiskBadge level={h.risk} />
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card className="rounded-xl lg:col-span-2">
          <CardContent className="p-5">
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Head</div>
                <div className="font-medium">{h.head}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">House number</div>
                <div className="font-medium">{h.houseNo}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Address
                </div>
                <div className="font-medium">{h.address}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Phone
                </div>
                <div className="font-medium">{h.phone}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Registered</div>
                <div className="font-medium">{h.registered}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Last visit</div>
                <div className="font-medium">{h.lastVisit}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Link to="/register/person" className="contents">
              <Button variant="outline" size="sm" className="w-full rounded-lg">
                <UserPlus className="mr-1 h-4 w-4" /> Add person
              </Button>
            </Link>
            <Link to="/assessments" className="contents">
              <Button variant="outline" size="sm" className="w-full rounded-lg">
                <ClipboardCheck className="mr-1 h-4 w-4" /> Assessment
              </Button>
            </Link>
            <Link to="/referrals" className="contents">
              <Button variant="outline" size="sm" className="w-full rounded-lg">
                <Send className="mr-1 h-4 w-4" /> Referral
              </Button>
            </Link>
            <Button variant="outline" size="sm" className="rounded-lg">
              <CalendarPlus className="mr-1 h-4 w-4" /> Follow-up
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard
          label="Members"
          value={h.members}
          icon={<Users className="h-4 w-4" />}
          tone="primary"
        />
        <StatCard
          label="Pregnant"
          value={h.pregnant}
          icon={<HeartPulse className="h-4 w-4" />}
          tone="success"
        />
        <StatCard
          label="Children"
          value={h.children}
          icon={<Users className="h-4 w-4" />}
          tone="info"
        />
        <StatCard
          label="Assessments"
          value={assessments.length}
          icon={<ClipboardCheck className="h-4 w-4" />}
          tone="warning"
        />
      </div>

      <Card className="rounded-xl mb-4">
        <CardContent className="p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-semibold">Health summary</div>
            <div className="text-sm text-muted-foreground">{healthSummary}</div>
          </div>
          <div className="rounded-xl border px-3 py-2 text-sm">
            <div className="text-xs text-muted-foreground">Data completeness</div>
            <div
              className={`font-semibold ${healthSummaryTone === "destructive" ? "text-destructive" : healthSummaryTone === "warning" ? "text-warning" : "text-success"}`}
            >
              {h.dataCompleteness}%
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="members">
        <TabsList className="rounded-xl mb-4 overflow-x-auto flex w-full justify-start">
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="visits">Visits</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card className="rounded-xl">
            <CardContent className="p-0 divide-y">
              {members.length === 0 && (
                <div className="p-6">
                  <EmptyState
                    title="No members yet"
                    description="Register the first person in this household."
                    action={
                      <Link to="/register/person">
                        <Button>Register person</Button>
                      </Link>
                    }
                  />
                </div>
              )}
              {members.map((p) => (
                <Link
                  key={p.id}
                  to="/person/$id"
                  params={{ id: p.id }}
                  className="flex items-center gap-3 p-4 hover:bg-accent/40"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {p.name
                        .split(" ")
                        .map((s: string) => s[0])
                        .slice(0, 2)
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.age}y · {p.gender === "F" ? "Female" : "Male"} · {p.relationship}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {p.status}
                  </Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visits">
          <Card className="rounded-xl">
            <CardContent className="p-0 divide-y">
              {visits.length === 0 && (
                <div className="p-6">
                  <EmptyState title="No visits yet" />
                </div>
              )}
              {visits.map((v) => (
                <div key={v.id} className="flex items-start gap-3 p-4">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-info/10 text-info">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{v.type}</div>
                    <div className="text-xs text-muted-foreground">
                      {v.date} · by {v.by}
                    </div>
                    <div className="text-sm mt-1 text-muted-foreground">{v.notes}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="rounded-xl mt-4">
            <CardHeader>
              <CardTitle className="text-base">Start household visit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {visitSteps.map((label, index) => (
                  <div
                    key={label}
                    className={`rounded-full px-3 py-1 ${visitStep === index ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  >
                    {label}
                  </div>
                ))}
              </div>
              <div className="rounded-lg border p-3 text-sm">
                {visitStep === 0 && (
                  <div>Review household data and prepare questions for the visit.</div>
                )}
                {visitStep === 1 && (
                  <div>
                    Observe the home environment, available water, and sanitation conditions.
                  </div>
                )}
                {visitStep === 2 && (
                  <div>Record findings, referrals, or follow-up actions immediately.</div>
                )}
                {visitStep === 3 && (
                  <div>Close the visit and schedule the next follow-up date.</div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setVisitStep((prev) => Math.max(0, prev - 1))}
                >
                  Back
                </Button>
                <Button
                  onClick={() => setVisitStep((prev) => Math.min(visitSteps.length - 1, prev + 1))}
                >
                  Next <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assessments">
          <Card className="rounded-xl">
            <CardContent className="p-0 divide-y">
              {assessments.length === 0 && (
                <div className="p-6">
                  <EmptyState title="No assessments logged" />
                </div>
              )}
              {assessments.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">
                      {a.patient} — {a.type}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {a.date} · {a.summary}
                    </div>
                  </div>
                  <RiskBadge level={a.risk} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals">
          <Card className="rounded-xl">
            <CardContent className="p-0 divide-y">
              {hRefs.length === 0 && (
                <div className="p-6">
                  <EmptyState title="No referrals" />
                </div>
              )}
              {hRefs.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">
                      {r.patient} → {r.to}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{r.reason}</div>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {r.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="followups">
          <Card className="rounded-xl">
            <CardContent className="p-0 divide-y">
              <div className="flex items-center justify-between p-4">
                <div>
                  <div className="font-semibold">Upcoming follow-up</div>
                  <div className="text-sm text-muted-foreground">{h.nextFollowUpAt}</div>
                </div>
                <Badge variant="outline" className="capitalize">
                  {h.visitStatus}
                </Badge>
              </div>
              <div className="p-4 text-sm text-muted-foreground">
                Priority: {h.priorityStatus}; barriers: {h.barriers.join(", ")}; data completeness:{" "}
                {h.dataCompleteness}%.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card className="rounded-xl">
            <CardContent className="p-0 divide-y">
              {notes.length === 0 && (
                <div className="p-6">
                  <EmptyState title="No notes yet" icon={<StickyNote className="h-6 w-6" />} />
                </div>
              )}
              {notes.map((n) => (
                <div key={n.id} className="p-4">
                  <div className="text-xs text-muted-foreground">{n.date}</div>
                  <div className="text-sm mt-1">{n.text}</div>
                </div>
              ))}
            </CardContent>
          </Card>
          <AIRecommendationCard title="Suggested follow-up" tone="primary">
            <p>
              Based on recent visits, schedule an ANC reminder and confirm the household water
              source is safe. Log a follow-up visit within 2 weeks.
            </p>
          </AIRecommendationCard>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
