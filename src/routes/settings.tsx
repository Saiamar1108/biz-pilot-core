import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { changePassword } from "@/lib/api";
import { requireAuth } from "@/lib/auth-guard";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Settings — ShopPilot AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [securityMessage, setSecurityMessage] = useState("");
  const [securityError, setSecurityError] = useState("");

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Password strength validation
    const newPassword = securityForm.newPassword;
    if (newPassword.length < 8) {
      setSecurityError("Password must be at least 8 characters long.");
      toast.error("Password too short");
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setSecurityError("Password must contain at least one uppercase letter.");
      toast.error("Password must contain uppercase letter");
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      setSecurityError("Password must contain at least one lowercase letter.");
      toast.error("Password must contain lowercase letter");
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setSecurityError("Password must contain at least one number.");
      toast.error("Password must contain number");
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      setSecurityError("Password must contain at least one special character.");
      toast.error("Password must contain special character");
      return;
    }
    
    setSavingSecurity(true);
    setSecurityMessage("");
    setSecurityError("");

    try {
      await changePassword(securityForm);
      setSecurityMessage("Password changed successfully. Please log in again.");
      setSecurityForm({ currentPassword: "", newPassword: "" });
      toast.success("Password changed successfully");
    } catch (err) {
      setSecurityError("Failed to change password. Please check your current password.");
      toast.error("Failed to change password");
    } finally {
      setSavingSecurity(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account security</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Change Password</h2>
          
          {securityMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm">
              {securityMessage}
            </div>
          )}
          
          {securityError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
              {securityError}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="Enter current password"
                value={securityForm.currentPassword}
                onChange={(e) => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
                required
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Min 8 characters"
                value={securityForm.newPassword}
                onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                required
                minLength={8}
                className="mt-1"
              />
            </div>

            <Button type="submit" disabled={savingSecurity}>
              {savingSecurity ? "Changing..." : "Change Password"}
            </Button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
