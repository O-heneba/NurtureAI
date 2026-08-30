import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { EmptyState, PageHeader } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Baby, Calendar, ClipboardCheck, FileText, HeartPulse, Save, Send, User } from "lucide-react";
import { getWorkflowHousehold, getWorkflowPerson, listWorkflowHouseholds, updateWorkflowPerson } from "@/lib/household-person.service";
import { listChildProfiles, listPregnanciesForPerson } from "@/lib/registrations";
import { listAssessmentsForPerson } from "@/lib/assessments";
import { listReferrals } from "@/lib/referrals";
import { listFollowUps } from "@/lib/followups";
import { listPersonNotes } from "@/lib/person-notes.service";

export const Route = createFileRoute("/person/$id")({
  loader: async ({ params }) => {
    const person = await getWorkflowPerson(params.id);
    if (!person) throw notFound();
    const household = person.household_id ? await getWorkflowHousehold(person.household_id) : null;
    const personIds = Array.from(new Set([params.id, person.localId, person.remoteId].filter(Boolean))) as string[];
    const [pregnancyResults, childProfiles, assessments, referrals, followUps, notes] = await Promise.all([
      Promise.all(personIds.map((personId) => listPregnanciesForPerson(personId))).then((results) =>
        Array.from(new Map(results.flat().map((row) => [row.id, row])).values()),
      ),
      listChildProfiles().then((rows) => rows.filter((row) => row.person_id === params.id)),
      listAssessmentsForPerson(params.id),
      listReferrals({ person_id: params.id }),
      listFollowUps({ person_id: params.id }),
      listPersonNotes(params.id),
    ]);
    return {
      person,
      household,
      pregnancies: pregnancyResults,
      childProfiles,
      assessments,
      referrals,
      followUps,
      notes,
    };
  },
  component: PersonDetail,
  notFoundComponent: () => (
    <AppLayout>
      <EmptyState title="Person not found" action={<Link to="/people" search={{ q: "" }}>Back to people</Link>} />
    </AppLayout>
  ),
});

function PersonDetail() {
  const { person: initial, household, pregnancies, childProfiles, assessments, referrals, followUps, notes } = Route.useLoaderData();
  const [person, setPerson] = useState(initial);
  const [households, setHouseholds] = useState<Array<{ id: string; head_name: string; house_no: string }>>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    listWorkflowHouseholds()
      .then(setHouseholds)
      .catch(() => setHouseholds([]));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const saved = await updateWorkflowPerson(person.localId, {
        full_name: person.full_name,
        phone: person.phone,
        national_id: person.national_id,
        notes: person.notes,
        household_id: person.household_id ?? null,
      });
      setPerson(saved);
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
        title={person.full_name}
        description={`${person.sex === "F" ? "Female" : person.sex === "M" ? "Male" : "Person"} · ${household?.head_name ?? "Household not recorded"}`}
        icon={<User className="h-5 w-5" />}
        breadcrumbs={[{ label: "People", to: "/people" }, { label: person.full_name }]}
        actions={<Badge variant="outline">{person.workflowStatus}</Badge>}
      />
      <Card className="max-w-3xl rounded-xl">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Person details</CardTitle>
          {editing ? (
            <Button size="sm" onClick={save} disabled={saving}><Save className="mr-1 h-4 w-4" /> {saving ? "Saving" : "Save"}</Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">Full name<Input disabled={!editing} value={person.full_name} onChange={(event) => setPerson({ ...person, full_name: event.target.value })} /></label>
          <label className="text-sm">Phone<Input disabled={!editing} value={person.phone ?? ""} onChange={(event) => setPerson({ ...person, phone: event.target.value })} /></label>
          <label className="text-sm">National ID<Input disabled={!editing} value={person.national_id ?? ""} onChange={(event) => setPerson({ ...person, national_id: event.target.value })} /></label>
          <div className="text-sm">
            Household
            {editing ? (
              <Select value={person.household_id ?? "unassigned"} onValueChange={(value) => setPerson({ ...person, household_id: value === "unassigned" ? null : value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select household" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Not assigned</SelectItem>
                  {households.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.head_name} ({item.house_no})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : household ? (
              <Link className="block text-primary hover:underline" to="/household/$id" params={{ id: household.id }}>{household.head_name}</Link>
            ) : (
              <span className="block text-muted-foreground">Not recorded</span>
            )}
          </div>
          <div className="text-sm"><span className="text-muted-foreground">Sex</span><div className="font-medium">{person.sex === "F" ? "Female" : person.sex === "M" ? "Male" : "Not recorded"}</div></div>
          <div className="text-sm"><span className="text-muted-foreground">Date of birth</span><div className="font-medium">{person.date_of_birth ?? "Not recorded"}</div></div>
          <div className="text-sm"><span className="text-muted-foreground">Profile type</span><div className="font-medium">{person.profile_types?.[0] ?? "Not recorded"}</div></div>
          <div className="text-sm"><span className="text-muted-foreground">Preferred name</span><div className="font-medium">{person.preferred_name ?? "Not recorded"}</div></div>
          <div className="text-sm"><span className="text-muted-foreground">Marital status</span><div className="font-medium">{person.marital_status ?? "Not recorded"}</div></div>
          <div className="text-sm"><span className="text-muted-foreground">Occupation</span><div className="font-medium">{person.occupation ?? "Not recorded"}</div></div>
          <div className="text-sm"><span className="text-muted-foreground">Education</span><div className="font-medium">{person.education ?? "Not recorded"}</div></div>
          <div className="text-sm"><span className="text-muted-foreground">Disability status</span><div className="font-medium">{person.disability_status ?? "Not recorded"}</div></div>
          <div className="text-sm"><span className="text-muted-foreground">Emergency contact</span><div className="font-medium">{person.emergency_contact ?? "Not recorded"}</div></div>
          <div className="text-sm"><span className="text-muted-foreground">Priority</span><div className="font-medium">{person.priority_status ?? "Not recorded"}</div></div>
          {person.notes && <div className="text-sm sm:col-span-2"><span className="text-muted-foreground">Notes</span><div className="font-medium">{person.notes}</div></div>}
          <div className="text-sm text-muted-foreground" role="status">{message}</div>
        </CardContent>
      </Card>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="rounded-xl">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4" /> Person overview</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div><span className="text-muted-foreground">Date of birth</span><div className="font-medium">{person.date_of_birth ?? "Not recorded"}</div></div>
            <div><span className="text-muted-foreground">Profile type</span><div className="font-medium">{person.profile_types?.[0] ?? "Not recorded"}</div></div>
            <div><span className="text-muted-foreground">Pregnancy records</span><div className="font-medium">{pregnancies.length}</div></div>
            <div><span className="text-muted-foreground">Child records</span><div className="font-medium">{childProfiles.length}</div></div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardHeader><CardTitle className="text-base">Related records</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <RecordCount anchor="pregnancy-records" to="/maternal" detailHref={pregnancies.length === 1 ? `/pregnancy/${pregnancies[0].id}` : undefined} icon={<HeartPulse className="h-4 w-4" />} label="Pregnancies" value={pregnancies.length} />
            <RecordCount to="/child-health" detailHref={childProfiles.length === 1 ? `/child/${childProfiles[0].id}` : undefined} icon={<Baby className="h-4 w-4" />} label="Child profiles" value={childProfiles.length} />
            <RecordCount to="/assessments" detailHref={assessments.length === 1 ? `/assessment/${assessments[0].id}` : undefined} icon={<ClipboardCheck className="h-4 w-4" />} label="Assessments" value={assessments.length} />
            <RecordCount to="/referrals" detailHref={referrals.length === 1 ? `/referral/${referrals[0].id}` : undefined} icon={<Send className="h-4 w-4" />} label="Referrals" value={referrals.length} />
            <RecordCount to="/followups" detailHref={followUps.length === 1 ? `/followup/${followUps[0].id}` : undefined} icon={<Calendar className="h-4 w-4" />} label="Follow-ups" value={followUps.length} />
            <RecordCount icon={<FileText className="h-4 w-4" />} label="Notes" value={notes.length} />
          </CardContent>
        </Card>
      </div>
      <Card id="pregnancy-records" className="mt-4 scroll-mt-20 rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartPulse className="h-4 w-4" /> Pregnancy records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pregnancies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pregnancies recorded for this person.</p>
          ) : (
            <div className="divide-y rounded-lg border">
              {pregnancies.map((pregnancy: {
                id: string;
                status?: string | null;
                gestation_weeks?: number | null;
                edd_date?: string | null;
                gravida?: number | null;
                parity?: number | null;
                blood_pressure?: string | null;
                weight_kg?: number | null;
              }) => (
                <div key={pregnancy.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="grid gap-2 text-sm sm:grid-cols-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Status</div>
                      <div className="font-medium capitalize">{pregnancy.status ?? "Not recorded"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Gestation / EDD</div>
                      <div className="font-medium">
                        {pregnancy.gestation_weeks != null ? `${pregnancy.gestation_weeks} weeks` : "Not recorded"} · {pregnancy.edd_date ?? "No EDD"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Clinical values</div>
                      <div className="font-medium">
                        G{pregnancy.gravida ?? "-"} P{pregnancy.parity ?? "-"} · {pregnancy.blood_pressure ?? "No BP"} · {pregnancy.weight_kg != null ? `${pregnancy.weight_kg} kg` : "No weight"}
                      </div>
                    </div>
                  </div>
                  <Link to="/pregnancy/$id" params={{ id: pregnancy.id }}>
                    <Button size="sm" variant="outline">View details</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="mt-4 rounded-xl">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4" /> Activity history</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              ...pregnancies.map((row: { id: string; created_at: string; status?: string | null; edd_date?: string | null }) => ({ id: row.id, route: "pregnancy" as const, date: row.created_at, title: "Pregnancy record", detail: `${row.status ?? "Status not recorded"}${row.edd_date ? ` · EDD ${row.edd_date}` : ""}` })),
              ...assessments.map((row) => ({ id: row.id, route: "assessment" as const, date: row.created_at, title: "Assessment", detail: `${row.assessment_type} · ${row.summary ?? "No summary"}` })),
              ...referrals.map((row) => ({ id: row.id, route: "referral" as const, date: row.created_at, title: "Referral", detail: `${row.category ?? "Referral"} · ${row.status}` })),
              ...followUps.map((row) => ({ id: row.id, route: "followup" as const, date: row.created_at, title: "Follow-up", detail: `${row.type} · ${row.status}` })),
              ...childProfiles.map((row: { id: string; created_at: string; birth_weight_kg?: number | null; growth_notes?: string | null }) => ({ id: row.id, route: "child" as const, date: row.created_at, title: "Child health profile", detail: `${row.birth_weight_kg ? `${row.birth_weight_kg} kg birth weight` : "Birth weight not recorded"}${row.growth_notes ? ` · ${row.growth_notes}` : ""}` })),
              ...notes.map((row) => ({ date: row.created_at, title: `Note · ${row.type}`, detail: row.text })),
            ].sort((a, b) => b.date.localeCompare(a.date)).map((item, index) => (
              <ActivityEntry key={`${item.title}-${item.date}-${index}`} item={item} />
            ))}
            {pregnancies.length + childProfiles.length + assessments.length + referrals.length + followUps.length + notes.length === 0 && <p className="text-sm text-muted-foreground">No activity recorded yet.</p>}
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}

type ActivityItem = { date: string; title: string; detail: string; id?: string; route?: "pregnancy" | "child" | "assessment" | "referral" | "followup" };

function ActivityEntry({ item }: { item: ActivityItem }) {
  const content = (
    <div className="flex gap-3 border-b pb-3 last:border-0 last:pb-0">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0"><div className="font-medium">{item.title}</div><div className="text-sm text-muted-foreground">{item.detail}</div><div className="mt-1 text-xs text-muted-foreground">{new Date(item.date).toLocaleString()}</div></div>
    </div>
  );
  if (!item.id || !item.route) return content;
  if (item.route === "pregnancy") return <Link to="/pregnancy/$id" params={{ id: item.id }} className="block hover:bg-accent/30">{content}</Link>;
  if (item.route === "child") return <Link to="/child/$id" params={{ id: item.id }} className="block hover:bg-accent/30">{content}</Link>;
  if (item.route === "assessment") return <Link to="/assessment/$id" params={{ id: item.id }} className="block hover:bg-accent/30">{content}</Link>;
  if (item.route === "referral") return <Link to="/referral/$id" params={{ id: item.id }} className="block hover:bg-accent/30">{content}</Link>;
  return <Link to="/followup/$id" params={{ id: item.id }} className="block hover:bg-accent/30">{content}</Link>;
}

function RecordCount({ anchor, to, detailHref, icon, label, value }: { anchor?: string; to?: "/maternal" | "/child-health" | "/assessments" | "/referrals" | "/followups"; detailHref?: string; icon: React.ReactNode; label: string; value: number }) {
  const content = <><span className="text-primary">{icon}</span><span className="text-muted-foreground">{label}</span><strong className="ml-auto">{value}</strong></>;
  if (anchor) return <a href={`#${anchor}`} className="flex items-center gap-2 rounded-md border p-3 hover:bg-accent/30">{content}</a>;
  if (detailHref) {
    return <Link to={detailHref as never} className="flex items-center gap-2 rounded-md border p-3 hover:bg-accent/30">{content}</Link>;
  }
  return to ? <Link to={to} className="flex items-center gap-2 rounded-md border p-3 hover:bg-accent/30">{content}</Link> : <div className="flex items-center gap-2 rounded-md border p-3">{content}</div>;
}
