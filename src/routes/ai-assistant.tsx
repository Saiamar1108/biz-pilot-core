import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Mic, Paperclip, Send, Sparkles, TrendingUp, Package, Users } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/ai-assistant")({
  head: () => ({ meta: [{ title: "AI Assistant — ShopPilot AI" }] }),
  component: AIPage,
});

type Msg = { role: "user" | "ai"; text: string; card?: { title: string; value: string; icon: any } };

const initial: Msg[] = [
  { role: "ai", text: "Hi! I'm your ShopPilot AI. Ask me anything about your sales, inventory, or customers." },
  { role: "user", text: "What are my top selling products this week?" },
  {
    role: "ai",
    text: "Cold Brew Bottle leads with 320 units sold, followed by Dark Chocolate (210) and Organic Eggs (190). Sales are up 18% vs last week.",
    card: { title: "Top Seller", value: "Cold Brew · 320 units", icon: TrendingUp },
  },
];

const prompts = [
  { icon: TrendingUp, text: "Show me this week's revenue" },
  { icon: Package, text: "Which products are running low?" },
  { icon: Users, text: "Who are my top 5 customers?" },
  { icon: Sparkles, text: "Predict tomorrow's demand" },
];

function AIPage() {
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [input, setInput] = useState("");

  const send = (text?: string) => {
    const t = (text ?? input).trim();
    if (!t) return;
    setMsgs((m) => [...m, { role: "user", text: t }]);
    setInput("");
    setTimeout(() => {
      setMsgs((m) => [...m, { role: "ai", text: "Analyzing your data... Here's what I found based on the last 30 days of activity." }]);
    }, 600);
  };

  return (
    <DashboardLayout title="AI Assistant">
      <div className="grid lg:grid-cols-[1fr_280px] gap-6 h-[calc(100vh-9rem)]">
        <div className="glass-card rounded-2xl flex flex-col overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl gradient-primary shadow-glow">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display font-bold">ShopPilot Assistant</div>
              <div className="text-xs text-accent-brand flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent-brand animate-pulse" /> Online · GPT-powered
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex gap-3"}>
                {m.role === "ai" && (
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl gradient-primary">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
                <div className={m.role === "user"
                  ? "gradient-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-lg shadow-md"
                  : "max-w-lg space-y-3"}>
                  <div className={m.role === "user" ? "text-sm" : "text-sm leading-relaxed"}>{m.text}</div>
                  {m.card && (
                    <div className="glass-card rounded-xl p-4 flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent-brand/10 text-accent-brand">
                        <m.card.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">{m.card.title}</div>
                        <div className="font-semibold">{m.card.value}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-border">
            <div className="flex flex-wrap gap-2 mb-3">
              {prompts.map((p) => (
                <button key={p.text} onClick={() => send(p.text)}
                  className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-secondary/60 hover:bg-accent hover:border-primary/40 transition">
                  <p.icon className="h-3 w-3 text-primary" /> {p.text}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl border border-border bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition">
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0"><Paperclip className="h-4 w-4" /></Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask anything about your business..."
                className="border-0 shadow-none focus-visible:ring-0 focus-visible:border-0 bg-transparent"
              />
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-primary"><Mic className="h-4 w-4" /></Button>
              <Button size="icon" onClick={() => send()} className="h-9 w-9 shrink-0 gradient-primary text-primary-foreground">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="hidden lg:block space-y-4">
          <div className="glass-card rounded-2xl p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Quick Actions</div>
            <div className="space-y-2">
              {["Generate weekly report", "Draft customer email", "Analyze slow movers", "Reorder suggestions"].map((a) => (
                <button key={a} className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-secondary transition">{a}</button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl p-5 gradient-primary text-primary-foreground shadow-glow">
            <Sparkles className="h-5 w-5 mb-3" />
            <div className="font-display font-bold">Voice Commands</div>
            <p className="text-sm text-primary-foreground/80 mt-1">Tap the mic to speak your orders or ask questions hands-free.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
