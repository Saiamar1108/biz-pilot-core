import { motion } from "framer-motion";
import { Store } from "lucide-react";

const highlights = [
  { title: "Billing", description: "Create invoices and share them with customers." },
  { title: "Inventory", description: "Track products, stock levels, and restock needs." },
  { title: "Analytics", description: "Review sales, collections, and business trends." },
];

export function LandingSocialProof() {
  return (
    <section id="overview" className="border-y border-border/60 bg-muted/30 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-medium uppercase tracking-wider text-primary">
              Business workspace
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Built for operators who run the business every day
            </h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
            <Store className="h-4 w-4 text-primary" />
            Tools for retail and grocery operations
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-10 grid gap-5 md:grid-cols-3"
        >
          {highlights.map((highlight) => (
            <div
              key={highlight.title}
              className="rounded-xl border border-border/80 bg-card p-6 shadow-sm"
            >
              <p className="text-sm font-semibold">{highlight.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {highlight.description}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
