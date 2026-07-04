import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardMockup } from "@/components/marketing/DashboardMockup";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] },
  }),
};

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(37,99,235,0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.12),transparent)]" />

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 md:px-8 md:pb-28 md:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mb-6 inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground"
          >
            Built for retail, grocery, and SME operators
          </motion.div>

          <motion.h1
            custom={0.05}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl md:leading-[1.08]"
          >
            Run billing, inventory, and analytics from one reliable dashboard
          </motion.h1>

          <motion.p
            custom={0.1}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg"
          >
            ShopPilot AI helps business owners invoice faster, track stock accurately,
            and understand cash flow without switching between spreadsheets and apps.
          </motion.p>

          <motion.div
            custom={0.15}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Link to="/register">
              <Button
                size="lg"
                className="h-11 bg-primary px-6 text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                Start free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="h-11 border-border bg-card px-6 shadow-sm hover:bg-muted/50"
              asChild
            >
              <a href="mailto:hello@shoppilot.ai?subject=Book%20a%20ShopPilot%20demo">
                <CalendarDays className="h-4 w-4" />
                Book demo
              </a>
            </Button>
          </motion.div>

          <motion.p
            custom={0.2}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mt-5 text-sm text-muted-foreground"
          >
            No credit card required · Setup in minutes · Cancel anytime
          </motion.p>
        </div>

        <div className="mt-14 md:mt-16">
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}
