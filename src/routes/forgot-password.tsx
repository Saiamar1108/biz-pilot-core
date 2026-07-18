import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/auth-api";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot Password — ShopPilot AI" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      const result = await requestPasswordReset(email);
      setDevToken(result.data.devResetToken || null);
      setSuccess(true);
      toast.success("Reset link generated successfully");
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Restore access to your workspace"
      subtitle="Enter your email to receive a secure, single-use link. The recovery link will remain active for 15 minutes."
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

        {!success ? (
          <>
            <div className="mb-6">
              <h2 className="font-display text-2xl font-semibold tracking-tight">Forgot Password</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your registered email address. We&apos;ll send you a secure password reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    placeholder="you@yourshop.com"
                    className="pl-9"
                  />
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Reset Link...
                  </>
                ) : (
                  "Send Reset Link"
                 )}
              </Button>

              {devToken && (
                <div className="rounded-lg border border-primary/20 p-3 text-xs bg-primary/5 space-y-1">
                  <p className="font-semibold text-primary">Development Mode Token:</p>
                  <Link
                    to={`/reset-password?token=${devToken}`}
                    className="font-mono text-foreground hover:underline break-all block"
                  >
                    http://localhost:5173/reset-password?token={devToken}
                  </Link>
                </div>
              )}

              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
                </Link>
              </div>
            </form>
          </>
        ) : (
          <div className="space-y-6 py-4 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-display font-bold text-foreground">
                Check Your Email
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-normal">
                If an account exists for <span className="font-semibold text-foreground">{email}</span>, a secure password reset link has been sent.
              </p>
            </div>

            {devToken && (
              <div className="rounded-lg border border-primary/20 p-3 text-xs bg-primary/5 space-y-1 text-left">
                <p className="font-semibold text-primary">Development Mode Token:</p>
                <Link
                  to={`/reset-password?token=${devToken}`}
                  className="font-mono text-foreground hover:underline break-all block"
                  search={{ token: devToken }}
                >
                  http://localhost:5173/reset-password?token={devToken}
                </Link>
              </div>
            )}

            <div className="pt-4 space-y-3">
              <Link to="/login">
                <Button className="w-full">Go to Login</Button>
              </Link>
              <button
                type="button"
                onClick={() => setSuccess(false)}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
              >
                Request another link
              </button>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
