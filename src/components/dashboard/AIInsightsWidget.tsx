import { ArrowUpRight, Sparkles, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { useState } from "react";

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
  const [collapsed, setCollapsed] = useState(false);

  const getPriorityIcon = (index: number) => {
    if (index === 0) return <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-200" />;
    if (index === 1) return <Info className="h-4 w-4 shrink-0 text-blue-200" />;
    return <CheckCircle className="h-4 w-4 shrink-0 text-green-200" />;
  };

  const getPriorityLabel = (index: number) => {
    if (index === 0) return "URGENT";
    if (index === 1) return "SUGGESTION";
    return "INFO";
  };

  const getPriorityClass = (index: number) => {
    if (index === 0) return "bg-yellow-300/20 border-yellow-200/30";
    if (index === 1) return "bg-blue-300/20 border-blue-200/30";
    return "bg-green-300/20 border-green-200/30";
  };

  return (
    <div className="rounded-2xl p-6 bg-linear-to-br from-primary via-primary to-primary-glow text-primary-foreground shadow-glow relative overflow-hidden h-full transition-all duration-300">
      <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/20 backdrop-blur">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="text-base font-semibold">AI Insights</div>
          </div>
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="text-white/70 hover:text-white transition-colors"
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-primary-foreground/80">Loading insights…</p>
        ) : (
          <>
            <p className="text-xl font-display font-bold leading-snug">{displayHeadline}</p>
            {!collapsed && (
              <div className="mt-6 space-y-3">
                {displayInsights.map((s, i) => (
                  <div key={s} className={`flex items-start gap-3 text-sm bg-white/10 backdrop-blur rounded-xl px-4 py-3 border ${getPriorityClass(i)}`}>
                    {getPriorityIcon(i)}
                    <div className="flex-1">
                      <div className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">{getPriorityLabel(i)}</div>
                      <div className="text-sm leading-relaxed">{s}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
