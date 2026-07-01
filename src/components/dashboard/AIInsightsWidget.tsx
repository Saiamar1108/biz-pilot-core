import { ArrowUpRight, Sparkles } from "lucide-react";

const defaultInsights = [
  "Restock 8 low-stock items",
  "Send reminder to 24 customers",
  "Peak hour: 6PM–8PM Fri–Sun",
];

export function AIInsightsWidget({
  headline = "Your weekend sales spiked 34% — restock Basmati Rice and Cola before Friday.",
  insights = defaultInsights,
}: {
  headline?: string;
  insights?: string[];
}) {
  return (
    <div className="rounded-2xl p-6 bg-linear-to-br from-primary via-primary to-primary-glow text-primary-foreground shadow-glow relative overflow-hidden h-full">
      <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/20 backdrop-blur">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="text-sm font-semibold">AI Insights</div>
        </div>
        <p className="text-lg font-display font-bold leading-snug">{headline}</p>
        <div className="mt-6 space-y-3">
          {insights.map((s) => (
            <div key={s} className="flex items-center gap-2 text-sm bg-white/10 backdrop-blur rounded-lg px-3 py-2">
              <ArrowUpRight className="h-4 w-4 shrink-0" /> {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
