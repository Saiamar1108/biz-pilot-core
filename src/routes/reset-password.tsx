import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetAccountPassword } from "@/lib/auth-api";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  head: () => ({ meta: [{ title: "Reset Password — ShopPilot AI" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // 0 = Form, 1 = Success, 2 = Expired/Invalid
  const [resetState, setResetState] = useState(token ? 0 : 2);

  // Live password validation rules
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const isFormValid =
    checks.length &&
    checks.uppercase &&
    checks.lowercase &&
    checks.number &&
    checks.special &&
    password === confirm &&
    password.length > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      setResetState(2);
      return;
    }

    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      await resetAccountPassword(token, password);
      toast.success("Password updated successfully");
      setResetState(1);
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message || "Reset failed";
      toast.error(errMsg);
      if (
        errMsg.toLowerCase().includes("expired") ||
        errMsg.toLowerCase().includes("invalid") ||
        errMsg.toLowerCase().includes("token")
      ) {
        setResetState(2);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Secure your account credentials"
      subtitle="Define a strong, unique password to protect your ShopPilot store dashboard."
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

        {resetState === 0 && (
          <>
            <div className="mb-6">
              <h2 className="font-display text-2xl font-semibold tracking-tight">Create New Password</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Define a new secure password containing numbers, letters, and special characters.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pr-10"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    disabled={loading}
                    className="pr-10"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Real-time strength indicator checklist */}
              <div className="rounded-lg border border-border/40 p-3 text-xs space-y-1.5 bg-muted/20">
                <p className="font-semibold text-muted-foreground mb-1">Password requirements:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className={checks.length ? "text-emerald-500 font-bold" : "text-muted-foreground/50"}>
                      {checks.length ? "✓" : "○"}
                    </span>
                    <span className={checks.length ? "text-foreground" : ""}>Min 8 characters</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className={checks.uppercase ? "text-emerald-500 font-bold" : "text-muted-foreground/50"}>
                      {checks.uppercase ? "✓" : "○"}
                    </span>
                    <span className={checks.uppercase ? "text-foreground" : ""}>One uppercase letter</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className={checks.lowercase ? "text-emerald-500 font-bold" : "text-muted-foreground/50"}>
                      {checks.lowercase ? "✓" : "○"}
                    </span>
                    <span className={checks.lowercase ? "text-foreground" : ""}>One lowercase letter</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className={checks.number ? "text-emerald-500 font-bold" : "text-muted-foreground/50"}>
                      {checks.number ? "✓" : "○"}
                    </span>
                    <span className={checks.number ? "text-foreground" : ""}>One number</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className={checks.special ? "text-emerald-500 font-bold" : "text-muted-foreground/50"}>
                      {checks.special ? "✓" : "○"}
                    </span>
                    <span className={checks.special ? "text-foreground" : ""}>One special character</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className={password && password === confirm ? "text-emerald-500 font-bold" : "text-muted-foreground/50"}>
                      {password && password === confirm ? "✓" : "○"}
                    </span>
                    <span className={password && password === confirm ? "text-foreground" : ""}>Passwords match</span>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading || !isFormValid}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          </>
        )}

        {resetState === 1 && (
          <div className="space-y-6 py-4 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-display font-bold text-foreground">
                Password Reset Successfully
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your password has been updated successfully.
              </p>
            </div>

            <div className="pt-4">
              <Link to="/login">
                <Button className="w-full">Go to Login</Button>
              </Link>
            </div>
          </div>
        )}

        {resetState === 2 && (
          <div className="space-y-6 py-4 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center animate-bounce">
              <XCircle className="h-6 w-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-display font-bold text-foreground">
                Password Reset Link Expired
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This link has expired or has already been used.
              </p>
            </div>

            <div className="pt-4">
              <Link to="/forgot-password">
                <Button className="w-full">Request New Reset Link</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
