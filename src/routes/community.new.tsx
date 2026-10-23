import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { insertCommunity } from "@/lib/registrations";
import { COMMUNITY_ISSUES } from "@/lib/community-issues";
import geoCommunities from "../../data/northern-ghana-communities.json";

export const Route = createFileRoute("/community/new")({
  component: NewCommunity,
});

const stepTitles = ["Basic details", "Location & services", "Community profile", "Review"];

type CommunityFormState = {
  name: string;
  communityCode: string;
  region: string;
  district: string;
  subDistrict: string;
  chpsZone: string;
  chpsFacility: string;
  worker: string;
  supervisor: string;
  nearestFacility: string;
  primaryLanguages: string[];
  commonHealthChallenges: string[];
  accessibility: string;
  locationDesc: string;
  gpsLat: string;
  gpsLng: string;
  status: string;
  households: string;
  population: string;
  pregnant: string;
  under5: string;
  highRisk: string;
  notes: string;
  draft: boolean;
};

type GeoCommunity = {
  Region: string;
  District: string;
  "Capital Town": string;
  "GPS Latitude": string;
  "GPS Longitude": string;
  "Sub-districts / Councils": string;
};

function parseGpsCoordinate(value: string) {
  if (!value) return "";
  const cleaned = value.replace(/°/g, "").trim();
  const match = cleaned.match(/^([+-]?\d+(?:\.\d+)?)(?:\s*([NSEW]))?$/i);
  if (!match) return value;
  let num = Number(match[1]);
  const direction = match[2]?.toUpperCase();
  if (direction === "S" || direction === "W") num = -Math.abs(num);
  return Number.isNaN(num) ? value : String(num);
}

const initialState: CommunityFormState = {
  name: "",
  communityCode: "",
  region: "",
  district: "",
  subDistrict: "",
  chpsZone: "",
  chpsFacility: "",
  worker: "",
  supervisor: "",
  nearestFacility: "",
  primaryLanguages: ["Twi"],
  commonHealthChallenges: [],
  accessibility: "",
  locationDesc: "",
  gpsLat: "",
  gpsLng: "",
  status: "active",
  households: "120",
  population: "600",
  pregnant: "10",
  under5: "70",
  highRisk: "3",
  notes: "",
  draft: true,
};

const languageOptions = ["Twi", "English", "Ga", "Dagbani", "Hausa", "Nzema"];
function NewCommunity() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const regions = useMemo(
    () => Array.from(new Set((geoCommunities as GeoCommunity[]).map((c) => c.Region))).sort(),
    [],
  );
  const [form, setForm] = useState<CommunityFormState>(() => ({
    ...initialState,
    region: regions[0] ?? "",
  }));
  const [saving, setSaving] = useState(false);
  const [savedCommunityId, setSavedCommunityId] = useState<string | null>(null);

  const districtOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (geoCommunities as GeoCommunity[])
            .filter((c) => c.Region === form.region)
            .map((c) => c.District),
        ),
      ).sort(),
    [form.region],
  );

  const selectedRegionDistrict = useMemo(
    () =>
      (geoCommunities as GeoCommunity[]).find(
        (c) => c.Region === form.region && c.District === form.district,
      ),
    [form.region, form.district],
  );

  const subDistrictOptions = useMemo(() => {
    if (!selectedRegionDistrict) return [];
    return selectedRegionDistrict["Sub-districts / Councils"]
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }, [selectedRegionDistrict]);

  useEffect(() => {
    if (selectedRegionDistrict) {
      setForm((prev) => ({
        ...prev,
        gpsLat: prev.gpsLat || parseGpsCoordinate(selectedRegionDistrict["GPS Latitude"]),
        gpsLng: prev.gpsLng || parseGpsCoordinate(selectedRegionDistrict["GPS Longitude"]),
      }));
    }
  }, [selectedRegionDistrict]);

  const toggleListValue = (field: "primaryLanguages" | "commonHealthChallenges", value: string) => {
    setForm((prev) => {
      const current = prev[field];
      return {
        ...prev,
        [field]: current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value],
      };
    });
  };

  const handleSubmit = async () => {
    const missingFields = [
      !form.name.trim() && "Community name",
      !form.region && "Region",
      !form.district && "District",
    ].filter(Boolean) as string[];
    if (missingFields.length > 0) {
      toast.error(`Required: ${missingFields.join(", ")}`);
      setStep(!form.name.trim() ? 0 : 1);
      return;
    }

    setSaving(true);
    try {
      const record = await insertCommunity({
        name: form.name,
        community_code: form.communityCode || null,
        region: form.region || null,
        district: form.district || null,
        sub_district: form.subDistrict || null,
        chps_zone: form.chpsZone || null,
        chps_facility_id: null,
        supervisor_id: null,
        nearest_referral_facility_id: null,
        gps_lat: form.gpsLat ? Number(form.gpsLat) : null,
        gps_lng: form.gpsLng ? Number(form.gpsLng) : null,
        location_desc: form.locationDesc || null,
        primary_languages: form.primaryLanguages.length ? form.primaryLanguages : [],
        common_health_challenges: form.commonHealthChallenges.length
          ? form.commonHealthChallenges
          : [],
        accessibility: form.accessibility || null,
        status: form.status || null,
      });
      toast.success(`Community ${form.name} saved`);
      setSavedCommunityId(record.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save community");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Create community"
        description="Register a new community with service and health information"
        icon={<Save className="h-5 w-5" />}
        breadcrumbs={[{ label: "Communities", to: "/communities" }, { label: "New" }]}
        actions={
          <Link to="/communities">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
        }
      />

      {savedCommunityId ? (
        <Card className="mx-auto max-w-lg rounded-xl">
          <CardContent className="space-y-4 p-8 text-center">
            <h2 className="text-xl font-semibold">Community saved</h2>
            <p className="text-sm text-muted-foreground">{form.name} is ready for registration.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => navigate({ to: "/register/household", search: { community_id: savedCommunityId } })}>
                Create household
              </Button>
              <Button variant="outline" onClick={() => navigate({ to: "/community/$id", params: { id: savedCommunityId } })}>
                View community
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">
            Step {step + 1} of {stepTitles.length}: {stepTitles[step]}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {step === 0 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label required>Community name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Asebu"
                />
              </div>
              <div>
                <Label>Community code</Label>
                <Input
                  value={form.communityCode}
                  onChange={(e) => setForm((prev) => ({ ...prev, communityCode: e.target.value }))}
                  placeholder="e.g. AS-07"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="needs_attention">Needs attention</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Draft</Label>
                <div className="flex items-center gap-2 rounded-md border p-2">
                  <Checkbox
                    checked={form.draft}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({ ...prev, draft: Boolean(checked) }))
                    }
                  />
                  <span className="text-sm">Save as draft for later completion</span>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label required>Region</Label>
                <Select
                  value={form.region}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, region: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label required>District</Label>
                <Select
                  value={form.district}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, district: value, subDistrict: "" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select district" />
                  </SelectTrigger>
                  <SelectContent>
                    {districtOptions.map((district) => (
                      <SelectItem key={district} value={district}>
                        {district}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sub-district</Label>
                {subDistrictOptions.length > 0 ? (
                  <Select
                    value={form.subDistrict}
                    onValueChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        subDistrict: value,
                        gpsLat:
                          prev.gpsLat ||
                          parseGpsCoordinate(selectedRegionDistrict?.["GPS Latitude"] ?? ""),
                        gpsLng:
                          prev.gpsLng ||
                          parseGpsCoordinate(selectedRegionDistrict?.["GPS Longitude"] ?? ""),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sub-district" />
                    </SelectTrigger>
                    <SelectContent>
                      {subDistrictOptions.map((subDistrict) => (
                        <SelectItem key={subDistrict} value={subDistrict}>
                          {subDistrict}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={form.subDistrict}
                    onChange={(e) => setForm((prev) => ({ ...prev, subDistrict: e.target.value }))}
                    placeholder="e.g. Brofoyedru"
                  />
                )}
              </div>
              <div>
                <Label>CHPS zone</Label>
                <Input
                  value={form.chpsZone}
                  onChange={(e) => setForm((prev) => ({ ...prev, chpsZone: e.target.value }))}
                  placeholder="e.g. Asebu North"
                />
              </div>
              <div>
                <Label>CHPS facility</Label>
                <Input
                  value={form.chpsFacility}
                  onChange={(e) => setForm((prev) => ({ ...prev, chpsFacility: e.target.value }))}
                  placeholder="e.g. Asebu CHPS Compound"
                />
              </div>
              <div>
                <Label>Nearest referral facility</Label>
                <Input
                  value={form.nearestFacility}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, nearestFacility: e.target.value }))
                  }
                  placeholder="e.g. Kwadaso Health Centre"
                />
              </div>
              <div>
                <Label>Assigned worker</Label>
                <Input
                  value={form.worker}
                  onChange={(e) => setForm((prev) => ({ ...prev, worker: e.target.value }))}
                  placeholder="e.g. Ama Boateng"
                />
              </div>
              <div>
                <Label>Supervisor</Label>
                <Input
                  value={form.supervisor}
                  onChange={(e) => setForm((prev) => ({ ...prev, supervisor: e.target.value }))}
                  placeholder="e.g. Kwaku Boateng"
                />
              </div>
              <div>
                <Label>Location description</Label>
                <Textarea
                  rows={2}
                  value={form.locationDesc}
                  onChange={(e) => setForm((prev) => ({ ...prev, locationDesc: e.target.value }))}
                  placeholder="Describe the physical location"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>GPS latitude</Label>
                  <Input
                    value={form.gpsLat}
                    onChange={(e) => setForm((prev) => ({ ...prev, gpsLat: e.target.value }))}
                    placeholder="6.67"
                  />
                </div>
                <div>
                  <Label>GPS longitude</Label>
                  <Input
                    value={form.gpsLng}
                    onChange={(e) => setForm((prev) => ({ ...prev, gpsLng: e.target.value }))}
                    placeholder="-1.62"
                  />
                </div>
              </div>
              {selectedRegionDistrict && (
                <div className="rounded-lg border border-muted-foreground/10 bg-muted/20 p-3 text-sm text-muted-foreground">
                  Coordinates loaded from selected region/district.
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label>Primary languages</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {languageOptions.map((item) => (
                    <label
                      key={item}
                      className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
                    >
                      <Checkbox
                        checked={form.primaryLanguages.includes(item)}
                        onCheckedChange={() => toggleListValue("primaryLanguages", item)}
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label>Community-reported concerns</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Record concerns identified through community engagement. Household reports are
                  summarized separately.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {COMMUNITY_ISSUES.map((issue) => (
                    <label
                      key={issue.id}
                      className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
                    >
                      <Checkbox
                        checked={form.commonHealthChallenges.includes(issue.id)}
                        onCheckedChange={() =>
                          toggleListValue("commonHealthChallenges", issue.id)
                        }
                      />
                      {issue.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label>Accessibility notes</Label>
                <Textarea
                  rows={3}
                  value={form.accessibility}
                  onChange={(e) => setForm((prev) => ({ ...prev, accessibility: e.target.value }))}
                  placeholder="Describe access routes, mobility, or barriers"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Community</div>
                <div className="font-medium">{form.name || "Untitled"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Code</div>
                <div className="font-medium">{form.communityCode || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">District</div>
                <div className="font-medium">{form.district || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">CHPS zone</div>
                <div className="font-medium">{form.chpsZone || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Worker</div>
                <div className="font-medium">{form.worker || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Supervisor</div>
                <div className="font-medium">{form.supervisor || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Status</div>
                <div className="font-medium capitalize">{form.status.replace(/_/g, " ")}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs text-muted-foreground">Notes</div>
                <div className="font-medium">{form.notes || "No notes added yet"}</div>
              </div>
            </div>
          )}

          <div className="flex justify-between gap-3 border-t pt-4">
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
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save community
              </Button>
            )}
          </div>
        </CardContent>
      </Card>}
    </AppLayout>
  );
}
