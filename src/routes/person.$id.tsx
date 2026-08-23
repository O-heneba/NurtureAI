import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, EmptyState, AIRecommendationCard } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, ClipboardCheck, Phone, Send, StickyNote, User } from "lucide-react";
import { getHousehold, getPerson } from "@/lib/registrations";
import { householdAssessments, medicalHistory, personTimeline, referrals, visitHistory } from "@/lib/demo-data";

type TimelineItem = { date: string; label: string; kind: string };
type AssessmentItem = { id: string; patient: string; type: string; date: string; risk: string; summary: string };
type ReferralItem = { id: string; patient: string; to: string; date: string; status: string; reason: string };
type VisitItem = { id: string; date: string; type: string; by: string; notes: string };

export const Route = createFileRoute("/person/$id")({
  loader: async ({ params }) => {
    const p = await getPerson(params.id);
    if (!p) throw notFound();
    const household = p.household_id ? await getHousehold(p.household_id) : null;
    const age = p.date_of_birth
      ? Math.max(0, new Date().getFullYear() - new Date(p.date_of_birth).getFullYear())
      : 0;
    return {
      household,
      p: {
        ...p,
        name: p.full_name,
        age,
        gender: p.sex ?? "",
        community: "Community not recorded",
        relationship: "Household member",
        dob: p.date_of_birth ?? "Not recorded",
        marital: p.marital_status ?? "Not recorded",
        householdId: p.household_id ?? "",
        household: household?.head_name ?? "Household not recorded",
        profileTypes: p.profile_types ?? [],
        priorityStatus: p.priority_status ?? "routine",
        dataCompleteness: 0,
        disabilityStatus: p.disability_status ?? "None",
        status: p.priority_status === "urgent" ? "Urgent" : "Registered",
        note: p.notes ?? "No notes recorded",
      },
    };
  },
  component: PersonProfile,
  notFoundComponent: () => (
    <AppLayout>
      <EmptyState
        title="Person not found"
        action={
          <Link to="/people">
            <button className="btn">Back to people</button>
          </Link>
        }
      />
    </AppLayout>
  ),
});

function PersonProfile() {
  const { p } = Route.useLoaderData();
  const timeline = (personTimeline as unknown as Record<string, TimelineItem[]>)[p.id] ?? [];
  const history = (medicalHistory as unknown as Record<string, string[]>)[p.id] ?? [];
  const assessments = (householdAssessments as AssessmentItem[]).filter((a) => a.patient === p.name);
  const refs = (referrals as ReferralItem[]).filter((r) => r.patient === p.name);
  const visits = (visitHistory as VisitItem[]).filter((v) => timeline.some((t: TimelineItem) => t.date === v.date));

  return (
    <AppLayout>
      <PageHeader
        title={p.name}
        description={`${p.age}y · ${p.gender === "F" ? "Female" : "Male"} · ${p.community}`}
        icon={<User className="h-5 w-5" />}
        breadcrumbs={[{ label: "People", to: "/people" }, { label: p.name }]}
        actions={<Badge variant="secondary">{p.status}</Badge>}
      />

      <Card className="rounded-xl mb-4">
        <CardContent className="p-5 grid sm:grid-cols-[auto_1fr] gap-5 items-start">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
              {p.name
                .split(" ")
                .map((s: string) => s[0])
                .slice(0, 2)
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="grid sm:grid-cols-3 gap-4 text-sm w-full">
            <div>
              <div className="text-xs text-muted-foreground">Date of birth</div>
              <div className="font-medium">{p.dob}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Relationship</div>
              <div className="font-medium">{p.relationship}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Marital status</div>
              <div className="font-medium">{p.marital}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Occupation</div>
              <div className="font-medium">{p.occupation}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Education</div>
              <div className="font-medium">{p.education}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> Phone
              </div>
              <div className="font-medium">{p.phone}</div>
            </div>
            <div className="sm:col-span-3">
              <div className="text-xs text-muted-foreground">Household</div>
              <Link
                to="/household/$id"
                params={{ id: p.householdId }}
                className="font-medium text-primary hover:underline"
              >
                {p.household}
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="rounded-xl mb-4 overflow-x-auto flex w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {p.profileTypes?.includes("Maternal") && (
            <TabsTrigger value="maternal">Maternal Health</TabsTrigger>
          )}
          {p.profileTypes?.includes("Newborn") && (
            <TabsTrigger value="newborn">Newborn Health</TabsTrigger>
          )}
          {p.profileTypes?.includes("Child Health") && (
            <TabsTrigger value="child">Child Health</TabsTrigger>
          )}
          <TabsTrigger value="medical">Medical history</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="visits">Visits</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="rounded-xl border-warning/40 bg-warning/5">
            <CardContent className="p-4 text-xs text-muted-foreground">
              <strong>Decision-support, not diagnosis:</strong> This profile and recommendations are
              clinical decision-support tools only. They do not replace professional medical
              judgment. Always consult with qualified healthcare providers for diagnosis and
              treatment.
            </CardContent>
          </Card>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Profile & priority</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Priority status</div>
                  <div className="font-semibold capitalize">{p.priorityStatus || "routine"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Profile types</div>
                  <div className="text-sm">
                    {(p.profileTypes || []).join(", ") || "Not specified"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Data completeness</div>
                  <div className="font-semibold">{p.dataCompleteness || 0}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Disability status</div>
                  <div className="font-medium">{p.disabilityStatus || "None"}</div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Contributing factors</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="text-xs text-muted-foreground">Factors influencing priority:</div>
                <ul className="text-xs space-y-1 list-disc list-inside">
                  {p.profileTypes?.includes("Maternal") && p.status.includes("Pregnant") && (
                    <li>Active pregnancy</li>
                  )}
                  {p.priorityStatus === "urgent" && <li>Urgent health condition</li>}
                  {p.status.includes("High-risk") && <li>Known risk factors</li>}
                  {p.dataCompleteness && p.dataCompleteness < 70 && <li>Incomplete profile</li>}
                </ul>
              </CardContent>
            </Card>
          </div>
          <AIRecommendationCard title={`Care summary for ${p.name.split(" ")[0]}`}>
            <p>
              Status: <strong>{p.status}</strong>. Note: {p.note}. Continue routine follow-up and
              log any red-flag symptoms in the assessment wizard.
            </p>
          </AIRecommendationCard>
        </TabsContent>

        {p.profileTypes?.includes("Maternal") && (
          <TabsContent value="maternal" className="space-y-4">
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle>Maternal Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-3">
                  <div>
                    <span className="font-medium">Status:</span> {p.status}
                  </div>
                  <div>
                    <span className="font-medium">Last assessment:</span> {p.dob}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {p.profileTypes?.includes("Newborn") && (
          <TabsContent value="newborn" className="space-y-4">
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle>Newborn Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">Newborn-specific assessments and milestones tracking.</div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {p.profileTypes?.includes("Child Health") && (
          <TabsContent value="child" className="space-y-4">
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle>Child Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  Age: {p.age} years. Growth, nutrition, and immunization tracking.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="medical">
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Medical history</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <EmptyState title="No history recorded" />
              ) : (
                <ul className="space-y-2 text-sm">
                  {history.map((h: string, i: number) => (
                    <li key={i} className="rounded-lg border p-3">
                      {h}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assessments">
          <Card className="rounded-xl">
            <CardContent className="p-0 divide-y">
              {assessments.length === 0 && (
                <div className="p-6">
                  <EmptyState
                    title="No assessments yet"
                    icon={<ClipboardCheck className="h-6 w-6" />}
                    action={
                      <Link to="/assessments">
                        <Button>Start assessment</Button>
                      </Link>
                    }
                  />
                </div>
              )}
              {assessments.map((a) => (
                <div key={a.id} className="p-4">
                  <div className="font-medium">{a.type}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.date} · risk {a.risk}
                  </div>
                  <div className="text-sm mt-1 text-muted-foreground">{a.summary}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals">
          <Card className="rounded-xl">
            <CardContent className="p-0 divide-y">
              {refs.length === 0 && (
                <div className="p-6">
                  <EmptyState title="No referrals" icon={<Send className="h-6 w-6" />} />
                </div>
              )}
              {refs.map((r) => (
                <div key={r.id} className="p-4">
                  <div className="font-medium">{r.to}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.date} · {r.status}
                  </div>
                  <div className="text-sm mt-1 text-muted-foreground">{r.reason}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visits">
          <Card className="rounded-xl">
            <CardContent className="p-0 divide-y">
              {visits.length === 0 && (
                <div className="p-6">
                  <EmptyState title="No visits recorded" icon={<Calendar className="h-6 w-6" />} />
                </div>
              )}
              {visits.map((v) => (
                <div key={v.id} className="p-4">
                  <div className="font-medium">{v.type}</div>
                  <div className="text-xs text-muted-foreground">
                    {v.date} · by {v.by}
                  </div>
                  <div className="text-sm mt-1 text-muted-foreground">{v.notes}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card className="rounded-xl">
            <CardContent className="p-5">
              {timeline.length === 0 ? (
                <EmptyState title="No events yet" icon={<StickyNote className="h-6 w-6" />} />
              ) : (
                <ol className="relative border-l pl-6 space-y-5">
                  {timeline.map((t: TimelineItem, i: number) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[29px] top-1 grid h-4 w-4 place-items-center rounded-full bg-primary ring-4 ring-primary/15" />
                      <div className="text-xs text-muted-foreground">{t.date}</div>
                      <div className="font-medium">{t.label}</div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
                        {t.kind}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
