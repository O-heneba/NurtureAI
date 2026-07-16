import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader, RiskBadge } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Send, MapPin, Calendar } from "lucide-react";
import { referrals } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/referrals")({
  component: Referrals,
});

const statusTone: Record<string, string> = {
  Pending: "bg-warning/15 text-warning border-warning/30",
  "In transit": "bg-info/10 text-info border-info/30",
  Received: "bg-primary/10 text-primary border-primary/30",
  Completed: "bg-success/10 text-success border-success/30",
  Scheduled: "bg-accent text-foreground",
};

function Referrals() {
  return (
    <AppLayout>
      <PageHeader
        title="Referrals"
        description="Track patients referred to higher-level facilities"
        actions={<Button className="rounded-xl"><Plus className="mr-1 h-4 w-4" /> Create referral</Button>}
      />

      <div className="space-y-3">
        {referrals.map((r) => (
          <Card key={r.id} className="rounded-xl hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 md:flex md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-semibold truncate">{r.patient}</div>
                    <RiskBadge level={r.priority} />
                  </div>
                  <div className="text-sm text-muted-foreground truncate">{r.reason}</div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.from} → {r.to}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{r.date}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline" className={cn(statusTone[r.status])}>{r.status}</Badge>
                  <Button size="sm" variant="ghost" className="hidden md:inline-flex"><Send className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
