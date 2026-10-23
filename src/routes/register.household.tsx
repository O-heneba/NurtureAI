import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Home, Loader2, MapPin, Save, Compass } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { listCommunities } from "@/lib/registrations";
import { createWorkflowHousehold, listWorkflowHouseholds } from "@/lib/household-person.service";
import { COMMUNITY_ISSUES } from "@/lib/community-issues";

export const Route = createFileRoute("/register/household")({
  validateSearch: (s: Record<string, unknown>) => ({
    community_id: typeof s.community_id === "string" ? s.community_id : undefined,
  }),
  component: RegisterHousehold,
});

const stepTitles = [
  "Identification",
  "Location",
  "Composition",
  "Living conditions",
  "Barriers",
  "Review",
];

const schema = z.object({
  community_id: z.string().uuid("Select a community"),
  house_no: z.string().trim().max(20),
  head_name: z.string().trim().min(2, "Head of household required").max(60),
  phone: z
    .string()
    .trim()
    .regex(/^\+?\d[\d\s]{6,}$/, "Enter a valid phone"),
  address: z.string().trim().min(3).max(120),
  gps: z.string().optional(),
  address_description: z.string().optional(),
  location_notes: z.string().optional(),
  composition_breakdown: z.string().optional(),
  living_conditions: z.string().optional(),
  barriers: z.array(z.string()).max(COMMUNITY_ISSUES.length).optional(),
  notes: z.string().max(400).optional(),
  priority_status: z.string().optional(),
  draft: z.boolean().optional(),
});

type HouseholdFormState = {
  community_id: string;
  house_no: string;
  head_name: string;
  phone: string;
  address: string;
  gps: string;
  address_description: string;
  location_notes: string;
  composition_breakdown: string;
  living_conditions: string;
  barriers: string[];
  notes: string;
  priority_status: string;
  draft: boolean;
};

const initialState: HouseholdFormState = {
  community_id: "",
  house_no: "",
  head_name: "",
  phone: "",
  address: "",
  gps: "",
  address_description: "",
  location_notes: "",
  composition_breakdown: "Adults: 3; Children: 2; Pregnant women: 1",
  living_conditions: "Water: Piped water; Toilet: Private flush; Roof: Metal; Rooms: 2",
  barriers: [],
  notes: "",
  priority_status: "routine",
  draft: true,
};

function RegisterHousehold() {
  const navigate = useNavigate();
  const { community_id } = useSearch({ from: "/register/household" });
  const [values, setValues] = useState<HouseholdFormState>(() => ({
    ...initialState,
    community_id: community_id ?? "",
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [savedHouseholdId, setSavedHouseholdId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [communities, setCommunities] = useState<Array<{ id: string; name: string }>>([]);
  const [existingHouseholds, setExistingHouseholds] = useState<
    Array<{
      id: string;
      community_id: string | null;
      head_name: string;
      house_no: string;
      phone: string | null;
    }>
  >([]);

  useEffect(() => {
    Promise.all([listCommunities(), listWorkflowHouseholds()])
      .then(([communitiesData, householdsData]) => {
        setCommunities(communitiesData);
        setExistingHouseholds(householdsData);
      })
      .catch((e) => toast.error(e.message));
  }, []);

  const set = (k: keyof HouseholdFormState, v: string | string[] | boolean) =>
    setValues({ ...values, [k]: v as never });

  const duplicateWarning = useMemo(() => {
    const normalizedHead = values.head_name.trim().toLowerCase();
    const normalizedHouseNo = values.house_no.trim().toLowerCase();
    const normalizedPhone = values.phone.trim().toLowerCase();
    return existingHouseholds.find(
      (h) =>
        (normalizedHouseNo &&
          h.house_no.toLowerCase() === normalizedHouseNo &&
          h.community_id === values.community_id) ||
        (normalizedHead &&
          h.head_name.toLowerCase() === normalizedHead &&
          h.community_id === values.community_id) ||
        (normalizedPhone && h.phone?.toLowerCase() === normalizedPhone),
    );
  }, [values, existingHouseholds]);

  const completeness = useMemo(() => {
    const totalFields = 9;
    const filled = [
      values.community_id,
      values.house_no,
      values.head_name,
      values.phone,
      values.address,
      values.gps,
      values.address_description,
      values.composition_breakdown,
      values.living_conditions,
    ].filter(Boolean).length;
    return Math.round((filled / totalFields) * 100);
  }, [values]);

  async function submit() {
    const r = schema.safeParse(values);
    if (!r.success) {
      const e: Record<string, string> = {};
      r.error.issues.forEach((i) => {
        e[i.path[0] as string] = i.message;
      });
      setErrors(e);
      toast.error("Please fix the highlighted fields");
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const saved = await createWorkflowHousehold({
        community_id: r.data.community_id,
        house_no: r.data.house_no,
        head_name: r.data.head_name,
        phone: r.data.phone,
        address: r.data.address,
        gps: r.data.gps,
        notes: r.data.notes,
        address_description: r.data.address_description,
        location_notes: r.data.location_notes,
        composition_breakdown: r.data.composition_breakdown,
        living_conditions: r.data.living_conditions,
        barriers: r.data.barriers,
        priority_status: r.data.priority_status,
        draft: r.data.draft,
      });
      setDone(true);
      setSavedHouseholdId(saved.id);
      toast.success(saved.workflowStatus === "pending" ? "Household saved locally · pending sync" : "Household registered");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const communityName = communities.find((c) => c.id === values.community_id)?.name ?? "";

  if (done) {
    return (
      <AppLayout>
        <Card className="rounded-2xl max-w-lg mx-auto mt-8 card-elevated">
          <CardContent className="p-8 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-success/10 text-success mx-auto mb-4 animate-float-slow">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold">Household registered</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {values.head_name}'s household ({values.house_no}) has been added to {communityName}.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Link to="/households">
                <Button variant="outline">View households</Button>
              </Link>
              <Button onClick={() => navigate({ to: "/register/person", search: { household_id: savedHouseholdId ?? undefined } })}>
                Add person
              </Button>
              <Button
                onClick={() => {
                  setDone(false);
                  setValues(initialState);
                  setStep(0);
                }}
              >
                Register another
              </Button>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Register household"
        description="Add a new household to your CHPS register"
        icon={<Home className="h-5 w-5" />}
        breadcrumbs={[{ label: "Households", to: "/households" }, { label: "Register" }]}
      />

      <Card className="rounded-xl max-w-4xl">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2 text-sm">
            <div>
              <div className="font-semibold">Completeness</div>
              <div className="text-muted-foreground">{completeness}% complete</div>
            </div>
            <div className="text-right">
              <div className="font-semibold">
                Step {step + 1} of {stepTitles.length}
              </div>
              <div className="text-muted-foreground">{stepTitles[step]}</div>
            </div>
          </div>

          {duplicateWarning && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
              Possible duplicate detected for {duplicateWarning.head_name} in{" "}
              {communities.find((c) => c.id === duplicateWarning.community_id)?.name ||
                "this community"}
              .
            </div>
          )}

          {step === 0 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Community" required error={errors.community_id}>
                <Select value={values.community_id} onValueChange={(v) => set("community_id", v)}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={communities.length ? "Select community" : "Loading…"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {communities.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="House number" error={errors.house_no}>
                <Input
                  value={values.house_no}
                  onChange={(e) => set("house_no", e.target.value)}
                  placeholder="e.g. K-142"
                  maxLength={20}
                />
              </Field>
              <Field label="Head of household" required error={errors.head_name}>
                <Input
                  value={values.head_name}
                  onChange={(e) => set("head_name", e.target.value)}
                  placeholder="e.g. Kofi Owusu Ansah"
                  maxLength={60}
                />
              </Field>
              <Field label="Phone" required error={errors.phone}>
                <Input
                  value={values.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+233 24 000 0000"
                />
              </Field>
              <Field label="Priority status" className="sm:col-span-2">
                <Select
                  value={values.priority_status}
                  onValueChange={(v) => set("priority_status", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Address" required error={errors.address} className="sm:col-span-2">
                <Input
                  value={values.address}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="Street / landmark"
                  maxLength={120}
                />
              </Field>
              <Field label="Additional address description">
                <Input
                  value={values.address_description}
                  onChange={(e) => set("address_description", e.target.value)}
                  placeholder="Near school, behind gate, etc."
                />
              </Field>
              <Field label="Capture current location">
                <div className="relative">
                  <Compass className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={values.gps}
                    onChange={(e) => set("gps", e.target.value)}
                    placeholder="Auto-detect on device"
                  />
                </div>
              </Field>
              <Field label="Location notes" className="sm:col-span-2">
                <Textarea
                  rows={2}
                  value={values.location_notes}
                  onChange={(e) => set("location_notes", e.target.value)}
                  placeholder="How to reach the house, road conditions, barriers"
                />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Composition breakdown">
                <Textarea
                  rows={3}
                  value={values.composition_breakdown}
                  onChange={(e) => set("composition_breakdown", e.target.value)}
                  placeholder="Adults: 3; Children: 2; Pregnant women: 1"
                />
              </Field>
              <Field label="Household members summary">
                <Input
                  value={values.composition_breakdown}
                  onChange={(e) => set("composition_breakdown", e.target.value)}
                  placeholder="Brief summary for quick reference"
                />
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Living conditions">
                <Textarea
                  rows={3}
                  value={values.living_conditions}
                  onChange={(e) => set("living_conditions", e.target.value)}
                  placeholder="Water, toilet, roofing, room count"
                />
              </Field>
              <Field label="Notes for follow-up">
                <Textarea
                  rows={3}
                  value={values.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  maxLength={400}
                  placeholder="Optional notes about the household"
                />
              </Field>
            </div>
          )}

          {step === 4 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Household concerns" className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">
                  Select concerns reported or identified for this household. These are not clinical
                  diagnoses.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {COMMUNITY_ISSUES.map((issue) => (
                    <label
                      key={issue.id}
                      className="flex items-start gap-2 rounded-md border p-3 text-sm"
                    >
                      <Checkbox
                        checked={values.barriers.includes(issue.id)}
                        onCheckedChange={(checked) =>
                          set(
                            "barriers",
                            checked
                              ? [...values.barriers, issue.id]
                              : values.barriers.filter((barrier) => barrier !== issue.id),
                          )
                        }
                      />
                      <span>{issue.label}</span>
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Draft">
                <div className="flex items-center gap-2 rounded-md border p-2">
                  <Checkbox
                    checked={values.draft}
                    onCheckedChange={(checked) => set("draft", Boolean(checked))}
                  />
                  <span className="text-sm">Save as draft for later completion</span>
                </div>
              </Field>
            </div>
          )}

          {step === 5 && (
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Head</div>
                <div className="font-medium">{values.head_name || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">House number</div>
                <div className="font-medium">{values.house_no || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Community</div>
                <div className="font-medium">{communityName || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Priority</div>
                <div className="font-medium capitalize">{values.priority_status || "routine"}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs text-muted-foreground">Household concerns</div>
                <div className="mt-1 font-medium">
                  {values.barriers.length
                    ? values.barriers
                        .map(
                          (barrier) =>
                            COMMUNITY_ISSUES.find((issue) => issue.id === barrier)?.label ??
                            barrier,
                        )
                        .join(", ")
                    : "None recorded"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Location</div>
                <div className="font-medium">{values.address || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">GPS</div>
                <div className="font-medium">{values.gps || "—"}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs text-muted-foreground">Notes</div>
                <div className="font-medium">{values.notes || "No notes yet"}</div>
              </div>
            </div>
          )}

          <div className="flex justify-between gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setStep((prev) => Math.max(0, prev - 1))}
              disabled={step === 0}
            >
              Previous
            </Button>
            {step < stepTitles.length - 1 ? (
              <Button onClick={() => setStep((prev) => prev + 1)}>Next</Button>
            ) : (
              <Button onClick={submit} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1 h-4 w-4" />
                )}
                Save household
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}

function Field({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={"grid gap-1.5 " + (className ?? "")}>
      <Label required={required}>{label}</Label>
      {children}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
