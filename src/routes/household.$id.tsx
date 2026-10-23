import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { EmptyState, PageHeader } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Calendar, FileText, HeartPulse, Home, Save, Users } from "lucide-react";
import {
  getWorkflowHousehold,
  listWorkflowPersonsByHousehold,
  updateWorkflowHousehold,
} from "@/lib/household-person.service";
import { listAssessments } from "@/lib/assessments";
import { listFollowUps } from "@/lib/followups";
import { listCommunities, listPregnancies } from "@/lib/registrations";
import { listReferrals } from "@/lib/referrals";
import { communityIssueLabel } from "@/lib/community-issues";

export const Route = createFileRoute("/household/$id")({
  loader: async ({ params }) => {
    const household = await getWorkflowHousehold(params.id);
    if (!household) throw notFound();
    const members = await listWorkflowPersonsByHousehold(household.localId);
    const [communities, pregnancies, followUps, assessments, referrals] = await Promise.all([
      listCommunities(),
      listPregnancies(),
      listFollowUps(),
      listAssessments(1000),
      listReferrals(),
    ]);
    return { household, members, communities, pregnancies, followUps, assessments, referrals };
  },
  component: HouseholdDetail,
  notFoundComponent: () => (
    <AppLayout>
      <EmptyState title="Household not found" action={<Link to="/households">Back to households</Link>} />
    </AppLayout>
  ),
});

function HouseholdDetail() {
  const { household: initial, members, communities, pregnancies, followUps, assessments, referrals } = Route.useLoaderData();
  const [household, setHousehold] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [communitiesList, setCommunitiesList] = useState<Array<{ id: string; name: string; district: string | null }>>([]);

  useEffect(() => {
    setCommunitiesList(communities);
  }, [communities]);

  const community = useMemo(
    () => communitiesList.find((row) => row.id === household.community_id) ?? null,
    [communitiesList, household.community_id],
  );

  const personIds = useMemo(() => new Set(members.map((member) => member.id)), [members]);
  const memberPregnancies = useMemo(
    () => pregnancies.filter((item) => item.person_id && personIds.has(item.person_id)),
    [personIds, pregnancies],
  );
  const activeFollowUps = useMemo(
    () =>
      followUps.filter(
        (item) =>
          item.household_id === household.id || item.household_id === household.localId ||
          (item.person_id && members.some((member) => member.id === item.person_id)),
      ).filter((item) => !["completed", "cancelled"].includes(item.status)),
    [followUps, household.id, household.localId, members],
  );
  const householdAssessments = useMemo(
    () => assessments.filter((item) => item.person_id && members.some((member) => member.id === item.person_id)),
    [assessments, members],
  );
  const householdReferrals = useMemo(
    () => referrals.filter((item) => item.person_id && members.some((member) => member.id === item.person_id)),
    [members, referrals],
  );

  const attention = useMemo(() => {
    const messages: string[] = [];
    if (activeFollowUps.length) messages.push("Follow-up required");
    const hasPriority = householdAssessments.some((assessment) => {
      const priority = (assessment.inputs?.priority ?? assessment.risk_level ?? "").toString().toLowerCase();
      return ["priority_review", "urgent", "high", "critical"].includes(priority);
    });
    if (hasPriority) messages.push("Priority case identified");
    if (householdReferrals.some((referral) => !["completed", "cancelled"].includes(referral.status ?? ""))) {
      messages.push("Referral pending");
    }
    return messages;
  }, [activeFollowUps.length, householdAssessments, householdReferrals]);

  async function save() {
    setSaving(true);
    try {
      const saved = await updateWorkflowHousehold(household.localId, {
        head_name: household.head_name,
        house_no: household.house_no,
        phone: household.phone,
        address: household.address,
        community_id: household.community_id,
      });
      setHousehold(saved);
      setEditing(false);
      setMessage(saved.workflowStatus === "pending" ? "Saved locally · pending sync" : "Synced");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <PageHeader
        title={household.head_name}
        description={`${household.house_no} · ${community?.name ?? household.community_id ?? "Community not recorded"}`}
        icon={<Home className="h-5 w-5" />}
        breadcrumbs={[{ label: "Households", to: "/households" }, { label: household.head_name }]}
        actions={<Badge variant="outline">{household.workflowStatus}</Badge>}
      />

      <Card className="rounded-xl mb-4">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Household details</CardTitle>
          {editing ? (
            <Button size="sm" onClick={save} disabled={saving}>
              <Save className="mr-1 h-4 w-4" /> {saving ? "Saving" : "Save"}
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">Head of household<Input disabled={!editing} value={household.head_name} onChange={(event) => setHousehold({ ...household, head_name: event.target.value })} /></label>
          <label className="text-sm">House number<Input disabled={!editing} value={household.house_no} onChange={(event) => setHousehold({ ...household, house_no: event.target.value })} /></label>
          <label className="text-sm">Phone<Input disabled={!editing} value={household.phone ?? ""} onChange={(event) => setHousehold({ ...household, phone: event.target.value })} /></label>
          <label className="text-sm">Address<Input disabled={!editing} value={household.address ?? ""} onChange={(event) => setHousehold({ ...household, address: event.target.value })} /></label>
          <label className="text-sm">
            Community
            <Select
              value={household.community_id ?? ""}
              onValueChange={(communityId) => setHousehold({ ...household, community_id: communityId })}
              disabled={!editing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select community" />
              </SelectTrigger>
              <SelectContent>
                {communitiesList.map((communityItem) => (
                  <SelectItem key={communityItem.id} value={communityItem.id}>
                    {communityItem.name} {communityItem.district ? `· ${communityItem.district}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4" /> {members.length} household member{members.length === 1 ? "" : "s"}</div>
          <div className="text-sm text-muted-foreground" role="status">{message}</div>
        </CardContent>
      </Card>

      <Card className="rounded-xl mb-4">
        <CardHeader>
          <CardTitle className="text-base">Recorded household concerns</CardTitle>
        </CardHeader>
        <CardContent>
          {household.barriers?.length ? (
            <div className="flex flex-wrap gap-2">
              {household.barriers.map((barrier, index) => (
                <Badge key={`${barrier}-${index}`} variant="secondary">
                  {communityIssueLabel(barrier)}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No household concerns recorded. This does not necessarily mean there are no needs.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] mb-4">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">Household Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label="Household members" value={String(members.length)} icon={<Users className="h-4 w-4" />} />
              <StatCard label="Pregnancy records" value={String(memberPregnancies.length)} icon={<HeartPulse className="h-4 w-4" />} />
              <StatCard label="Follow-ups" value={String(activeFollowUps.length)} icon={<Calendar className="h-4 w-4" />} />
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Household members</h3>
              {members.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No household members registered.</p>
              ) : (
                <div className="space-y-2">
                  {members.map((person) => {
                    const personAssessments = householdAssessments.filter((assessment) => assessment.person_id === person.id);
                    const personContextIssues = Array.from(
                      new Set(
                        personAssessments.flatMap((assessment) =>
                          Array.isArray(assessment.inputs?.context_issues)
                            ? assessment.inputs.context_issues.filter(
                                (issue: unknown): issue is string => typeof issue === "string",
                              )
                            : [],
                        ),
                      ),
                    );
                    const latestPriority = personAssessments
                      .map((assessment) => (assessment.inputs?.priority ?? assessment.risk_level ?? "").toString())
                      .find(Boolean) || person.priority_status || "Not recorded";
                    const age = person.date_of_birth ? calculateAge(person.date_of_birth) : "Age unavailable";

                    return (
                      <Link key={person.localId} to="/person/$id" params={{ id: person.id }} className="block rounded-lg border p-3 hover:bg-accent/30 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-foreground">{person.full_name}</div>
                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span>{age}</span>
                              <span>·</span>
                              <span>{person.sex === "F" ? "Female" : person.sex === "M" ? "Male" : "Not recorded"}</span>
                              {person.profile_types?.length ? <><span>·</span><span>{person.profile_types[0]}</span></> : null}
                            </div>
                          </div>
                          <Badge variant="outline" className="shrink-0">{latestPriority}</Badge>
                        </div>
                        {personContextIssues.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {personContextIssues.map((issue) => (
                              <Badge key={issue} variant="secondary">
                                {communityIssueLabel(issue)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">Attention Needed</CardTitle>
          </CardHeader>
          <CardContent>
            {attention.length === 0 ? (
              <p className="text-sm text-muted-foreground">No immediate actions required for this household.</p>
            ) : (
              <ul className="space-y-2 text-sm text-muted-foreground">
                {attention.map((item) => (
                  <li key={item} className="rounded-md border border-warning/30 bg-warning/5 p-2 text-warning-foreground">
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mb-4">
        <Card className="rounded-xl">
          <CardHeader><CardTitle className="text-base">Health Overview</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <SummaryItem label="Maternal Care" value={String(memberPregnancies.length)} to="/maternal" />
            <SummaryItem label="Child Health" value={String(members.filter((person) => person.profile_types?.includes("Child Health")).length)} to="/child-health" />
            <SummaryItem label="Assessments" value={String(householdAssessments.length)} to="/assessments" />
            <SummaryItem label="Referrals" value={String(householdReferrals.length)} to="/referrals" />
            <SummaryItem label="Follow-ups" value={String(activeFollowUps.length)} to="/followups" />
            <SummaryItem label="Household Members" value={String(members.length)} to="/people" />
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader><CardTitle className="text-base">Household Information</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label="Community" value={community?.name ?? "Not recorded"} />
            <InfoRow label="Address" value={household.address ?? "Not recorded"} />
            <InfoRow label="Phone" value={household.phone ?? "Not recorded"} />
            <InfoRow label="Status" value={household.workflowStatus ?? "Active"} />
            <InfoRow label="House number" value={household.house_no ?? "Not recorded"} />
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl">
        <CardHeader><CardTitle className="text-base">Activity</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {activeFollowUps.length === 0 && householdAssessments.length === 0 && householdReferrals.length === 0 ? (
            <p>No immediate actions required for this household.</p>
          ) : (
            <>
              {activeFollowUps.length > 0 && (
                <div>
                  <div className="mb-2 font-medium text-foreground">Follow-ups</div>
                  {activeFollowUps.map((item) => (
                    <div key={item.id} className="rounded-md border p-2">
                      {item.type} · {item.status} {item.due_date ? `· ${new Date(item.due_date).toLocaleDateString()}` : ""}
                    </div>
                  ))}
                </div>
              )}
              {householdReferrals.length > 0 && (
                <div>
                  <div className="mb-2 font-medium text-foreground">Referrals</div>
                  {householdReferrals.map((item) => (
                    <div key={item.id} className="rounded-md border p-2">
                      {item.category ?? "Referral"} · {item.status} · {item.urgency}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  );
}

function SummaryItem({ label, value, to }: { label: string; value: string; to: string }) {
  return (
    <Link to={to as never} className="flex items-center justify-between rounded-md border p-3 hover:bg-accent/30">
      <span className="text-sm text-muted-foreground">{label}</span>
      <strong>{value}</strong>
    </Link>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

function calculateAge(dateOfBirth: string): string {
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return "Age unavailable";
  const diff = new Date(Date.now() - birth.getTime());
  const years = Math.abs(diff.getUTCFullYear() - 1970);
  return `${years} years`;
}
