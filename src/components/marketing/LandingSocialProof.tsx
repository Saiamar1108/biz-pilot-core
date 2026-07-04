import { motion } from "framer-motion";
import { Star, Store } from "lucide-react";

const stats = [
  { value: "2,400+", label: "Active stores" },
  { value: "₹18Cr+", label: "Invoices processed monthly" },
  { value: "38%", label: "Average time saved on billing" },
  { value: "99.9%", label: "Platform uptime" },
];

const testimonials = [
  {
    name: "Priya Sharma",
    role: "Owner, Sharma Groceries · Vijayawada",
    quote:
      "We moved from handwritten bills to ShopPilot in a week. Pending dues and stock alerts are finally visible in one place.",
  },
  {
    name: "Rahul Kumar",
    role: "Proprietor, Kumar Kirana · Patamata",
    quote:
      "GST invoices, WhatsApp sharing, and customer history save our counter team hours every day. It feels built for real shops.",
  },
  {
    name: "Sneha Patel",
    role: "Manager, Patel Supermart · Governorpet",
    quote:
      "The analytics are practical — top products, collections, and trends without needing an accountant to explain the numbers.",
  },
];

export function LandingSocialProof() {
  return (
    <section id="testimonials" className="border-y border-border/60 bg-muted/30 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-medium uppercase tracking-wider text-primary">
              Trusted by shop owners
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Built for operators who run the business every day
            </h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
            <Store className="h-4 w-4 text-primary" />
            Trusted by 2,400+ retail and grocery stores
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border/80 bg-card px-5 py-4 shadow-sm"
            >
              <p className="font-display text-2xl font-semibold text-foreground">{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <motion.blockquote
              key={testimonial.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className="rounded-xl border border-border/80 bg-card p-6 shadow-sm"
            >
              <div className="mb-4 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-foreground">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <footer className="mt-5 border-t border-border/60 pt-4">
                <p className="text-sm font-semibold">{testimonial.name}</p>
                <p className="text-xs text-muted-foreground">{testimonial.role}</p>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
