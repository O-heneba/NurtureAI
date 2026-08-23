import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, EmptyState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Link as RouterLink } from "@tanstack/react-router";
import { MapPin, Home } from "lucide-react";
import { getCommunity, listHouseholdsByCommunity } from "@/lib/registrations";

export const Route = createFileRoute("/community/$id")({
  loader: async ({ params }) => {
    const c = await getCommunity(params.id);
    if (!c) throw notFound();
    const households = await listHouseholdsByCommunity(params.id);
    return { c, households };
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
  const { c, households } = Route.useLoaderData();

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

      <Tabs defaultValue="households" className="w-full">
        <TabsList className="rounded-xl mb-4 overflow-x-auto flex w-full justify-start">
          <TabsTrigger value="households">Households</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="rounded-xl">
            <CardContent className="p-5 text-sm text-muted-foreground">
              This community record is linked to the live CHPS registry. Use the household listing
              to inspect individual household details and follow-up actions.
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
