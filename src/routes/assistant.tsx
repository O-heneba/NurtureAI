import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, HeartPulse, Baby, Milk, Utensils, Send, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAI } from "@/ai";
import { toast } from "sonner";

export const Route = createFileRoute("/assistant")({
  component: Assistant,
});

const topics = [
  { icon: HeartPulse, label: "Pregnancy nutrition", tone: "bg-destructive/10 text-destructive" },
  { icon: Baby, label: "Child nutrition", tone: "bg-primary/10 text-primary" },
  { icon: Milk, label: "Breastfeeding", tone: "bg-info/10 text-info" },
  { icon: Utensils, label: "Meal ideas", tone: "bg-success/10 text-success" },
];

type Msg = { role: "user" | "assistant"; content: string };

const initialMessages: Msg[] = [
  {
    role: "assistant",
    content:
      "Akwaaba! I'm your NurtureAI Nutrition Assistant. Ask me about pregnancy nutrition, breastfeeding, child feeding, or common deficiencies — I focus on foods available in Ghana.",
  },
];

function Assistant() {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const ai = useAI();

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await ai.generate({ messages: next });
      setMessages([...next, { role: "assistant", content: res.text }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI request failed";
      toast.error(msg);
      setMessages(next);
    } finally {
      setLoading(false);
    }
  }

  const suggestedQuestions = [
    "What are the key red-flag signs?",
    "How should I record this assessment?",
    "What follow-up is recommended?",
  ];

  return (
    <AppLayout>
      <PageHeader
        title="AI Assistant"
        description="Ask NurtureAI for nutrition and health guidance"
      />

      <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
        <strong>AI-assisted guidance:</strong> Review suggestions against the person's situation and
        local clinical guidance. A qualified health worker remains responsible for decisions.
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-4">
        <div className="space-y-4">
          <Card className="rounded-xl">
            <CardContent className="p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-3">
                Topics
              </div>
              <div className="space-y-2">
                {topics.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => send(`Give me guidance on ${t.label.toLowerCase()}.`)}
                    className="flex items-center gap-2 w-full rounded-lg p-2 hover:bg-accent/50 text-sm text-left"
                  >
                    <div className={cn("grid h-8 w-8 place-items-center rounded-lg", t.tone)}>
                      <t.icon className="h-4 w-4" />
                    </div>
                    <span className="truncate">{t.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-xl flex flex-col min-h-[70vh]">
          <div className="p-4 border-b flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold text-sm">Nutrition Assistant</div>
              <div className="text-[11px] text-muted-foreground">
                {ai.isReady
                  ? "Local AI · offline ready"
                  : ai.isLoading
                    ? `Loading model ${ai.progress}%`
                    : "Local AI · not initialized"}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-3", m.role === "user" && "justify-end")}>
                {m.role === "assistant" && (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      <Sparkles className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm max-w-[80%] whitespace-pre-line",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-accent rounded-tl-sm",
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    <Sparkles className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="rounded-2xl px-4 py-2.5 text-sm bg-accent rounded-tl-sm inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                </div>
              </div>
            )}
          </div>

          <div className="border-t p-4">
            <div className="flex flex-wrap gap-2 mb-3">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  disabled={loading}
                  className="text-xs rounded-full border px-3 py-1.5 hover:bg-accent disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about nutrition, feeding, or health…"
                disabled={loading}
              />
              <Button
                type="submit"
                className="rounded-xl"
                disabled={loading || ai.status === "unavailable"}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            {ai.error && <p className="mt-2 text-xs text-destructive">{ai.error.message}</p>}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
