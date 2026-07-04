import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const footerLinks = {
  Product: ["Features", "Pricing", "Integrations", "Changelog"],
  Company: ["About", "Blog", "Careers", "Contact"],
  Legal: ["Privacy", "Terms", "Security"],
};

export function LandingFooter() {
  return (
    <footer className="border-t border-border/80 bg-card/50">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="rounded-2xl border border-border/80 bg-background p-8 md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                Ready to simplify shop operations?
              </h2>
              <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                Start with invoicing and inventory today. Add analytics and AI
                assistance as your team grows.
              </p>
            </div>
            <Link to="/register">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-12 grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Link to="/" className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <span className="font-display text-sm font-bold">SP</span>
              </div>
              <span className="font-display text-base font-semibold">ShopPilot AI</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Professional business software for retail, grocery, and SME operators
              who need reliability over hype.
            </p>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <span className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {link}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 ShopPilot AI. All rights reserved.</p>
          <p>Built for business owners who value clarity, control, and trust.</p>
        </div>
      </div>
    </footer>
  );
}
