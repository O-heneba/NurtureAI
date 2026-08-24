import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, RiskBadge, EmptyState, StatCard, AIRecommendationCard } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { HeartPulse, Calendar, Send, Activity, Scale } from "lucide-react";
import { getCommunity, getPerson, getPregnancy } from "@/lib/registrations";
import { listAssessmentsForPerson } from "@/lib/assessments";
import { getWorkflowHousehold } from "@/lib/household-person.service";
import { useEffect } from "react";

type AncVisit = { id: string; date: string; gestation: string; bp: string; weight: string; risk: string; notes: string };

function noteValue(notes: string | null, label: string): string | null {
  return notes?.match(new RegExp(`${label}:\\s*([^|]+)`, "i"))?.[1]?.trim() ?? null;
}

export const Route = createFileRoute("/pregnancy/$id")({
  loader: async ({ params }) => {
    const pr = await getPregnancy(params.id);
    if (!pr) throw notFound();
    const person = await getPerson(pr.person_id);
    const household = person?.household_id ? await getWorkflowHousehold(person.household_id) : null;
    const community = household?.community_id ? await getCommunity(household.community_id) : null;
    const assessments = await listAssessmentsForPerson(pr.person_id);
    const maternalAssessments = assessments.filter((assessment) => assessment.assessment_type === "maternal");
    const latestAssessment = maternalAssessments[0];
    const latestData = latestAssessment?.inputs?.sections ?? {};
    const previousPregnancies = pr.notes?.match(/(?:^|\| )Prev: ([^|]+)/)?.[1]?.trim() ?? "Not recorded";
    const historyGravidaPara = previousPregnancies.match(/^G\s*(\d+)\s*P\s*(\d+)$/i);
    const registeredGestation = pr.gestation_weeks ?? Number(noteValue(pr.notes, "GA")?.replace(/\s*w(?:eeks?)?$/i, ""));
    const registeredBloodPressure = pr.blood_pressure ?? noteValue(pr.notes, "BP");
    const registeredWeight = pr.weight_kg ?? Number(noteValue(pr.notes, "Weight")?.replace(/\s*kg$/i, ""));
    const gestation = Number(latestData.gestation_weeks ?? pr.gestation_weeks) || (pr.lmp_date
      ? Math.max(0, Math.floor((Date.now() - new Date(pr.lmp_date).getTime()) / 604800000))
      : 0);
    const age = person?.date_of_birth
      ? Math.max(0, new Date().getFullYear() - new Date(person.date_of_birth).getFullYear())
      : 0;
    const risk = latestAssessment?.risk_level ?? (pr.status === "urgent" || pr.status === "high" ? "high" : "routine");
    const anc: AncVisit[] = [
      {
        id: pr.id,
        date: pr.created_at,
        gestation: registeredGestation != null && Number.isFinite(registeredGestation) ? String(registeredGestation) : "Not recorded",
        bp: registeredBloodPressure ?? "Not recorded",
        weight: Number.isFinite(registeredWeight) ? String(registeredWeight) : "Not recorded",
        risk: pr.status ?? "routine",
        notes: pr.notes ?? "Pregnancy registration",
      },
      ...maternalAssessments.map((assessment) => {
      const data = assessment.inputs?.sections ?? {};
      return { id: assessment.id, date: assessment.created_at, gestation: String(data.gestation_weeks ?? "Not recorded"), bp: String(data.blood_pressure ?? "Not recorded"), weight: String(data.weight_kg ?? "Not recorded"), risk: assessment.risk_level ?? "routine", notes: assessment.summary ?? "Maternal assessment recorded" };
      }),
    ];
    return {
      person,
      pr: {
        ...pr,
        mother: person?.full_name ?? "Pregnant person",
        age,
        community: community?.name ?? "Community not recorded",
        gravida:
          latestData.gravida !== undefined || latestData.parity !== undefined
            ? `G${latestData.gravida ?? pr.gravida ?? "-"} P${latestData.parity ?? pr.parity ?? "-"}`
            : pr.gravida !== null || pr.parity !== null
              ? `G${pr.gravida ?? "-"} P${pr.parity ?? "-"}`
              : historyGravidaPara
                ? `G${historyGravidaPara[1]} P${historyGravidaPara[2]}`
                : "G- P-",
        gestation: `${latestData.gestation_weeks ?? registeredGestation ?? gestation} weeks`,
        edd: pr.edd_date ?? "Not recorded",
        anc: Math.max(pr.anc_visits ?? 0, maternalAssessments.length),
        bp: latestData.blood_pressure ?? registeredBloodPressure ?? "Not recorded",
        weight: latestData.weight_kg ?? (Number.isFinite(registeredWeight) ? registeredWeight : "Not recorded"),
        risk,
        ancHistory: anc,
        previousPregnancies,
      },
    };
  },
  component: PregnancyProfile,
  notFoundComponent: () => (
    <AppLayout>
      <EmptyState
        title="Pregnancy record not found"
        action={
          <Link to="/maternal">
            <Button>Back to maternal care</Button>
          </Link>
        }
      />
    </AppLayout>
  ),
});

function PregnancyProfile() {
  const { pr } = Route.useLoaderData();
  const router = useRouter();
  const gwk = parseInt(pr.gestation);
  const pct = Math.min(100, Math.max(0, Math.round((gwk / 40) * 100)));
  const anc = pr.ancHistory;

  useEffect(() => {
    const refreshAfterSync = () => {
      void router.invalidate();
    };
    window.addEventListener("nurture-sync-status", refreshAfterSync);
    window.addEventListener("focus", refreshAfterSync);
    return () => {
      window.removeEventListener("nurture-sync-status", refreshAfterSync);
      window.removeEventListener("focus", refreshAfterSync);
    };
  }, [router]);

  return (
    <AppLayout>
      <PageHeader
        title={pr.mother}
        description={`${pr.age}y · ${pr.community} · ${pr.gravida}`}
        icon={<HeartPulse className="h-5 w-5" />}
        breadcrumbs={[{ label: "Maternal Care", to: "/maternal" }, { label: pr.mother }]}
        actions={<RiskBadge level={pr.risk} />}
      />

      <Card className="rounded-xl mb-4">
        <CardContent className="p-5">
          <div className="flex justify-between mb-2 text-sm">
            <span className="font-semibold">Gestation · {pr.gestation}</span>
            <span className="text-muted-foreground">EDD {pr.edd}</span>
          </div>
          <Progress value={pct} className="h-3" />
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            <span>Trimester 1</span>
            <span>Trimester 2</span>
            <span>Trimester 3</span>
            <span>Term</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard
          label="ANC visits"
          value={`${pr.anc}/8`}
          icon={<Calendar className="h-4 w-4" />}
          tone="primary"
        />
        <StatCard
          label="BP"
          value={pr.bp}
          icon={<Activity className="h-4 w-4" />}
          tone={pr.risk === "high" ? "destructive" : "info"}
        />
        <StatCard
          label="Weight"
          value={`${pr.weight} kg`}
          icon={<Scale className="h-4 w-4" />}
          tone="success"
        />
        <StatCard
          label="Risk"
          value={pr.risk}
          icon={<HeartPulse className="h-4 w-4" />}
          tone={pr.risk === "high" ? "destructive" : pr.risk === "medium" ? "warning" : "success"}
        />
      </div>

      <Card className="mb-4 rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pregnancy history</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <div className="text-xs text-muted-foreground">Previous pregnancies</div>
            <div className="mt-1 font-medium">{pr.previousPregnancies}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Gravida / Para</div>
            <div className="mt-1 font-medium">{pr.gravida}</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">ANC history</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {anc.length === 0 && (
                <div className="p-6">
                  <EmptyState title="No ANC visits yet" />
                </div>
              )}
              {anc.map((a: AncVisit) => (
                <div key={a.id} className="p-4">
                  <div className="flex justify-between text-sm font-medium">
                    <span>ANC visit · {a.gestation} weeks</span>
                    <span className="text-muted-foreground text-xs">{new Date(a.date).toLocaleDateString()}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    BP {a.bp} · {a.weight} kg · Risk {a.risk}
                  </div>
                  <div className="text-sm mt-1">{a.notes}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <AIRecommendationCard
            title="AI recommendation"
            tone={pr.risk === "high" ? "destructive" : "primary"}
          >
            <p>
              {pr.risk === "high"
                ? "Elevated BP with symptomatic complaints — refer to a higher-level facility for confirmatory workup. Recheck vitals within 4 hours."
                : "Continue routine ANC schedule. Reinforce iron/folate compliance and danger-sign education."}
            </p>
          </AIRecommendationCard>
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Clinical notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{pr.notes}</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Referral status</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {pr.risk === "high" ? "Urgent referral in transit to KATH" : "No active referral"}
              </span>
              <Link to="/referrals">
                <Button size="sm" variant="outline" className="rounded-lg">
                  <Send className="mr-1 h-3.5 w-3.5" /> View
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
