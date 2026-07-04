import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthFormField } from "@/components/auth/AuthFormField";
import { Button } from "@/components/ui/button";
import {
  AuthDivider,
  AuthSubmitButton,
  GoogleSignInButton,
} from "@/components/auth/AuthFormExtras";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { redirectIfAuthenticated } from "@/lib/auth-guard";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { seedDemoData } from "@/lib/api";
import { emitDataRefresh } from "@/lib/live-refresh";

export const Route = createFileRoute("/register")({
  beforeLoad: () => redirectIfAuthenticated(),
  head: () => ({ meta: [{ title: "Create account — ShopPilot AI" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoChoiceOpen, setDemoChoiceOpen] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
  });

  const errors = useMemo(() => {
    const next: { name?: string; email?: string; password?: string } = {};
    if (touched.name && !name.trim()) next.name = "Full name is required";
    if (touched.email && !email.trim()) next.email = "Email is required";
    else if (touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "Enter a valid email address";
    }
    if (touched.password && password.length < 8) {
      next.password = "Password must be at least 8 characters";
    }
    return next;
  }, [name, email, password, touched]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched({ name: true, email: true, password: true });

    if (!name.trim() || !email.trim() || password.length < 8 || errors.email) return;

    try {
      setLoading(true);
      await register({ name: name.trim(), email: email.trim(), password, shopName: shopName.trim() });
      toast.success("Account created", {
        description: "Your shop workspace is ready.",
      });
      setDemoChoiceOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Start with software your team will actually use"
      subtitle="Create your account to manage invoicing, inventory, and business insights in one professional platform."
    >
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-[0_16px_40px_-24px_rgba(15,23,42,0.18)] sm:p-8 dark:shadow-[0_16px_40px_-24px_rgba(0,0,0,0.45)]">
        <div className="mb-6 lg:hidden">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <span className="font-display text-sm font-bold">SP</span>
            </div>
            <span className="font-display text-base font-semibold">ShopPilot AI</span>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Create account</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            First signup claims existing store data. New shops start fresh.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthFormField
            label="Full name"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
            error={errors.name}
            placeholder="Your name"
            disabled={loading}
          />

          <AuthFormField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
            error={errors.email}
            placeholder="you@yourshop.com"
            disabled={loading}
          />

          <AuthFormField
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
            error={errors.password}
            hint={!errors.password ? "Use at least 8 characters" : undefined}
            placeholder="Create a password"
            disabled={loading}
          />

          <AuthFormField
            label="Shop name"
            name="shopName"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            placeholder="Optional — defaults to your name's shop"
            disabled={loading}
          />

          <AuthSubmitButton loading={loading}>Create account</AuthSubmitButton>

          <AuthDivider />

          <GoogleSignInButton disabled={loading} />

          <p className="pt-1 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:text-primary/80">
              Sign in
            </Link>
          </p>
        </form>
      </div>
      <Dialog open={demoChoiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start with Demo Store Data?</DialogTitle>
            <DialogDescription>
              Add sample products, customers, and invoices to explore ShopPilot with real database records, or start with a clean store.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              disabled={seedingDemo}
              onClick={() => {
                setDemoChoiceOpen(false);
                void navigate({ to: "/dashboard" });
              }}
            >
              Start Fresh
            </Button>
            <Button
              type="button"
              disabled={seedingDemo}
              onClick={async () => {
                try {
                  setSeedingDemo(true);
                  const result = await seedDemoData();
                  emitDataRefresh();
                  toast.success(result.seeded ? "Demo data added" : "Demo data already exists");
                  setDemoChoiceOpen(false);
                  void navigate({ to: "/dashboard" });
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Unable to seed demo data");
                } finally {
                  setSeedingDemo(false);
                }
              }}
            >
              {seedingDemo ? "Adding Demo Data..." : "Start with Demo Data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthLayout>
  );
}
