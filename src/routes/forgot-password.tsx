import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/auth-api";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot Password — ShopPilot AI" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      const result = await requestPasswordReset(email);
      setDevToken(result.devResetToken || null);
      toast.success(result.message || "Reset instructions sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5 rounded-2xl border p-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Forgot password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your email and we&apos;ll send reset instructions.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </Button>

        {devToken && (
          <div className="rounded-lg border p-3 text-xs bg-muted/40">
            Dev reset token: <code>{devToken}</code>
          </div>
        )}

        <Link to="/login" className="text-sm text-primary hover:underline">
          Back to login
        </Link>
      </form>
    </div>
  );
}
