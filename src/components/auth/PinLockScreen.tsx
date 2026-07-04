import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { verifyPin, setPin } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-store";

const PIN_KEY = "sp_pin_skipped";

export function hasSkippedPin(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(PIN_KEY) === "true";
}

export function markPinSkipped(): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(PIN_KEY, "true");
  }
}

export function PinLockScreen() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^\d{4}$/.test(pin)) {
      setError("Enter a valid 4-digit PIN");
      return;
    }

    try {
      setLoading(true);
      await verifyPin(pin);
      markPinSkipped();
      toast.success("PIN verified");
      void navigate({ to: "/dashboard" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "PIN verification failed";
      setError(message);
      toast.error(message);
      setPin("");
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 mx-auto mb-4">
            <span className="text-2xl font-bold text-primary">🔒</span>
          </div>
          <h1 className="text-2xl font-display font-bold">Enter Shop PIN</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your 4-digit PIN to access your dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pin">4-Digit PIN</Label>
            <Input
              ref={inputRef}
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                setError(null);
              }}
              placeholder="••••"
              className="text-center text-2xl tracking-widest"
              disabled={loading}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading || pin.length !== 4}>
            {loading ? "Verifying..." : "Unlock Dashboard"}
          </Button>
        </form>
      </div>
    </div>
  );
}