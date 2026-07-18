import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Lock, LogOut, Loader2 } from "lucide-react";

export const Route = createFileRoute("/shopilot-lock")({
  head: () => ({ meta: [{ title: "Dashboard Locked — ShopPilot AI" }] }),
  component: ShopPilotLockPage,
});

function ShopPilotLockPage() {
  const { unlockDashboard, logout, user } = useAuth();
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!user) {
      void navigate({ to: "/login" as any });
    } else if (!user.dashboardLockEnabled) {
      void navigate({ to: "/dashboard" as any });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleUnlock = async () => {
    if (pin.length !== 4) {
      toast.error("Please enter exactly 4 digits.");
      return;
    }
    setLoading(true);
    try {
      const success = await unlockDashboard(pin);
      if (success) {
        toast.success("Dashboard Unlocked Successfully");
      }
    } catch (err: any) {
      const msg = err.message || "Incorrect PIN";
      toast.error(msg);
      setPin("");
      
      if (msg.includes("30 seconds") || msg.toLowerCase().includes("attempts")) {
        setCooldown(30);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNumClick = (num: number) => {
    if (cooldown > 0 || loading) return;
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
    }
  };

  const handleBackspace = () => {
    if (cooldown > 0 || loading) return;
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (cooldown > 0 || loading) return;
    setPin("");
  };

  useEffect(() => {
    if (pin.length === 4) {
      void handleUnlock();
    }
  }, [pin]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (cooldown > 0 || loading) return;
      if (e.key >= "0" && e.key <= "9") {
        if (pin.length < 4) {
          setPin((prev) => prev + e.key);
        }
      } else if (e.key === "Backspace") {
        setPin((prev) => prev.slice(0, -1));
      } else if (e.key === "Escape") {
        setPin("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pin, cooldown, loading]);

  const handleLogoutClick = () => {
    void logout().then(() => navigate({ to: "/login" as any }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md">
      <div className="w-full max-w-sm p-6 text-center space-y-8 animate-in fade-in zoom-in-95 duration-200">
        
        <div className="space-y-2">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center animate-pulse">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            ShopPilot Locked
          </h2>
          <p className="text-xs text-muted-foreground">
            Enter your 4-digit security PIN to access the dashboard.
          </p>
        </div>

        <div className="flex justify-center gap-5 my-6">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`h-4.5 w-4.5 rounded-full border-2 transition-all duration-150 ${
                  isFilled
                    ? "bg-primary border-primary scale-110 shadow-glow"
                    : "border-muted-foreground/45 bg-transparent"
                }`}
              />
            );
          })}
        </div>

        {cooldown > 0 ? (
          <p className="text-sm font-semibold text-destructive animate-bounce">
            PIN entry disabled. Try again in {cooldown}s.
          </p>
        ) : loading ? (
          <div className="flex justify-center items-center gap-2 text-sm text-primary font-medium">
            <Loader2 className="h-4 w-4 animate-spin" /> Verifying PIN...
          </div>
        ) : (
          <div className="h-5" />
        )}

        <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              disabled={cooldown > 0 || loading}
              onClick={() => handleNumClick(num)}
              className="h-14 w-14 rounded-full border border-border/50 bg-secondary/10 hover:bg-secondary/35 text-lg font-bold text-foreground active:scale-95 transition-all flex items-center justify-center cursor-pointer disabled:opacity-40"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            disabled={cooldown > 0 || loading}
            onClick={handleClear}
            className="h-14 w-14 rounded-full border border-transparent text-xs font-semibold text-muted-foreground active:scale-95 transition-all flex items-center justify-center cursor-pointer disabled:opacity-40"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={cooldown > 0 || loading}
            onClick={() => handleNumClick(0)}
            className="h-14 w-14 rounded-full border border-border/50 bg-secondary/10 hover:bg-secondary/35 text-lg font-bold text-foreground active:scale-95 transition-all flex items-center justify-center cursor-pointer disabled:opacity-40"
          >
            0
          </button>
          <button
            type="button"
            disabled={cooldown > 0 || loading}
            onClick={handleBackspace}
            className="h-14 w-14 rounded-full border border-transparent text-xs font-semibold text-muted-foreground active:scale-95 transition-all flex items-center justify-center cursor-pointer disabled:opacity-40"
          >
            Delete
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 pt-4 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={handleLogoutClick}
            className="flex items-center gap-1.5 hover:text-foreground hover:underline transition-all cursor-pointer font-semibold"
          >
            <LogOut className="h-3.5 w-3.5" /> Logout from Session
          </button>
          <span className="text-[10px] text-muted-foreground/60 select-none">
            Forgot PIN? (Coming Soon)
          </span>
        </div>

      </div>
    </div>
  );
}
