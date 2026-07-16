import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState, type MouseEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthFormField } from "@/components/auth/AuthFormField";
import { AuthSubmitButton } from "@/components/auth/AuthFormExtras";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { redirectIfAuthenticated } from "@/lib/auth-guard";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  beforeLoad: () => redirectIfAuthenticated(),
  head: () => ({ meta: [{ title: "Sign in — ShopPilot AI" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const passwordRef = useRef<HTMLInputElement>(null);

  const errors = useMemo(() => {
    const next: { email?: string; password?: string } = {};
    if (touched.email && !email.trim()) next.email = "Email is required";
    else if (touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "Enter a valid email address";
    }
    if (touched.password && !password) next.password = "Password is required";
    return next;
  }, [email, password, touched]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched({ email: true, password: true });

    if (!email.trim() || !password || errors.email) return;

    try {
      setLoading(true);
      await login(email.trim(), password, rememberMe);
      toast.success("Welcome back", {
        description: "You are signed in to your shop dashboard.",
      });
      void navigate({ to: "/dashboard" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      if (message === "No account found. Create an account to continue.") {
        toast.error(message, {
          action: {
            label: "Create Account",
            onClick: () => void navigate({ to: "/register" }),
          },
        });
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Operate your shop with clarity and control"
      subtitle="Sign in to manage billing, inventory, customers, and analytics from one secure workspace built for business owners."
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
          <h2 className="font-display text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">Access your dashboard securely.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </Label>
            <div className="relative">
              <input
                ref={passwordRef}
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                disabled={loading}
                aria-invalid={Boolean(errors.password)}
                className={cn(
                  "flex h-11 w-full rounded-lg border bg-background px-3.5 pr-11 text-sm shadow-sm transition-all",
                  "placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50",
                  errors.password
                    ? "border-destructive/70 focus-visible:border-destructive focus-visible:ring-destructive/15"
                    : "border-border/80 hover:border-border",
                )}
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={(e: MouseEvent) => {
                  e.preventDefault();
                  setShowPassword((prev) => !prev);
                  // Preserve focus after toggle
                  requestAnimationFrame(() => passwordRef.current?.focus());
                }}
                disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className={cn(
                  "absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md",
                  "opacity-70 hover:opacity-100 transition-opacity duration-200",
                  "text-muted-foreground hover:text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
                  "cursor-pointer",
                )}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {errors.password ? (
              <p className="text-xs text-destructive">{errors.password}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                disabled={loading}
              />
              <Label htmlFor="rememberMe" className="text-sm font-normal text-muted-foreground">
                Remember me for 30 days
              </Label>
            </div>
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-primary hover:text-primary/80"
            >
              Forgot password?
            </Link>
          </div>

          <AuthSubmitButton loading={loading}>Sign in</AuthSubmitButton>

          <p className="pt-1 text-center text-sm text-muted-foreground">
            New to ShopPilot?{" "}
            <Link to="/register" className="font-medium text-primary hover:text-primary/80">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </AuthLayout>
  );
}
