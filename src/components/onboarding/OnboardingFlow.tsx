import React, { useState, useEffect } from "react";
import { Joyride, CallBackProps, STATUS, Step, TooltipRenderProps } from "react-joyride";
import { Zap, Check, Sparkles, ArrowRight, ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

type TourStep = {
  target: string;
  title: string;
  content: string;
  tip: string;
  placement?: "top" | "bottom" | "left" | "right" | "auto" | "center";
};

const TOUR_STEPS: TourStep[] = [
  {
    target: "#tour-nav-dashboard",
    title: "Unified Business Control",
    content: "Monitor your store's total revenue, profit margins, active customer counts, and real-time alerts in one place.",
    tip: "AI monitors business performance.",
    placement: "right",
  },
  {
    target: "#tour-nav-billing",
    title: "Instant UPI Invoicing",
    content: "Create digital invoices, generate dynamic payment QR codes, and collect customer dues with zero transaction fees.",
    tip: "Generate invoices and accept UPI payments.",
    placement: "right",
  },
  {
    target: "#tour-nav-inventory",
    title: "Predictive Inventory",
    content: "Keep track of stock levels, analyze profit margins per product, and prevent stockouts before they affect sales.",
    tip: "AI predicts stock shortages.",
    placement: "right",
  },
  {
    target: "#tour-nav-customers",
    title: "Customer Loyalty & CRM",
    content: "Maintain buyer profiles, track credit balances, and build relationships that drive repeat purchases.",
    tip: "Track loyalty and pending collections.",
    placement: "right",
  },
  {
    target: "#tour-nav-assistant",
    title: "Conversational Operations",
    content: "Interact with your AI assistant using plain English to query sales numbers, check stock, or create draft invoices.",
    tip: "AI assistant is ready to help.",
    placement: "right",
  },
  {
    target: "#tour-nav-analytics",
    title: "Revenue Insights",
    content: "Visualize weekly collections, identify payment bottlenecks, and check long-term growth patterns.",
    tip: "AI explains revenue trends.",
    placement: "right",
  },
  {
    target: "#tour-nav-purchase-orders",
    title: "Supplier Procurement",
    content: "Draft purchase orders, manage wholesale costs, and synchronize inventory incoming flows with supplier bills.",
    tip: "AI recommends what to reorder.",
    placement: "right",
  },
  {
    target: "#tour-nav-settings",
    title: "Business Configuration",
    content: "Configure tax rates, manage company contact details, and input your UPI ID to receive payouts directly.",
    tip: "Configure your business profile.",
    placement: "right",
  },
  {
    target: "#tour-revenue-card",
    title: "Real-time Cash Flow",
    content: "Track your actual paid collections dynamically throughout the day, separate from outstanding credits.",
    tip: "AI aggregates daily earnings instantly.",
    placement: "bottom",
  },
  {
    target: "#tour-ai-insights",
    title: "Proactive Recommendations",
    content: "Act on intelligence compiled by the system, covering low-stock items, purchase alerts, and customer habits.",
    tip: "Get tailored stock and pricing strategies.",
    placement: "left",
  },
  {
    target: "#tour-new-invoice",
    title: "Rapid Checkout",
    content: "Create a new checkout session instantly from any overview context to record cash or UPI sales.",
    tip: "Pre-fills buyer details using historical patterns.",
    placement: "bottom",
  },
];

function TourTooltip({
  index,
  step,
  backProps,
  primaryProps,
  skipProps,
  tooltipProps,
  size,
}: TooltipRenderProps) {
  const tip = step.data?.tip;
  return (
    <div
      {...tooltipProps}
      className="max-w-[340px] rounded-2xl border border-border/80 bg-card p-5 shadow-elegant dark:shadow-[0_16px_40px_-24px_rgba(0,0,0,0.65)] focus:outline-none relative text-foreground"
    >
      <button
        {...skipProps}
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        aria-label="Skip Tour"
      >
        <X className="h-4 w-4" />
      </button>

      {step.title && (
        <h3 className="font-display text-base font-bold tracking-tight text-foreground mb-1.5 pr-6">
          {step.title}
        </h3>
      )}

      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        {step.content}
      </p>

      {tip && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-foreground dark:border-primary/30">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-primary block mb-0.5">AI Tip</span>
            {tip}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-2 pt-2.5 border-t border-border/50">
        <span className="text-xs text-muted-foreground font-semibold">
          {index + 1} of {size}
        </span>

        <div className="flex items-center gap-2">
          {index > 0 && (
            <Button
              {...backProps}
              variant="ghost"
              size="sm"
              className="text-xs font-semibold px-2.5 h-8 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Back
            </Button>
          )}
          <Button
            {...primaryProps}
            size="sm"
            className="gradient-primary text-primary-foreground shadow-glow text-xs font-semibold px-3.5 h-8 cursor-pointer"
          >
            {index === size - 1 ? "Finish" : "Next"}
            {index < size - 1 && <ArrowRight className="h-3.5 w-3.5 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [stage, setStage] = useState<"welcome" | "tour" | "success" | "none">("none");

  useEffect(() => {
    if (isAuthenticated) {
      const completed = localStorage.getItem("sp_onboarding_completed") === "true";
      if (!completed) {
        setStage("welcome");
      }
    } else {
      setStage("none");
    }
  }, [isAuthenticated]);

  const handleStartTour = () => {
    setStage("tour");
  };

  const handleSkipTour = () => {
    setStage("success");
  };

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finishedStatuses.includes(status)) {
      setStage("success");
    }
  };

  const runHighlights = () => {
    const elements = [
      { id: "tour-revenue-card", duration: 900 },
      { id: "tour-ai-insights", duration: 900 },
      { id: "tour-new-invoice", duration: 900 },
    ];
    
    let delay = 0;
    elements.forEach((item) => {
      setTimeout(() => {
        const el = document.getElementById(item.id);
        if (el) {
          el.classList.add("ring-2", "ring-primary", "scale-[1.015]", "shadow-glow", "transition-all", "duration-500", "z-10");
          setTimeout(() => {
            el.classList.remove("ring-2", "ring-primary", "scale-[1.015]", "shadow-glow", "z-10");
          }, item.duration);
        }
      }, delay);
      delay += item.duration + 200;
    });
  };

  const handleCompleteOnboarding = (action: "explore" | "invoice") => {
    localStorage.setItem("sp_onboarding_completed", "true");
    setStage("none");
    
    toast.success("Welcome to ShopPilot AI 👋", {
      description: "Your demo workspace is ready. Start by creating an invoice or explore AI insights.",
      duration: 5000,
    });

    if (action === "invoice") {
      void navigate({ to: "/billing" });
    } else {
      void navigate({ to: "/dashboard" });
      setTimeout(() => {
        runHighlights();
      }, 200);
    }
  };

  const joyrideSteps: Step[] = TOUR_STEPS.map((s) => ({
    target: s.target,
    title: s.title,
    content: s.content,
    placement: s.placement,
    disableBeacon: true,
    disableOverlayClose: true,
    spotlightClicks: false,
    data: { tip: s.tip },
  }));

  if (stage === "none") return null;

  return (
    <div className="relative">
      <AnimatePresence>
        {stage === "welcome" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm"
              onClick={handleSkipTour}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border/80 bg-card p-6 shadow-elegant sm:p-10 z-10 flex flex-col items-center text-center"
            >
              <div className="grid h-14 w-14 place-items-center rounded-2xl gradient-primary shadow-glow mb-6">
                <Zap className="h-7 w-7 text-primary-foreground" fill="currentColor" />
              </div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Welcome to ShopPilot AI
              </h2>
              <p className="mt-1 text-sm font-semibold text-primary">
                Your AI Retail Operating System
              </p>
              <p className="mt-3.5 text-sm text-muted-foreground leading-relaxed max-w-xs">
                Manage inventory, billing, customers, analytics, purchasing, and AI-powered business insights from one intelligent platform.
              </p>

              {/* Feature Chips */}
              <div className="grid grid-cols-2 gap-2.5 w-full mt-6">
                {[
                  "AI Billing",
                  "Smart Inventory",
                  "Business Analytics",
                  "AI Copilot",
                ].map((chip) => (
                  <div
                    key={chip}
                    className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/35 px-3 py-2 text-xs font-semibold text-foreground text-left transition-all hover:bg-secondary/50"
                  >
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent-brand/10 text-accent-brand">
                      <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                    </div>
                    <span>{chip}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col w-full gap-2.5">
                <Button
                  onClick={handleStartTour}
                  className="gradient-primary text-primary-foreground shadow-glow h-11 w-full font-semibold cursor-pointer"
                >
                  Start Tour
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleSkipTour}
                  className="h-11 w-full text-muted-foreground hover:text-foreground font-semibold cursor-pointer"
                >
                  Skip for now
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {stage === "success" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border/80 bg-card p-6 shadow-elegant sm:p-8 z-10 flex flex-col items-center text-center"
            >
              <div className="grid h-12 w-12 place-items-center rounded-full bg-accent-brand/10 text-accent-brand mb-4">
                <Check className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
                Your Demo Store is Ready
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your AI-powered retail operating system is fully configured.
              </p>

              {/* Checklist */}
              <div className="w-full space-y-3 my-6 text-left border border-border/60 rounded-2xl p-4.5 bg-secondary/35">
                {[
                  "10 Demo Products Loaded",
                  "10 Demo Customers Loaded",
                  "Demo Invoices Ready",
                  "Analytics Ready",
                  "AI Assistant Ready",
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-brand/10 text-accent-brand">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </div>
                    <span className="font-medium text-foreground">{item}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col w-full gap-2.5">
                <Button
                  onClick={() => handleCompleteOnboarding("explore")}
                  className="gradient-primary text-primary-foreground shadow-glow h-11 w-full font-semibold cursor-pointer"
                >
                  Explore Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleCompleteOnboarding("invoice")}
                  className="h-11 w-full font-semibold cursor-pointer"
                >
                  Create First Invoice
                </Button>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                Everything is preloaded so you can explore the platform immediately.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {stage === "tour" && (
        <Joyride
          steps={joyrideSteps}
          run={true}
          continuous={true}
          showSkipButton={true}
          disableOverlayClose={true}
          tooltipComponent={TourTooltip}
          callback={handleJoyrideCallback}
          styles={{
            options: {
              arrowColor: "var(--color-card)",
              backgroundColor: "var(--color-card)",
              overlayColor: "rgba(0, 0, 0, 0.45)",
              primaryColor: "var(--color-primary)",
              textColor: "var(--color-foreground)",
              zIndex: 100,
            },
            spotlight: {
              borderRadius: 12,
            },
          }}
        />
      )}
    </div>
  );
}
