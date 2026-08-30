import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Layers, Map, Plus, Loader2, Trash2, Edit3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  fetchRegions,
  fetchDistricts,
  fetchSubDistricts,
  createRegion,
  updateRegion,
  deleteRegion,
  createDistrict,
  updateDistrict,
  deleteDistrict,
  createSubDistrict,
  updateSubDistrict,
  deleteSubDistrict,
  seedGeography,
  seedCommunities,
} from "@/lib/server.functions";

export const Route = createFileRoute("/admin/geography")({
  component: AdminGeography,
});

type RegionRow = { id: string; name: string };
type DistrictRow = {
  id: string;
  name: string;
  region_id: string;
  gps_lat: number | null;
  gps_lng: number | null;
};
type SubDistrictRow = { id: string; name: string; district_id: string };

function AdminGeography() {
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [districts, setDistricts] = useState<DistrictRow[]>([]);
  const [subDistricts, setSubDistricts] = useState<SubDistrictRow[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [communitySeedLoading, setCommunitySeedLoading] = useState(false);
  const [regionName, setRegionName] = useState("");
  const [districtName, setDistrictName] = useState("");
  const [gpsLat, setGpsLat] = useState("");
  const [gpsLng, setGpsLng] = useState("");
  const [subDistrictName, setSubDistrictName] = useState("");
  const [editingRegion, setEditingRegion] = useState<RegionRow | null>(null);
  const [editingDistrict, setEditingDistrict] = useState<DistrictRow | null>(null);
  const [editingSubDistrict, setEditingSubDistrict] = useState<SubDistrictRow | null>(null);

  const fetchRegionsFn = useServerFn(fetchRegions);
  const fetchDistrictsFn = useServerFn(fetchDistricts);
  const fetchSubDistrictsFn = useServerFn(fetchSubDistricts);
  const createRegionFn = useServerFn(createRegion);
  const updateRegionFn = useServerFn(updateRegion);
  const deleteRegionFn = useServerFn(deleteRegion);
  const createDistrictFn = useServerFn(createDistrict);
  const updateDistrictFn = useServerFn(updateDistrict);
  const deleteDistrictFn = useServerFn(deleteDistrict);
  const createSubDistrictFn = useServerFn(createSubDistrict);
  const updateSubDistrictFn = useServerFn(updateSubDistrict);
  const deleteSubDistrictFn = useServerFn(deleteSubDistrict);
  const seedGeographyFn = useServerFn(seedGeography);
  const seedCommunitiesFn = useServerFn(seedCommunities);

  const selectedRegionName = useMemo(
    () => regions.find((region) => region.id === selectedRegion)?.name ?? "",
    [regions, selectedRegion],
  );

  const selectedDistrictName = useMemo(
    () => districts.find((district) => district.id === selectedDistrict)?.name ?? "",
    [districts, selectedDistrict],
  );

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!selectedRegion) {
      setDistricts([]);
      setSelectedDistrict(null);
      return;
    }
    loadDistricts(selectedRegion);
  }, [selectedRegion]);

  useEffect(() => {
    if (!selectedDistrict) {
      setSubDistricts([]);
      return;
    }
    loadSubDistricts(selectedDistrict);
  }, [selectedDistrict]);

  async function loadAll() {
    setLoading(true);
    try {
      const regions = await fetchRegionsFn();
      setRegions(regions);
      if (regions.length > 0) setSelectedRegion((prev) => prev ?? regions[0].id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to load regions");
    } finally {
      setLoading(false);
    }
  }

  async function loadDistricts(regionId: string) {
    setLoading(true);
    try {
      const districts = await fetchDistrictsFn({ data: regionId });
      setDistricts(districts);
      if (districts.length > 0) setSelectedDistrict((prev) => prev ?? districts[0].id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to load districts");
    } finally {
      setLoading(false);
    }
  }

  async function loadSubDistricts(districtId: string) {
    setLoading(true);
    try {
      const subDistricts = await fetchSubDistrictsFn({ data: districtId });
      setSubDistricts(subDistricts);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to load sub-districts");
    } finally {
      setLoading(false);
    }
  }

  async function saveRegion() {
    try {
      if (editingRegion) {
        await updateRegionFn({ data: { id: editingRegion.id, name: regionName } });
        toast.success("Region updated");
      } else {
        await createRegionFn({ data: { name: regionName } });
        toast.success("Region created");
      }
      setRegionName("");
      setEditingRegion(null);
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to save region");
    }
  }

  async function saveDistrict() {
    if (!selectedRegion && !editingDistrict) {
      toast.error("Select a region first");
      return;
    }
    try {
      const payload = {
        name: districtName,
        region_id: selectedRegion ?? editingDistrict?.region_id ?? "",
        gps_lat: gpsLat ? Number(gpsLat) : null,
        gps_lng: gpsLng ? Number(gpsLng) : null,
      };
      if (editingDistrict) {
        await updateDistrictFn({ data: { id: editingDistrict.id, ...payload } });
        toast.success("District updated");
      } else {
        await createDistrictFn({ data: payload });
        toast.success("District created");
      }
      setDistrictName("");
      setGpsLat("");
      setGpsLng("");
      setEditingDistrict(null);
      if (selectedRegion) await loadDistricts(selectedRegion);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to save district");
    }
  }

  async function saveSubDistrict() {
    if (!selectedDistrict && !editingSubDistrict) {
      toast.error("Select a district first");
      return;
    }
    try {
      if (editingSubDistrict) {
        await updateSubDistrictFn({
          data: {
            id: editingSubDistrict.id,
            name: subDistrictName,
            district_id: editingSubDistrict.district_id,
          },
        });
        toast.success("Sub-district updated");
      } else {
        await createSubDistrictFn({
          data: { name: subDistrictName, district_id: selectedDistrict! },
        });
        toast.success("Sub-district created");
      }
      setSubDistrictName("");
      setEditingSubDistrict(null);
      if (selectedDistrict) await loadSubDistricts(selectedDistrict);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to save sub-district");
    }
  }

  async function onSeed() {
    setSeedLoading(true);
    try {
      const added = await seedGeographyFn();
      toast.success(`Seed imported ${added} geography records`);
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to seed geography");
    } finally {
      setSeedLoading(false);
    }
  }

  async function onSeedCommunities() {
    setCommunitySeedLoading(true);
    try {
      const added = await seedCommunitiesFn();
      toast.success(`Seed imported ${added} communities`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to seed communities");
    } finally {
      setCommunitySeedLoading(false);
    }
  }

  return (
    <AppLayout>
      <PageHeader
        title="Geography admin"
        description="Manage normalized regions, districts, and sub-districts"
        icon={<MapPin className="h-5 w-5" />}
      />

      <div className="grid xl:grid-cols-[360px_1fr] gap-4">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Regions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {regions.map((region) => (
                <div
                  key={region.id}
                  className={`grid grid-cols-[1fr_auto] gap-2 rounded-xl border p-3 ${selectedRegion === region.id ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <button
                    className="text-left"
                    onClick={() => {
                      setSelectedRegion(region.id);
                      setSelectedDistrict(null);
                    }}
                  >
                    <div className="font-medium">{region.name}</div>
                  </button>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingRegion(region);
                        setRegionName(region.name);
                        setSelectedRegion(region.id);
                      }}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        try {
                          await deleteRegionFn({ data: { id: region.id } });
                          toast.success("Region deleted");
                          if (selectedRegion === region.id) {
                            setSelectedRegion(null);
                            setSelectedDistrict(null);
                          }
                          await loadAll();
                        } catch (error) {
                          toast.error(
                            error instanceof Error ? error.message : "Unable to delete region",
                          );
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <Label>Region name</Label>
                <Input
                  value={regionName}
                  onChange={(e) => setRegionName(e.target.value)}
                  placeholder="New region"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={saveRegion} disabled={!regionName.trim()}>
                  {editingRegion ? "Update region" : "Create region"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setRegionName("");
                    setEditingRegion(null);
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>Districts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">Selected region</span>
                  <span className="text-sm text-muted-foreground">
                    {selectedRegionName || "None"}
                  </span>
                </div>
                {districts.map((district) => (
                  <div
                    key={district.id}
                    className={`grid grid-cols-[1fr_auto] gap-2 rounded-xl border p-3 ${selectedDistrict === district.id ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <button className="text-left" onClick={() => setSelectedDistrict(district.id)}>
                      <div className="font-medium">{district.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Lat {district.gps_lat ?? "—"}, Lng {district.gps_lng ?? "—"}
                      </div>
                    </button>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingDistrict(district);
                          setDistrictName(district.name);
                          setGpsLat(district.gps_lat?.toString() ?? "");
                          setGpsLng(district.gps_lng?.toString() ?? "");
                          setSelectedRegion(district.region_id);
                          setSelectedDistrict(district.id);
                        }}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          try {
                            await deleteDistrictFn({ data: { id: district.id } });
                            toast.success("District deleted");
                            if (selectedDistrict === district.id) {
                              setSelectedDistrict(null);
                            }
                            if (district.region_id) await loadDistricts(district.region_id);
                          } catch (error) {
                            toast.error(
                              error instanceof Error ? error.message : "Unable to delete district",
                            );
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>District name</Label>
                  <Input
                    value={districtName}
                    onChange={(e) => setDistrictName(e.target.value)}
                    placeholder="New district"
                  />
                </div>
                <div>
                  <Label>Latitude</Label>
                  <Input
                    value={gpsLat}
                    onChange={(e) => setGpsLat(e.target.value)}
                    placeholder="9.1234"
                  />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <Input
                    value={gpsLng}
                    onChange={(e) => setGpsLng(e.target.value)}
                    placeholder="-0.1234"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={saveDistrict} disabled={!districtName.trim()}>
                  {editingDistrict ? "Update district" : "Create district"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setDistrictName("");
                    setGpsLat("");
                    setGpsLng("");
                    setEditingDistrict(null);
                  }}
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>Sub-districts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">Selected district</span>
                <span className="text-sm text-muted-foreground">
                  {selectedDistrictName || "None"}
                </span>
              </div>
              <div className="space-y-2">
                {subDistricts.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between rounded-xl border p-3"
                  >
                    <div>{sub.name}</div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingSubDistrict(sub);
                          setSubDistrictName(sub.name);
                        }}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          try {
                            await deleteSubDistrictFn({ data: { id: sub.id } });
                            toast.success("Sub-district deleted");
                            if (selectedDistrict) loadSubDistricts(selectedDistrict);
                          } catch (error) {
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "Unable to delete sub-district",
                            );
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <Label>Sub-district name</Label>
                <Input
                  value={subDistrictName}
                  onChange={(e) => setSubDistrictName(e.target.value)}
                  placeholder="New sub-district"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={saveSubDistrict} disabled={!subDistrictName.trim()}>
                  {editingSubDistrict ? "Update sub-district" : "Create sub-district"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSubDistrictName("");
                    setEditingSubDistrict(null);
                  }}
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>Seed geography</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Import regions, districts, and sub-districts from the Northern Ghana workbook JSON.
              </div>
              <div className="mt-4">
                <Button onClick={onSeed} disabled={seedLoading}>
                  {seedLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Seeding…
                    </span>
                  ) : (
                    "Seed geography from JSON"
                  )}
                </Button>
              </div>
              <div className="mt-6 border-t pt-4">
                <div className="text-sm text-muted-foreground">
                  Import the 270 named communities into their districts.
                </div>
                <div className="mt-4">
                  <Button onClick={onSeedCommunities} disabled={communitySeedLoading}>
                    {communitySeedLoading ? "Seeding communities…" : "Seed communities from JSON"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
