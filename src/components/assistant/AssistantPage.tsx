import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Mic, Paperclip, Send, Sparkles, TrendingUp, Package, Users, ChevronDown, ChevronUp } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { postAiChat } from "@/lib/api";

type Msg = {
  role: "user" | "ai";
  text: string;
  card?: { title: string; value: string; icon: LucideIcon };
  collapsible?: boolean;
};

const initial: Msg[] = [
  { role: "ai", text: "Hi! I'm your ShopPilot AI assistant. Ask me anything about your live store data." },
];

const prompts = [
  { icon: TrendingUp, text: "What's my total revenue?" },
  { icon: Package, text: "Which products need restocking?" },
  { icon: Users, text: "Who owes me money?" },
  { icon: Sparkles, text: "Predict tomorrow's sales" },
];

const voiceCommands = [
  "what's my total revenue",
  "which products need restocking",
  "who owes me money",
  "predict tomorrow's sales",
  "show low stock products",
];

export function AssistantPage() {
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [processingVoice, setProcessingVoice] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const toggleExpand = useCallback((index: number) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const send = async (text?: string) => {
    const t = (text ?? input).trim();
    if (!t || sending) return;

    setMsgs((m) => [...m, { role: "user", text: t }, { role: "ai", text: "Thinking..." }]);
    setInput("");
    setSending(true);

    try {
      const response = await postAiChat(t);
      const reply = response.reply ?? response.message ?? "I couldn't generate a response right now.";
      
      // Check if response is too long (more than 5 lines)
      const lineCount = reply.split('\n').length;
      const isCollapsible = lineCount > 5;
      
      setMsgs((m) => {
        const next = m.slice(0, -1);
        return [...next, { role: "ai", text: reply, collapsible: isCollapsible }];
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to reach ShopPilot AI right now.";
      setSendError(message);
      setMsgs((m) => {
        const next = m.slice(0, -1);
        return [...next, { role: "ai", text: "I couldn't load a live answer right now. Please try again." }];
      });
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, sending]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setRecognitionSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setVoiceStatus("Listening...");
      setSendError(null);
    };

    recognition.onresult = (event: any) => {
      const transcript = String(event.results[0][0].transcript || "").trim();
      setInput(transcript);
      setVoiceStatus("Processing...");
      setListening(false);

      const normalized = transcript.toLowerCase().trim();
      if (voiceCommands.includes(normalized)) {
        setProcessingVoice(true);
        send(transcript).finally(() => {
          setProcessingVoice(false);
          setVoiceStatus(null);
        });
      } else {
        setVoiceStatus("Speech captured. Press send to submit.");
      }
    };

    recognition.onerror = (event: any) => {
      setListening(false);
      setVoiceStatus(null);
      if (event.error === "not-allowed" || event.error === "permission-denied") {
        setSendError("Microphone permission denied.");
      } else {
        setSendError(`Voice recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setListening(false);
      if (!processingVoice) {
        setVoiceStatus((prev) => (prev === "Listening..." ? null : prev));
      }
    };

    recognitionRef.current = recognition;
    setRecognitionSupported(true);

    return () => {
      recognition.stop?.();
      recognitionRef.current = null;
    };
  }, [processingVoice]);

  const toggleVoice = () => {
    if (!recognitionSupported) {
      setSendError("Voice not supported");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    setSendError(null);
    setVoiceStatus("Listening...");
    recognitionRef.current?.start();
  };

  return (
    <DashboardLayout title="AI Assistant">
      <div className="grid lg:grid-cols-[1fr_280px] gap-6 min-h-[calc(100vh-9rem)]">
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
                  <div className="text-sm leading-relaxed">
                    {m.collapsible && !expandedMessages.has(i) ? (
                      <div>
                        {m.text.split('\n').slice(0, 5).join('\n')}
                        <button
                          onClick={() => toggleExpand(i)}
                          className="text-xs text-primary mt-2 flex items-center gap-1 hover:underline"
                        >
                          <ChevronDown className="h-3 w-3" /> Show details
                        </button>
                      </div>
                    ) : m.collapsible && expandedMessages.has(i) ? (
                      <div>
                        {m.text}
                        <button
                          onClick={() => toggleExpand(i)}
                          className="text-xs text-primary mt-2 flex items-center gap-1 hover:underline"
                        >
                          <ChevronUp className="h-3 w-3" /> Show less
                        </button>
                      </div>
                    ) : (
                      m.text
                    )}
                  </div>
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
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t border-border">
            <div className="flex flex-wrap gap-2 mb-3">
              {prompts.map((p) => (
                <button
                  key={p.text}
                  onClick={() => send(p.text)}
                  disabled={sending}
                  className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-secondary/60 hover:bg-accent hover:border-primary/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <p.icon className="h-3 w-3 text-primary" /> {p.text}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl border border-border bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition">
              <input ref={fileRef} type="file" className="hidden" accept=".csv,.pdf,.xlsx" />
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => fileRef.current?.click()} disabled={sending}>
                <Paperclip className="h-4 w-4" />
              </Button>
              <div className="relative flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-9 w-9 shrink-0 ${listening ? "text-destructive shadow-glow" : "text-primary"}`}
                  onClick={toggleVoice}
                  disabled={sending || !recognitionSupported}
                  title={recognitionSupported ? "Start voice input" : "Voice not supported"}
                >
                  <Mic className="h-4 w-4" />
                </Button>
                {listening && (
                  <span className="absolute -right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/80 animate-ping" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse delay-150" />
                  </span>
                )}
              </div>
              <div className="flex-1">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Ask anything about your business..."
                  disabled={sending}
                  className="border-0 shadow-none focus-visible:ring-0 focus-visible:border-0 bg-transparent"
                />
                {(voiceStatus || sendError || processingVoice) && (
                  <div className="text-[11px] mt-1 text-muted-foreground">
                    {processingVoice ? "Processing..." : sendError || voiceStatus}
                  </div>
                )}
              </div>
              <Button size="icon" onClick={() => send()} className="h-9 w-9 shrink-0 gradient-primary text-primary-foreground" disabled={sending}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="hidden lg:block space-y-4">
          <div className="glass-card rounded-2xl p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Suggested Prompts</div>
            <div className="space-y-2">
              {prompts.map((p) => (
                <button
                  key={p.text}
                  onClick={() => send(p.text)}
                  disabled={sending}
                  className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-secondary transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <p.icon className="h-3.5 w-3.5 text-primary shrink-0" />
                  {p.text}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl p-5 gradient-primary text-primary-foreground shadow-glow">
            <Sparkles className="h-5 w-5 mb-3" />
            <div className="font-display font-bold">Voice Commands</div>
            <p className="text-sm text-primary-foreground/80 mt-1">
              Tap the mic to speak your orders or ask questions hands-free.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
