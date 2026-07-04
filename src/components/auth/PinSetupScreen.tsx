import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { setPin } from "@/lib/api";

export function PinSetupScreen() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    pinRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^\d{4}$/.test(pin)) {
      setError("PIN must be exactly 4 digits");
      return;
    }

    if (pin !== confirmPin) {
      setError("PINs do not match");
      return;
    }

    try {
      setLoading(true);
      await setPin(pin);
      toast.success("PIN set successfully");
      void navigate({ to: "/dashboard" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to set PIN";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 mx-auto mb-4">
            <span className="text-2xl font-bold text-primary">🔐</span>
          </div>
          <h1 className="text-2xl font-display font-bold">Set Shop PIN</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create a 4-digit PIN to secure your shop dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pin">Choose 4-Digit PIN</Label>
            <Input
              ref={pinRef}
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPin">Confirm PIN</Label>
            <Input
              id="confirmPin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => {
                setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                setError(null);
              }}
              placeholder="••••"
              className="text-center text-2xl tracking-widest"
              disabled={loading}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading || pin.length !== 4 || confirmPin.length !== 4}>
            {loading ? "Setting PIN..." : "Set PIN"}
          </Button>
        </form>
      </div>
    </div>
  );
}