import { ArrowUpRight, Sparkles } from "lucide-react";

export function AIInsightsWidget({
  headline,
  insights = [],
  loading = false,
}: {
  headline?: string;
  insights?: string[];
  loading?: boolean;
}) {
  const displayHeadline = headline || "Insights will appear once your store has activity.";
  const displayInsights = insights.length > 0 ? insights : ["Create invoices and track inventory to unlock AI recommendations."];

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
        {loading ? (
          <p className="text-sm text-primary-foreground/80">Loading insights…</p>
        ) : (
          <>
            <p className="text-lg font-display font-bold leading-snug">{displayHeadline}</p>
            <div className="mt-6 space-y-3">
              {displayInsights.map((s) => (
                <div key={s} className="flex items-center gap-2 text-sm bg-white/10 backdrop-blur rounded-lg px-3 py-2">
                  <ArrowUpRight className="h-4 w-4 shrink-0" /> {s}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
