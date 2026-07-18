import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Lock, LogOut, Loader2, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/shopilot-lock")({
  head: () => ({ meta: [{ title: "Dashboard Locked — ShopPilot AI" }] }),
  component: ShopPilotLockPage,
});

function ShopPilotLockPage() {
  const { unlockDashboard, logout, user, refresh } = useAuth();
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState(1);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryCooldown, setRecoveryCooldown] = useState(0);
  const [recoveryToken, setRecoveryToken] = useState("");

  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmNewPin, setShowConfirmNewPin] = useState(false);

  useEffect(() => {
    if (recoveryCooldown <= 0) return;
    const timer = setInterval(() => {
      setRecoveryCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [recoveryCooldown]);

  const handleOpenRecovery = () => {
    setShowRecovery(true);
    setRecoveryStep(1);
    setRecoveryPassword("");
    setNewPin("");
    setConfirmNewPin("");
    setRecoveryToken("");
  };

  const handleCloseRecovery = () => {
    setShowRecovery(false);
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryLoading(true);
    try {
      const res = await api.post("/auth/lock/recover/verify", {
        password: recoveryPassword,
      });
      if (res.data?.success) {
        setRecoveryToken(res.data.recoveryToken);
        setRecoveryStep(2);
        toast.success("Identity verified successfully.");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Incorrect password. Please try again.";
      toast.error(msg);
      setRecoveryPassword("");
      if (msg.includes("30 seconds") || msg.toLowerCase().includes("attempts")) {
        setRecoveryCooldown(30);
      }
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4) {
      toast.error("PIN must be exactly 4 digits.");
      return;
    }
    if (newPin !== confirmNewPin) {
      toast.error("PINs do not match.");
      return;
    }

    setRecoveryLoading(true);
    try {
      const res = await api.post("/auth/lock/recover/reset", {
        pin: newPin,
        confirmPin: confirmNewPin,
        recoveryToken,
      });
      if (res.data?.success) {
        setRecoveryStep(3);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reset PIN.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleContinueUnlock = async () => {
    localStorage.setItem("sp_dashboard_unlocked", "true");
    localStorage.setItem("sp_last_activity", Date.now().toString());
    await refresh();
    const startPage = localStorage.getItem("sp_start_page") || "/dashboard";
    void navigate({ to: startPage as any });
  };

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
          <button
            type="button"
            onClick={handleOpenRecovery}
            className="text-[10.5px] font-semibold text-muted-foreground/80 hover:text-foreground hover:underline transition-all cursor-pointer"
          >
            Forgot PIN?
          </button>
        </div>

      </div>

      {/* PIN Recovery Modal */}
      {showRecovery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-lg animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 bg-card border border-border/50 rounded-2xl shadow-xl space-y-6 animate-in zoom-in-95 duration-200 text-left">
            
            {recoveryStep === 1 && (
              <form onSubmit={handleVerifyPassword} className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-foreground">Verify Your Identity</h3>
                  <p className="text-xs text-muted-foreground">
                    To protect your business data, please verify your account password before resetting your ShopPilot PIN.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Account Password</label>
                  <div className="relative">
                    <input
                      type={showRecoveryPassword ? "text" : "password"}
                      value={recoveryPassword}
                      onChange={(e) => setRecoveryPassword(e.target.value)}
                      required
                      disabled={recoveryCooldown > 0 || recoveryLoading}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors pr-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Enter account password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRecoveryPassword(!showRecoveryPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showRecoveryPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {recoveryCooldown > 0 ? (
                  <p className="text-xs font-semibold text-destructive animate-bounce">
                    Verification disabled. Try again in {recoveryCooldown}s.
                  </p>
                ) : recoveryLoading ? (
                  <div className="flex items-center gap-2 text-xs text-primary">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying Password...
                  </div>
                ) : null}

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseRecovery}
                    disabled={recoveryLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={recoveryLoading || recoveryCooldown > 0 || !recoveryPassword}
                  >
                    Verify Password
                  </Button>
                </div>
              </form>
            )}

            {recoveryStep === 2 && (
              <form onSubmit={handleResetPin} className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-foreground">Create New ShopPilot PIN</h3>
                  <p className="text-xs text-muted-foreground">
                    Define a new secure 4-digit PIN for your business dashboard.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">New 4-digit PIN</label>
                    <div className="relative">
                      <input
                        type={showNewPin ? "text" : "password"}
                        maxLength={4}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                        required
                        disabled={recoveryLoading}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors pr-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder="••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPin(!showNewPin)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showNewPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Confirm New PIN</label>
                    <div className="relative">
                      <input
                        type={showConfirmNewPin ? "text" : "password"}
                        maxLength={4}
                        value={confirmNewPin}
                        onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, ""))}
                        required
                        disabled={recoveryLoading}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors pr-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder="••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmNewPin(!showConfirmNewPin)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showConfirmNewPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {newPin && (
                  <div className="text-[11px] space-y-1 p-2 rounded bg-secondary/30 border border-border/40 text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span>{newPin.length === 4 ? "✓" : "○"}</span>
                      <span>Exactly 4 digits</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>{newPin && newPin === confirmNewPin ? "✓" : "○"}</span>
                      <span>PINs match</span>
                    </div>
                  </div>
                )}

                {recoveryLoading && (
                  <div className="flex items-center gap-2 text-xs text-primary">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving PIN...
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseRecovery}
                    disabled={recoveryLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={recoveryLoading || newPin.length !== 4 || newPin !== confirmNewPin}
                  >
                    Reset PIN
                  </Button>
                </div>
              </form>
            )}

            {recoveryStep === 3 && (
              <div className="space-y-6 text-center py-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center animate-bounce">
                  <span className="text-xl">✅</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-display font-bold text-foreground">
                    ShopPilot PIN Reset Successfully
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Your dashboard has been secured with your new PIN.
                  </p>
                </div>
                <div className="pt-2">
                  <Button onClick={handleContinueUnlock} className="w-full animate-pulse">
                    Continue
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
