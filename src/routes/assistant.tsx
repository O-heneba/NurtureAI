import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, HeartPulse, Baby, Milk, Utensils, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { nutritionMessages, suggestedQuestions } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/assistant")({
  component: Assistant,
});

const topics = [
  { icon: HeartPulse, label: "Pregnancy nutrition", tone: "bg-destructive/10 text-destructive" },
  { icon: Baby, label: "Child nutrition", tone: "bg-primary/10 text-primary" },
  { icon: Milk, label: "Breastfeeding", tone: "bg-info/10 text-info" },
  { icon: Utensils, label: "Meal ideas", tone: "bg-success/10 text-success" },
];

function Assistant() {
  const [messages, setMessages] = useState(nutritionMessages);
  const [input, setInput] = useState("");

  function send(text: string) {
    if (!text.trim()) return;
    const userMsg = { role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "Great question. Here's guidance drawn from Ghana Health Service protocols — please still confirm with local clinical judgment. Aim for varied local foods across all six food groups: staples (kenkey, banku, rice), legumes (beans, groundnut), animal protein (fish, eggs, meat), vegetables (kontomire, garden eggs), fruits (mango, orange, pawpaw), and healthy fats. Encourage 3 balanced meals and 2 nutrient-dense snacks daily.",
        },
      ]);
    }, 700);
  }

  return (
    <AppLayout>
      <PageHeader
        title="AI Assistant"
        description="Ask NurtureAI for nutrition and health guidance"
      />

      <div className="grid lg:grid-cols-[280px_1fr] gap-4">
        {/* Left rail */}
        <div className="space-y-4">
          <Card className="rounded-xl">
            <CardContent className="p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-3">Topics</div>
              <div className="space-y-2">
                {topics.map((t) => (
                  <button key={t.label} className="flex items-center gap-2 w-full rounded-lg p-2 hover:bg-accent/50 text-sm">
                    <div className={cn("grid h-8 w-8 place-items-center rounded-lg", t.tone)}>
                      <t.icon className="h-4 w-4" />
                    </div>
                    <span className="truncate">{t.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardContent className="p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-3">History</div>
              <div className="space-y-1 text-sm">
                {["Iron-rich meals for anemia", "Breastfeeding tips", "Feeding a 7-month-old"].map((h) => (
                  <button key={h} className="w-full text-left truncate rounded-md p-2 hover:bg-accent/50">{h}</button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat */}
        <Card className="rounded-xl flex flex-col min-h-[70vh]">
          <div className="p-4 border-b flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold text-sm">Nutrition Assistant</div>
              <div className="text-[11px] text-muted-foreground">AI · localized for Ghana</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-3", m.role === "user" && "justify-end")}>
                {m.role === "assistant" && (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs"><Sparkles className="h-4 w-4" /></AvatarFallback>
                  </Avatar>
                )}
                <div className={cn(
                  "rounded-2xl px-4 py-2.5 text-sm max-w-[80%] whitespace-pre-line",
                  m.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-accent rounded-tl-sm",
                )}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t p-4">
            <div className="flex flex-wrap gap-2 mb-3">
              {suggestedQuestions.map((q) => (
                <button key={q} onClick={() => send(q)} className="text-xs rounded-full border px-3 py-1.5 hover:bg-accent">
                  {q}
                </button>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
              <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about nutrition, feeding, or health…" />
              <Button type="submit" className="rounded-xl"><Send className="h-4 w-4" /></Button>
            </form>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
