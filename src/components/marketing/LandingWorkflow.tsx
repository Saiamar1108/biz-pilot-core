import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Package, Receipt } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Receipt,
    title: "Invoice with confidence",
    desc: "Create bills from your product catalog, apply taxes correctly, and send professional invoices instantly.",
  },
  {
    step: "02",
    icon: Package,
    title: "Inventory stays accurate",
    desc: "Every sale updates stock automatically. Low inventory alerts help you reorder before shelves go empty.",
  },
  {
    step: "03",
    icon: BarChart3,
    title: "Analytics guide decisions",
    desc: "Track revenue, pending collections, and top products so you know what to stock and where cash is stuck.",
  },
];

export function LandingWorkflow() {
  return (
    <section id="workflow" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">How it works</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Invoicing, inventory, and analytics connected by design
          </h2>
          <p className="mt-4 text-muted-foreground">
            ShopPilot keeps your daily operations in sync so you spend less time reconciling data
            and more time serving customers.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {steps.map((step, index) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: index * 0.1 }}
              className="relative rounded-xl border border-border/80 bg-card p-6 shadow-sm"
            >
              {index < steps.length - 1 && (
                <ArrowRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-muted-foreground lg:block" />
              )}
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wider text-primary">
                  STEP {step.step}
                </span>
                <div className="rounded-lg border border-border/70 bg-muted/40 p-2 text-primary">
                  <step.icon className="h-4 w-4" />
                </div>
              </div>
              <h3 className="font-display text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
