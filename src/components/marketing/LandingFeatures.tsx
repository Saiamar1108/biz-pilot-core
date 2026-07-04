import { motion } from "framer-motion";
import {
  BarChart3,
  Bot,
  Package,
  Receipt,
  ShieldCheck,
  Users,
} from "lucide-react";

const features = [
  {
    icon: Receipt,
    title: "Professional invoicing",
    desc: "Create GST-ready invoices, share on WhatsApp, and track payment status without manual follow-ups.",
  },
  {
    icon: Package,
    title: "Inventory you can trust",
    desc: "Monitor stock levels, catch low inventory early, and keep billing aligned with what is actually on shelf.",
  },
  {
    icon: BarChart3,
    title: "Clear business analytics",
    desc: "See sales trends, pending dues, and product performance in dashboards designed for owners, not analysts.",
  },
  {
    icon: Users,
    title: "Customer records in one place",
    desc: "Maintain customer history, dues, and contact details so your team can serve repeat buyers confidently.",
  },
  {
    icon: Bot,
    title: "AI assistant for daily decisions",
    desc: "Ask practical questions about sales, stock, and invoices in plain language and get actionable answers.",
  },
  {
    icon: ShieldCheck,
    title: "Secure multi-store ready",
    desc: "Enterprise-grade authentication and shop-scoped data keep each business isolated and protected.",
  },
];

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

export function LandingFeatures() {
  return (
    <section id="features" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            Features
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Everything a modern shop needs to operate with confidence
          </h2>
          <p className="mt-4 text-muted-foreground">
            Practical tools for owners who care about accuracy, speed, and control —
            not flashy dashboards with no business value.
          </p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.article
              key={feature.title}
              variants={item}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl border border-border/80 bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 inline-flex rounded-lg border border-border/70 bg-muted/40 p-2.5 text-primary">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.desc}
              </p>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
