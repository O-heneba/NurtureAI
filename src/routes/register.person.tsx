import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { CheckCircle2, Loader2, Save, Users, AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { insertPerson, listHouseholds, listPersons } from "@/lib/registrations";

export const Route = createFileRoute("/register/person")({
  component: RegisterPerson,
});

const stepTitles = [
  "Household",
  "Basic",
  "Identification",
  "Social",
  "Profile types",
  "Initial health",
];

const profileTypeOptions = ["Maternal", "Newborn", "Child Health", "Adult", "Elderly"];

const schema = z.object({
  household_id: z.string().uuid("Select a household"),
  full_name: z.string().trim().min(2, "Full name required").max(60),
  sex: z.enum(["F", "M"], { message: "Select gender" }),
  date_of_birth: z.string().min(1, "Date of birth required"),
  phone: z
    .string()
    .trim()
    .regex(/^[\d\s+-]*$/, "Invalid phone format")
    .max(20)
    .optional()
    .or(z.literal("")),
  national_id: z.string().trim().max(30).optional(),
  preferred_name: z.string().trim().max(40).optional(),
  disability_status: z.string().optional(),
  marital_status: z.string().optional(),
  occupation: z.string().trim().max(60).optional(),
  education: z.string().optional(),
  profile_types: z.array(z.string()).default([]),
  emergency_contact: z.string().trim().max(120).optional(),
  priority_status: z.string().optional(),
  notes: z.string().max(400).optional(),
  draft: z.boolean().optional(),
});

type PersonFormState = z.infer<typeof schema>;

const initialState: PersonFormState = {
  household_id: "",
  full_name: "",
  sex: "",
  date_of_birth: "",
  phone: "",
  national_id: "",
  preferred_name: "",
  disability_status: "None",
  marital_status: "",
  occupation: "",
  education: "",
  profile_types: [],
  emergency_contact: "",
  priority_status: "routine",
  notes: "",
  draft: false,
};

function RegisterPerson() {
  const navigate = useNavigate();
  const [values, setValues] = useState<PersonFormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [households, setHouseholds] = useState<
    Array<{ id: string; head_name: string; house_no: string }>
  >([]);
  const [persons, setPersons] = useState<
    Array<{ id: string; full_name: string; phone: string | null }>
  >([]);

  useEffect(() => {
    Promise.all([listHouseholds(), listPersons()])
      .then(([householdsData, personsData]) => {
        setHouseholds(householdsData);
        setPersons(personsData);
      })
      .catch((e) => toast.error(e.message));
  }, []);

  const set = (k: keyof PersonFormState, v: any) => setValues({ ...values, [k]: v });

  const calculateAge = (dob: string): number | null => {
    if (!dob) return null;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age >= 0 ? age : null;
  };

  const age = useMemo(() => calculateAge(values.date_of_birth), [values.date_of_birth]);

  const duplicateWarning = useMemo(() => {
    const normalizedName = values.full_name.trim().toLowerCase();
    const normalizedPhone = values.phone?.trim().toLowerCase();
    return persons.find(
      (p) =>
        (normalizedName && p.full_name.toLowerCase() === normalizedName) ||
        (normalizedPhone && p.phone?.toLowerCase() === normalizedPhone),
    );
  }, [values.full_name, values.phone, persons]);

  const completeness = useMemo(() => {
    const fields = [
      values.household_id,
      values.full_name,
      values.sex,
      values.date_of_birth,
      values.phone,
      values.preferred_name,
      values.disability_status,
      values.marital_status,
      values.occupation,
      values.education,
      values.profile_types.length > 0 ? "selected" : "",
      values.emergency_contact,
    ].filter(Boolean).length;
    return Math.round((fields / 12) * 100);
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
      await insertPerson({
        household_id: r.data.household_id,
        full_name: r.data.full_name,
        sex: r.data.sex,
        date_of_birth: r.data.date_of_birth,
        phone: r.data.phone,
        national_id: r.data.national_id,
        preferred_name: r.data.preferred_name,
        disability_status: r.data.disability_status,
        marital_status: r.data.marital_status,
        occupation: r.data.occupation,
        education: r.data.education,
        profile_types: r.data.profile_types,
        emergency_contact: r.data.emergency_contact,
        priority_status: r.data.priority_status,
        notes: r.data.notes,
      });
      setDone(true);
      toast.success("Person registered");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const household = households.find((h) => h.id === values.household_id);

  if (done) {
    return (
      <AppLayout>
        <Card className="rounded-2xl max-w-lg mx-auto mt-8 card-elevated">
          <CardContent className="p-8 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-success/10 text-success mx-auto mb-4 animate-float-slow">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold">Person registered</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {values.full_name} has been added to the {household?.head_name ?? ""} household.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Link to="/people">
                <Button variant="outline">View people</Button>
              </Link>
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
        title="Register person"
        description="Add a new individual to a household"
        icon={<Users className="h-5 w-5" />}
        breadcrumbs={[{ label: "People", to: "/people" }, { label: "Register" }]}
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
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Possible duplicate detected for {duplicateWarning.full_name}.</span>
            </div>
          )}

          {step === 0 && (
            <div className="grid gap-4">
              <Field label="Select household" error={errors.household_id}>
                <Select value={values.household_id} onValueChange={(v) => set("household_id", v)}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={households.length ? "Select household" : "Loading…"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {households.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.head_name} ({h.house_no})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full name" error={errors.full_name}>
                <Input
                  value={values.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
                  placeholder="First and last name"
                  maxLength={60}
                />
              </Field>
              <Field label="Gender" error={errors.sex}>
                <Select value={values.sex} onValueChange={(v) => set("sex", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="F">Female</SelectItem>
                    <SelectItem value="M">Male</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Date of birth" error={errors.date_of_birth}>
                <Input
                  type="date"
                  value={values.date_of_birth}
                  onChange={(e) => set("date_of_birth", e.target.value)}
                />
              </Field>
              {age !== null && (
                <div className="text-sm text-muted-foreground pt-7">Age: {age} years</div>
              )}
              <Field label="Phone number">
                <Input
                  value={values.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+233 24 …"
                  maxLength={20}
                />
              </Field>
              <Field label="National ID">
                <Input
                  value={values.national_id}
                  onChange={(e) => set("national_id", e.target.value)}
                  placeholder="GHA-XXXXXXXXX-X"
                  maxLength={30}
                />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Preferred name">
                <Input
                  value={values.preferred_name}
                  onChange={(e) => set("preferred_name", e.target.value)}
                  placeholder="Name to use in daily conversation"
                  maxLength={40}
                />
              </Field>
              <Field label="Disability status">
                <Select
                  value={values.disability_status}
                  onValueChange={(v) => set("disability_status", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="Hearing">Hearing impairment</SelectItem>
                    <SelectItem value="Vision">Vision impairment</SelectItem>
                    <SelectItem value="Mobility">Mobility impairment</SelectItem>
                    <SelectItem value="Cognitive">Cognitive impairment</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Marital status">
                <Select
                  value={values.marital_status}
                  onValueChange={(v) => set("marital_status", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                    <SelectItem value="Widowed">Widowed</SelectItem>
                    <SelectItem value="Divorced">Divorced</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Occupation">
                <Input
                  value={values.occupation}
                  onChange={(e) => set("occupation", e.target.value)}
                  placeholder="e.g., Farmer, Trader, Student"
                  maxLength={60}
                />
              </Field>
              <Field label="Education level" className="sm:col-span-2">
                <Select value={values.education} onValueChange={(v) => set("education", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None/Informal</SelectItem>
                    <SelectItem value="Primary">Primary</SelectItem>
                    <SelectItem value="JHS">JHS</SelectItem>
                    <SelectItem value="SHS">SHS</SelectItem>
                    <SelectItem value="Tertiary">Tertiary</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-4">
              <div>
                <Label className="text-sm font-medium">Select profile types</Label>
                <div className="mt-3 grid sm:grid-cols-2 gap-3">
                  {profileTypeOptions.map((option) => (
                    <div
                      key={option}
                      className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer"
                    >
                      <Checkbox
                        checked={values.profile_types.includes(option)}
                        onCheckedChange={(checked) => {
                          const newTypes = checked
                            ? [...values.profile_types, option]
                            : values.profile_types.filter((t) => t !== option);
                          set("profile_types", newTypes);
                        }}
                      />
                      <span className="text-sm font-medium">{option}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Emergency contact" className="sm:col-span-2">
                <Input
                  value={values.emergency_contact}
                  onChange={(e) => set("emergency_contact", e.target.value)}
                  placeholder="Name + phone number"
                  maxLength={120}
                />
              </Field>
              <Field label="Priority status">
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
              <Field label="Initial notes" className="sm:col-span-2">
                <Textarea
                  rows={3}
                  value={values.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Any initial health observations or concerns"
                  maxLength={400}
                />
              </Field>
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
                Save person
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
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={"grid gap-1.5 " + (className ?? "")}>
      <Label>{label}</Label>
      {children}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
