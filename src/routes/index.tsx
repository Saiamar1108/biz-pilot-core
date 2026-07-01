import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Bot,
  Package,
  Receipt,
  BarChart3,
  Mic,
  Users,
  Shield,
  ArrowRight,
  Play,
  Star,
  Check,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ShopPilot AI — Run Your Business Smarter with AI" },
      { name: "description", content: "Automate billing, inventory, customer support, analytics, and voice orders with ShopPilot AI." },
    ],
  }),
  component: LandingPage,
});

const features = [
  { icon: Receipt, title: "Smart Billing", desc: "Generate invoices in seconds with AI-powered product matching and instant PDFs.", color: "primary" },
  { icon: Package, title: "Inventory Intelligence", desc: "Real-time stock tracking with predictive restocking alerts before you run out.", color: "emerald" },
  { icon: Bot, title: "AI Assistant", desc: "Ask questions in plain English. Get answers from your sales, orders, and customers.", color: "primary" },
  { icon: Mic, title: "Voice Orders", desc: "Take orders hands-free. Speak, confirm, done. Perfect for busy counters.", color: "emerald" },
  { icon: BarChart3, title: "Predictive Analytics", desc: "See tomorrow's trends today with AI-driven revenue and demand forecasts.", color: "primary" },
  { icon: Users, title: "Customer 360°", desc: "Every customer, every order, every insight — in one beautiful timeline.", color: "emerald" },
];

const testimonials = [
  { name: "Priya Sharma", role: "Owner, Sharma Groceries", quote: "ShopPilot cut my billing time by 70%. The AI knows my inventory better than I do.", rating: 5 },
  { name: "Marcus Chen", role: "Founder, Brew Lab Coffee", quote: "Voice orders during rush hour changed our business. It's like having a second cashier.", rating: 5 },
  { name: "Aisha Okoye", role: "CEO, Lagos Fashion Co.", quote: "The predictive analytics helped us stock the right sizes. Sales up 34% in one quarter.", rating: 5 },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 md:px-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary shadow-glow">
              <Zap className="h-5 w-5 text-primary-foreground" fill="currentColor" />
            </div>
            <span className="font-display text-lg font-bold">ShopPilot</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#testimonials" className="hover:text-foreground">Customers</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex">Sign in</Button>
            <Link to="/dashboard">
              <Button size="sm" className="gradient-primary text-primary-foreground shadow-glow">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-70" />
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 pt-20 pb-24 md:pt-32 md:pb-40 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 backdrop-blur px-4 py-1.5 text-xs font-medium mb-8 animate-fade-in">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>New: Voice-powered order taking</span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.05] animate-fade-in">
            Run Your Business <br />
            <span className="text-gradient">Smarter with AI</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in">
            Automate billing, inventory, customer support, analytics, and voice orders — all from one intelligent dashboard built for modern shops and SMEs.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 animate-fade-in">
            <Link to="/dashboard">
              <Button size="lg" className="gradient-primary text-primary-foreground shadow-glow h-12 px-6 text-base">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="h-12 px-6 text-base backdrop-blur bg-background/60">
              <Play className="mr-2 h-4 w-4" fill="currentColor" />
              Watch Demo
            </Button>
          </div>
          <div className="mt-10 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Check className="h-4 w-4 text-accent-brand" /> No credit card</div>
            <div className="flex items-center gap-2"><Check className="h-4 w-4 text-accent-brand" /> 14-day trial</div>
            <div className="hidden sm:flex items-center gap-2"><Check className="h-4 w-4 text-accent-brand" /> Cancel anytime</div>
          </div>

          {/* Hero preview card */}
          <div className="mt-16 max-w-5xl mx-auto">
            <div className="glass-card rounded-3xl p-2 shadow-elegant">
              <div className="rounded-2xl bg-linear-to-br from-primary/5 via-background to-accent-brand/5 aspect-[16/9] grid place-items-center overflow-hidden relative">
                <div className="absolute inset-0 gradient-mesh opacity-40" />
                <div className="relative grid grid-cols-3 gap-4 p-8 w-full max-w-3xl">
                  {[
                    { label: "Revenue", value: "$48,290", icon: BarChart3 },
                    { label: "Orders", value: "1,284", icon: Receipt },
                    { label: "AI Actions", value: "8,432", icon: Bot },
                  ].map((s) => (
                    <div key={s.label} className="glass-card rounded-2xl p-4 text-left">
                      <s.icon className="h-5 w-5 text-primary mb-3" />
                      <div className="text-xl md:text-2xl font-bold font-display">{s.value}</div>
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 md:py-32 max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center mb-16">
          <div className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Features</div>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight max-w-2xl mx-auto">
            Everything you need to run a modern shop
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="glass-card rounded-2xl p-6 hover:shadow-elegant transition-all duration-300 hover:-translate-y-1 group"
            >
              <div
                className={`grid h-12 w-12 place-items-center rounded-xl mb-5 ${
                  f.color === "primary" ? "bg-primary/10 text-primary" : "bg-accent-brand/10 text-accent-brand"
                } group-hover:scale-110 transition-transform`}
              >
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 bg-linear-to-b from-transparent via-secondary/40 to-transparent">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <div className="text-sm font-semibold text-accent-brand uppercase tracking-wider mb-3">Loved by shop owners</div>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
              Built for the people behind the counter
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="glass-card rounded-2xl p-6 hover:shadow-elegant transition">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-foreground leading-relaxed mb-5">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full gradient-primary grid place-items-center text-primary-foreground font-semibold text-sm">
                    {t.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 max-w-5xl mx-auto px-4 md:px-8">
        <div className="relative rounded-3xl overflow-hidden gradient-primary p-12 md:p-20 text-center shadow-glow">
          <Shield className="mx-auto h-10 w-10 text-primary-foreground/80 mb-6" />
          <h2 className="font-display text-3xl md:text-5xl font-bold text-primary-foreground max-w-2xl mx-auto">
            Ready to pilot your shop with AI?
          </h2>
          <p className="mt-4 text-primary-foreground/80 max-w-xl mx-auto">
            Join thousands of businesses saving hours every week.
          </p>
          <Link to="/dashboard" className="inline-block mt-8">
            <Button size="lg" className="bg-background text-foreground hover:bg-background/90 h-12 px-8 text-base">
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 grid md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary">
                <Zap className="h-5 w-5 text-primary-foreground" fill="currentColor" />
              </div>
              <span className="font-display text-lg font-bold">ShopPilot</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              The AI copilot for modern shops and SMEs. Sell more, work less.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold mb-3">Product</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Features</li><li>Pricing</li><li>Changelog</li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold mb-3">Company</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>About</li><li>Blog</li><li>Contact</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
          © 2026 ShopPilot AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
