import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Apple, ArrowRight, HeartPulse, Baby, Milk, Utensils } from "lucide-react";

export const Route = createFileRoute("/nutrition")({
  component: Nutrition,
});

const guides = [
  {
    icon: HeartPulse,
    title: "Pregnancy nutrition",
    desc: "Iron, folate & protein-rich local meal plans across all three trimesters.",
    tone: "bg-destructive/10 text-destructive",
  },
  {
    icon: Baby,
    title: "Child nutrition (6–59m)",
    desc: "Complementary feeding using kontomire, koko, groundnut and eggs.",
    tone: "bg-primary/10 text-primary",
  },
  {
    icon: Milk,
    title: "Breastfeeding support",
    desc: "Exclusive breastfeeding tips and troubleshooting common latch issues.",
    tone: "bg-info/10 text-info",
  },
  {
    icon: Utensils,
    title: "Healthy meal ideas",
    desc: "Balanced Ghanaian meal suggestions across all six food groups.",
    tone: "bg-success/10 text-success",
  },
];

const tips = [
  {
    t: "Encourage exclusive breastfeeding",
    d: "For the first 6 months, no water, teas or other foods.",
  },
  {
    t: "Iron & folate every day",
    d: "Pregnant women should take iron and folate supplements throughout pregnancy.",
  },
  {
    t: "6 food groups daily",
    d: "Aim for staples, legumes, animal protein, vegetables, fruits and healthy fats.",
  },
  {
    t: "Growth monitoring monthly",
    d: "Weigh every child under 2 monthly to catch underweight early.",
  },
];

function Nutrition() {
  return (
    <AppLayout>
      <PageHeader
        title="Nutrition"
        description="Guidance, education materials and quick tips"
        actions={
          <Button asChild className="rounded-xl">
            <Link to="/assistant">
              <Apple className="mr-1.5 h-4 w-4" /> Open Nutrition Assistant
            </Link>
          </Button>
        }
      />

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {guides.map((g) => (
          <Card
            key={g.title}
            className="rounded-xl hover:shadow-md transition-shadow cursor-pointer"
          >
            <CardContent className="p-5">
              <div className={`grid h-10 w-10 place-items-center rounded-xl mb-3 ${g.tone}`}>
                <g.icon className="h-5 w-5" />
              </div>
              <div className="font-semibold">{g.title}</div>
              <div className="text-sm text-muted-foreground mt-1">{g.desc}</div>
              <div className="mt-3 text-sm text-primary flex items-center gap-1 font-medium">
                Open guide <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-xl">
        <CardContent className="p-5">
          <div className="font-semibold mb-4">Quick tips for CHPS workers</div>
          <div className="grid sm:grid-cols-2 gap-4">
            {tips.map((t) => (
              <div key={t.t} className="flex gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-success shrink-0" />
                <div>
                  <div className="text-sm font-medium">{t.t}</div>
                  <div className="text-xs text-muted-foreground">{t.d}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
