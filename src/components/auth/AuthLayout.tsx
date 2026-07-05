import { motion } from "framer-motion";
import { BarChart3, Package, Receipt, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

const benefits = [
  {
    icon: Receipt,
    title: "Faster billing workflows",
    desc: "Create invoices, track payments, and share bills without leaving one workspace.",
  },
  {
    icon: Package,
    title: "Inventory that stays current",
    desc: "Stock updates automatically as you sell, with alerts before items run out.",
  },
  {
    icon: BarChart3,
    title: "Owner-friendly analytics",
    desc: "Understand sales, dues, and trends with dashboards designed for daily decisions.",
  },
  {
    icon: ShieldCheck,
    title: "Secure by default",
    desc: "Enterprise-grade sessions, shop-scoped data, and reliable access controls.",
  },
];

type AuthLayoutProps = {
  children: ReactNode;
  title: string;
  subtitle: string;
};

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
        <motion.aside
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative hidden overflow-hidden border-r border-border/80 bg-background lg:flex lg:flex-col lg:justify-between"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_20%_0%,rgba(37,99,235,0.07),transparent)] dark:bg-[radial-gradient(ellipse_70%_60%_at_20%_0%,rgba(59,130,246,0.1),transparent)]" />

          <div className="relative p-10 xl:p-12">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
                <span className="font-display text-sm font-bold">SP</span>
              </div>
              <span className="font-display text-lg font-semibold tracking-tight">
                ShopPilot AI
              </span>
            </div>

            <div className="mt-12 max-w-md">
              <h1 className="font-display text-3xl font-semibold tracking-tight xl:text-4xl">
                {title}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground xl:text-base">
                {subtitle}
              </p>
            </div>

            <div className="mt-10 space-y-4">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.08 * index }}
                  className="flex gap-3 rounded-xl border border-border/70 bg-card/80 p-4"
                >
                  <div className="rounded-lg border border-border/70 bg-muted/40 p-2 text-primary">
                    <benefit.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{benefit.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {benefit.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <p className="relative px-10 pb-10 text-xs text-muted-foreground xl:px-12">
            Built for retail and grocery operations.
          </p>
        </motion.aside>

        <div className="flex items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
