import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Apple, Baby, ChevronDown, HeartPulse, Utensils } from "lucide-react";

type NutritionLesson = {
  id: string;
  icon: typeof Apple;
  title: string;
  summary: string;
  tone: string;
  keyMessages: string[];
  talkTogether: string;
};

const lessons: NutritionLesson[] = [
  {
    id: "everyday-meals",
    icon: Utensils,
    title: "Building nourishing everyday meals",
    summary:
      "Small choices can make meals more varied, using foods that are available and affordable.",
    tone: "bg-success/10 text-success",
    keyMessages: [
      "When you can, combine a filling staple such as maize, cassava, yam, rice, or plantain with beans, groundnuts, fish, eggs, or another protein food.",
      "Add vegetables or fruit when available. Fresh, frozen, or canned options can all be useful.",
      "Choose water often, and limit very sugary drinks and snacks when possible.",
    ],
    talkTogether:
      "Which foods are easiest for your family to get? What is one nourishing food you would like to include more often?",
  },
  {
    id: "pregnancy",
    icon: HeartPulse,
    title: "Eating well during pregnancy and breastfeeding",
    summary:
      "Food needs can change. Antenatal and postnatal care teams can give advice for your situation.",
    tone: "bg-destructive/10 text-destructive",
    keyMessages: [
      "Try to eat a variety of nourishing foods that are available to you.",
      "Attend antenatal and postnatal visits, and ask your health worker about food, supplements, or symptoms that concern you.",
      "Use supplements and medicines only as advised by your health worker.",
    ],
    talkTogether:
      "Is there a food or nutrition question you would like to discuss with your midwife or other health worker?",
  },
  {
    id: "baby-feeding",
    icon: Baby,
    title: "Feeding a baby from birth to 6 months",
    summary:
      "Breastmilk gives a young baby the nourishment they need. Get support if feeding is difficult.",
    tone: "bg-primary/10 text-primary",
    keyMessages: [
      "WHO recommends exclusive breastfeeding for the first 6 months. This means breastmilk only, with no other food or drink, including water.",
      "Feed your baby whenever they show they are hungry, day or night.",
      "If breastfeeding is painful, difficult, or worrying you, ask a health worker for help. Follow their advice if your baby needs a different feeding plan.",
    ],
    talkTogether:
      "How is feeding going for you and your baby? What kind of support would make it easier?",
  },
  {
    id: "young-child-feeding",
    icon: Baby,
    title: "Feeding a child from 6 months and beyond",
    summary:
      "As babies grow, they need safe, suitable foods as well as continued care and support.",
    tone: "bg-info/10 text-info",
    keyMessages: [
      "From 6 months, WHO recommends starting safe, nutritious complementary foods while continuing breastfeeding.",
      "Offer foods that are suitable for your child's age and ability to eat. A health worker can help if you are unsure about texture or portions.",
      "Continue breastfeeding until 2 years or beyond, if possible.",
      "If your child is not feeding well, seems unwell, or you are worried about their growth, contact a health worker.",
    ],
    talkTogether:
      "What foods does your child enjoy? Is there anything about feeding or growth that you would like help with?",
  },
  {
    id: "food-safety",
    icon: Apple,
    title: "Keeping food and water safe",
    summary: "Safe preparation and storage help protect everyone from illness.",
    tone: "bg-warning/15 text-warning",
    keyMessages: [
      "Wash your hands with soap and clean water before preparing food and before eating.",
      "Use clean utensils and safe water. Wash fruits and vegetables with safe water.",
      "Cook food thoroughly and keep raw foods separate from cooked foods.",
      "Keep food covered and store it safely. If you are unsure whether food is safe, do not eat it.",
    ],
    talkTogether:
      "What makes it easier or harder to get safe water and prepare or store food at home?",
  },
];

export const Route = createFileRoute("/nutrition")({
  component: Nutrition,
});

function Nutrition() {
  const [openGuide, setOpenGuide] = useState<string | null>(null);

  return (
    <AppLayout>
      <PageHeader
        title="Nutrition"
        description="Simple nutrition lessons to share with patients and families"
        actions={
          <Button asChild className="rounded-xl">
            <Link to="/assistant">
              <Apple className="mr-1.5 h-4 w-4" /> Ask the Nutrition Assistant
            </Link>
          </Button>
        }
      />

      <div className="mb-6 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
        Use these lessons to support a conversation, not to diagnose or prescribe. Follow current
        Ghana Health Service and facility guidance. A qualified health worker can advise on
        individual needs.
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-semibold">Patient learning topics</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Open a topic to share key messages, then talk together about what is practical for the
          patient and family.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {lessons.map((lesson) => {
          const Icon = lesson.icon;
          const expanded = openGuide === lesson.id;
          return (
            <Card key={lesson.id} className="rounded-xl">
              <CardContent className="p-5">
                <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${lesson.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{lesson.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{lesson.summary}</p>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-3 px-0 text-primary hover:bg-transparent"
                  aria-expanded={expanded}
                  aria-controls={`${lesson.id}-lesson`}
                  onClick={() => setOpenGuide(expanded ? null : lesson.id)}
                >
                  {expanded ? "Close lesson" : "Share this lesson"}
                  <ChevronDown
                    className={`ml-1 h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                  />
                </Button>

                {expanded && (
                  <div id={`${lesson.id}-lesson`} className="mt-3 border-t pt-3">
                    <h4 className="text-sm font-semibold">Key messages</h4>
                    <ul className="mt-2 space-y-2">
                      {lesson.keyMessages.map((message) => (
                        <li key={message} className="flex gap-2 text-sm">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          <span>{message}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 rounded-lg bg-muted/50 p-3">
                      <h4 className="text-sm font-semibold">Talk together</h4>
                      <p className="mt-1 text-sm text-muted-foreground">{lesson.talkTogether}</p>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      If there is a health concern or the patient needs individual advice, help them
                      speak with a qualified health worker.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Sources:{" "}
        <a
          href="https://www.who.int/news-room/fact-sheets/detail/healthy-diet"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          WHO healthy diet
        </a>
        {" · "}
        <a
          href="https://www.who.int/news-room/fact-sheets/detail/infant-and-young-child-feeding"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          WHO infant and young-child feeding
        </a>
        {" · "}
        <a
          href="https://www.who.int/news-room/fact-sheets/detail/food-safety"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          WHO food safety
        </a>
      </p>
    </AppLayout>
  );
}
