import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import {
  getSettings,
  resetDemoData,
  updateBusiness,
  updateBusinessLogo,
  updateNotifications,
  updateProfile,
  updateProfileImage,
  updateTaxSettings,
  type BusinessProfile,
  type NotificationSettings,
  type SettingsProfile,
} from "@/lib/api";
import { requireAuth } from "@/lib/auth-guard";
import { emitDataRefresh } from "@/lib/live-refresh";
import { useTheme } from "@/contexts/ThemeContext";
import { changePassword, setPassword, setPin, verifyPin } from "@/lib/api";
import { Moon, Sun } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Settings — ShopPilot AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<SettingsProfile>({
    fullName: "",
    email: "",
    phone: "",
    timezone: "Asia/Kolkata",
    imageDataUrl: "",
  });
  const [notifications, setNotifications] = useState<NotificationSettings>({
    invoiceNotifications: true,
    stockAlerts: true,
    paymentReminders: true,
    aiInsightsAlerts: false,
  });
  const [business, setBusiness] = useState<BusinessProfile>({
    storeName: "",
    ownerName: "",
    gstNumber: "",
    phone: "",
    email: "",
    address: "",
    category: "",
    logoDataUrl: "",
    upiId: "",
  });
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxMode, setTaxMode] = useState<"cgst-sgst" | "igst" | "custom" | "standard" | "none">("cgst-sgst");
  const [taxRate, setTaxRate] = useState<number>(0);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(10);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [resettingDemo, setResettingDemo] = useState(false);
  const [demoSeeded, setDemoSeeded] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [securityForm, setSecurityForm] = useState({
    currentPin: "",
    newPin: "",
    confirmPin: "",
    currentPassword: "",
    newPassword: "",
  });
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [securityMessage, setSecurityMessage] = useState("");
  const [securityError, setSecurityError] = useState("");
  const hasGoogleAuth = profile.email.includes("google") || false;

  useEffect(() => {
    let active = true;

    getSettings()
      .then((settings) => {
        if (!active) return;
        setProfile(settings.profile);
        setBusiness(settings.business);
        setNotifications(settings.notifications);
        setTaxEnabled(settings.taxEnabled);
        setTaxMode(settings.taxMode);
        setTaxRate(settings.taxRate);
        setLowStockThreshold(settings.lowStockThreshold);
        setDemoSeeded(settings.demoSeeded);
      })
      .catch((err) => {
        if (!active) return;
        setError(getErrorMessage(err, "Unable to load settings"));
      });

    return () => {
      active = false;
    };
  }, []);

  const initials = getInitials(profile.fullName);

  const setProfileField = (field: keyof SettingsProfile, value: string) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };
  const setBusinessField = (field: keyof BusinessProfile, value: string) => {
    setBusiness((current) => ({ ...current, [field]: value }));
  };

  const saveProfile = async () => {
    try {
      setSavingProfile(true);
      setError("");
      setMessage("");
      const settings = await updateProfile({
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        timezone: profile.timezone,
      });
      setProfile(settings.profile);
      setMessage("Profile saved");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save profile"));
    } finally {
      setSavingProfile(false);
    }
  };

  const changePhoto = () => {
    fileInputRef.current?.click();
  };

  const uploadPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Upload a valid image file");
      return;
    }

    if (file.size > 2_000_000) {
      setError("Image must be smaller than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const imageDataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!imageDataUrl) return;

      setProfile((current) => ({ ...current, imageDataUrl }));
      setSavingImage(true);
      setError("");
      setMessage("");

      try {
        const settings = await updateProfileImage(imageDataUrl);
        setProfile(settings.profile);
        setMessage("Photo saved");
      } catch (err) {
        setError(getErrorMessage(err, "Unable to save photo"));
      } finally {
        setSavingImage(false);
        event.target.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const saveBusiness = async () => {
    try {
      setSavingBusiness(true);
      setError("");
      setMessage("");
      const settings = await updateBusiness({
        storeName: business.storeName,
        ownerName: business.ownerName,
        gstNumber: business.gstNumber,
        phone: business.phone,
        email: business.email,
        address: business.address,
        category: business.category,
        upiId: business.upiId,
      });
      setBusiness(settings.business);
      setMessage("Business profile saved");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save business profile"));
    } finally {
      setSavingBusiness(false);
    }
  };

  const uploadLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Upload a valid logo image file");
      return;
    }

    if (file.size > 2_000_000) {
      setError("Logo must be smaller than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const logoDataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!logoDataUrl) return;

      setBusiness((current) => ({ ...current, logoDataUrl }));
      setSavingLogo(true);
      setError("");
      setMessage("");

      try {
        const settings = await updateBusinessLogo(logoDataUrl);
        setBusiness(settings.business);
        setMessage("Business logo saved");
      } catch (err) {
        setError(getErrorMessage(err, "Unable to save logo"));
      } finally {
        setSavingLogo(false);
        event.target.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleNotification = async (field: keyof NotificationSettings, checked: boolean) => {
    const next = { ...notifications, [field]: checked };
    setNotifications(next);
    setSavingNotifications(true);
    setError("");
    setMessage("");

    try {
      const settings = await updateNotifications(next);
      setNotifications(settings.notifications);
      setMessage("Notification settings saved");
    } catch (err) {
      setNotifications(notifications);
      setError(getErrorMessage(err, "Unable to save notifications"));
    } finally {
      setSavingNotifications(false);
    }
  };

  const saveTaxSettings = async () => {
    setSavingBusiness(true);
    setError("");
    setMessage("");

    try {
      const settings = await updateTaxSettings({ taxMode, taxRate, lowStockThreshold, taxEnabled: taxMode !== "none" });
      setTaxMode(settings.taxMode);
      setTaxRate(settings.taxRate);
      setTaxEnabled(settings.taxEnabled);
      setLowStockThreshold(settings.lowStockThreshold);
      setMessage("Tax settings saved");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save tax settings"));
    } finally {
      setSavingBusiness(false);
    }
  };

  const setSecurityField = (field: keyof typeof securityForm, value: string) => {
    setSecurityForm((current) => ({ ...current, [field]: value }));
  };

  const changePin = async () => {
    setSecurityMessage("");
    setSecurityError("");

    if (!/^\d{4}$/.test(securityForm.currentPin)) {
      setSecurityError("Enter a valid current PIN");
      return;
    }
    if (!/^\d{4}$/.test(securityForm.newPin)) {
      setSecurityError("New PIN must be exactly 4 digits");
      return;
    }
    if (securityForm.newPin !== securityForm.confirmPin) {
      setSecurityError("New PINs do not match");
      return;
    }

    try {
      setSavingSecurity(true);
      await verifyPin(securityForm.currentPin);
      await setPin(securityForm.newPin);
      setSecurityMessage("PIN updated successfully");
      setSecurityForm({ currentPin: "", newPin: "", confirmPin: "", currentPassword: "", newPassword: "" });
      toast.success("PIN updated");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to update PIN";
      setSecurityError(msg);
      toast.error(msg);
    } finally {
      setSavingSecurity(false);
    }
  };

  const handlePasswordAction = async () => {
    setSecurityMessage("");
    setSecurityError("");

    if (!securityForm.newPassword || securityForm.newPassword.length < 8) {
      setSecurityError("New password must be at least 8 characters");
      return;
    }

    try {
      setSavingSecurity(true);
      if (hasGoogleAuth) {
        await setPassword({ password: securityForm.newPassword });
        setSecurityMessage("Password set successfully");
        toast.success("Password set");
      } else {
        if (!securityForm.currentPassword) {
          setSecurityError("Enter your current password");
          return;
        }
        await changePassword({ currentPassword: securityForm.currentPassword, newPassword: securityForm.newPassword });
        setSecurityMessage("Password changed successfully");
        toast.success("Password changed");
      }
      setSecurityForm({ currentPin: "", newPin: "", confirmPin: "", currentPassword: "", newPassword: "" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to update password";
      setSecurityError(msg);
      toast.error(msg);
    } finally {
      setSavingSecurity(false);
    }
  };

  const resetDemo = async () => {
    setResettingDemo(true);
    setError("");
    setMessage("");

    try {
      const result = await resetDemoData();
      const totalDeleted = Object.values(result.deleted).reduce((sum, count) => sum + count, 0);
      setDemoSeeded(false);
      setMessage(totalDeleted > 0 ? "Demo data reset" : "No demo data to reset");
      emitDataRefresh();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to reset demo data"));
    } finally {
      setResettingDemo(false);
    }
  };

  return (
    <DashboardLayout title="Settings">
      <div className="max-w-4xl">
        <div className="mb-4 flex justify-end">
          <Button
            variant="outline"
            onClick={() => void resetDemo()}
            disabled={resettingDemo || !demoSeeded}
          >
            {resettingDemo ? "Resetting..." : "Reset Demo Data"}
          </Button>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="mb-6 bg-secondary/60 p-1 h-11">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="tax">Tax</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="glass-card rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 ring-4 ring-primary/10">
                  <AvatarImage src={profile.imageDataUrl || undefined} alt={profile.fullName} />
                  <AvatarFallback className="gradient-primary text-primary-foreground font-bold text-xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-display text-xl font-bold">{profile.fullName}</div>
                  <div className="text-sm text-muted-foreground mb-2">{profile.email}</div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={uploadPhoto}
                  />
                  <Button size="sm" variant="outline" onClick={changePhoto} disabled={savingImage}>
                    {savingImage ? "Saving..." : "Change Photo"}
                  </Button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">Full Name</Label>
                  <Input
                    value={profile.fullName}
                    onChange={(event) => setProfileField("fullName", event.target.value)}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Email</Label>
                  <Input
                    type="email"
                    value={profile.email}
                    onChange={(event) => setProfileField("email", event.target.value)}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Phone</Label>
                  <Input
                    value={profile.phone}
                    onChange={(event) => setProfileField("phone", event.target.value)}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Timezone</Label>
                  <Input
                    value={profile.timezone}
                    onChange={(event) => setProfileField("timezone", event.target.value)}
                  />
                </div>
              </div>
              {(message || error) && (
                <div className={error ? "text-sm text-destructive" : "text-sm text-accent-brand"}>
                  {error || message}
                </div>
              )}
              <Button
                className="gradient-primary text-primary-foreground"
                onClick={saveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="business">
            <div className="glass-card rounded-2xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <Avatar className="h-20 w-20 ring-4 ring-primary/10">
                  <AvatarImage src={business.logoDataUrl || undefined} alt={business.storeName} />
                  <AvatarFallback className="gradient-primary text-primary-foreground font-bold text-xl">
                    {getInitials(business.storeName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-display text-lg font-bold">{business.storeName}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{business.category}</p>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={uploadLogo}
                  />
                  <Button size="sm" variant="outline" onClick={() => logoInputRef.current?.click()} disabled={savingLogo}>
                    {savingLogo ? "Saving..." : "Upload Logo"}
                  </Button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">Store Name</Label>
                  <Input value={business.storeName} onChange={(event) => setBusinessField("storeName", event.target.value)} />
                </div>
                <div>
                  <Label className="mb-2 block">Owner Name</Label>
                  <Input value={business.ownerName} onChange={(event) => setBusinessField("ownerName", event.target.value)} />
                </div>
                <div>
                  <Label className="mb-2 block">GST Number</Label>
                  <Input value={business.gstNumber} onChange={(event) => setBusinessField("gstNumber", event.target.value)} />
                </div>
                <div>
                  <Label className="mb-2 block">UPI ID</Label>
                  <Input
                    placeholder="shop@upi"
                    value={business.upiId}
                    onChange={(event) => setBusinessField("upiId", event.target.value)}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Phone</Label>
                  <Input value={business.phone} onChange={(event) => setBusinessField("phone", event.target.value)} />
                </div>
                <div>
                  <Label className="mb-2 block">Email</Label>
                  <Input type="email" value={business.email} onChange={(event) => setBusinessField("email", event.target.value)} />
                </div>
                <div>
                  <Label className="mb-2 block">Business Category</Label>
                  <Input value={business.category} onChange={(event) => setBusinessField("category", event.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-2 block">Address</Label>
                  <Input value={business.address} onChange={(event) => setBusinessField("address", event.target.value)} />
                </div>
              </div>
              {(message || error) && (
                <div className={error ? "text-sm text-destructive" : "text-sm text-accent-brand"}>
                  {error || message}
                </div>
              )}
              <Button className="gradient-primary text-primary-foreground" onClick={saveBusiness} disabled={savingBusiness}>
                {savingBusiness ? "Saving..." : "Save Business Profile"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="tax">
            <div className="glass-card rounded-2xl p-6 space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">Tax Mode</Label>
                  <Select
                    value={taxMode}
                    onValueChange={(value) => setTaxMode(value as "cgst-sgst" | "igst" | "custom" | "standard" | "none")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Tax</SelectItem>
                      <SelectItem value="cgst-sgst">CGST + SGST (Intra-state)</SelectItem>
                      <SelectItem value="igst">IGST (Inter-state)</SelectItem>
                      <SelectItem value="standard">Standard (Single Tax)</SelectItem>
                      <SelectItem value="custom">Custom Tax</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {taxMode !== "none" && (
                  <div>
                    <Label className="mb-2 block">Tax Rate</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={taxRate}
                      onChange={(event) => setTaxRate(Number(event.target.value))}
                    />
                  </div>
                )}
                <div>
                  <Label className="mb-2 block">Low Stock Threshold</Label>
                  <Input
                    type="number"
                    min="1"
                    value={lowStockThreshold}
                    onChange={(event) => setLowStockThreshold(Number(event.target.value))}
                  />
                </div>
              </div>
              {(message || error) && (
                <div className={error ? "text-sm text-destructive" : "text-sm text-accent-brand"}>
                  {error || message}
                </div>
              )}
              <Button className="gradient-primary text-primary-foreground" onClick={saveTaxSettings} disabled={savingBusiness}>
                {savingBusiness ? "Saving..." : "Save Tax Settings"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <div className="glass-card rounded-2xl p-6 space-y-1">
              {[
                {
                  t: "Invoice notifications",
                  d: "Get notified when invoices are created or paid",
                  key: "invoiceNotifications",
                },
                {
                  t: "Stock alerts",
                  d: "Get notified when products fall below threshold",
                  key: "stockAlerts",
                },
                {
                  t: "Payment reminders",
                  d: "Send reminders for pending and overdue payments",
                  key: "paymentReminders",
                },
                {
                  t: "AI insights alerts",
                  d: "Personalized predictions and retail recommendations",
                  key: "aiInsightsAlerts",
                },
              ].map((n, i) => (
                <div
                  key={n.t}
                  className={`flex items-center justify-between py-4 ${i > 0 ? "border-t border-border" : ""}`}
                >
                  <div>
                    <div className="font-medium">{n.t}</div>
                    <div className="text-sm text-muted-foreground">{n.d}</div>
                  </div>
                  <Switch
                    checked={notifications[n.key as keyof NotificationSettings]}
                    disabled={savingNotifications}
                    onCheckedChange={(checked) =>
                      toggleNotification(n.key as keyof NotificationSettings, checked)
                    }
                  />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="appearance">
            <div className="glass-card rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="block mb-1">Theme</Label>
                  <p className="text-sm text-muted-foreground">Switch between light and dark mode</p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleTheme}
                >
                  <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="security">
            <div className="glass-card rounded-2xl p-6 space-y-8">
              <div className="space-y-4">
                <div>
                  <h3 className="font-display text-lg font-bold">Change Shop PIN</h3>
                  <p className="text-sm text-muted-foreground">Update your 4-digit shop PIN</p>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="mb-2 block">Current PIN</Label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={securityForm.currentPin}
                      onChange={(e) => setSecurityField("currentPin", e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="••••"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">New PIN</Label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={securityForm.newPin}
                      onChange={(e) => setSecurityField("newPin", e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="••••"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">Confirm New PIN</Label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={securityForm.confirmPin}
                      onChange={(e) => setSecurityField("confirmPin", e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="••••"
                    />
                  </div>
                </div>
                <Button
                  className="gradient-primary text-primary-foreground"
                  onClick={changePin}
                  disabled={savingSecurity}
                >
                  {savingSecurity ? "Updating PIN..." : "Update PIN"}
                </Button>
              </div>

              <div className="border-t border-border pt-6 space-y-4">
                <div>
                  <h3 className="font-display text-lg font-bold">Password</h3>
                  <p className="text-sm text-muted-foreground">
                    {hasGoogleAuth ? "Set a password to enable email login" : "Change your account password"}
                  </p>
                </div>
                {!hasGoogleAuth && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="mb-2 block">Current Password</Label>
                      <Input
                        type="password"
                        value={securityForm.currentPassword}
                        onChange={(e) => setSecurityField("currentPassword", e.target.value)}
                        placeholder="Enter current password"
                      />
                    </div>
                    <div>
                      <Label className="mb-2 block">New Password</Label>
                      <Input
                        type="password"
                        value={securityForm.newPassword}
                        onChange={(e) => setSecurityField("newPassword", e.target.value)}
                        placeholder="Min 8 characters"
                      />
                    </div>
                  </div>
                )}
                {hasGoogleAuth && (
                  <div>
                    <Label className="mb-2 block">Set Password</Label>
                    <Input
                      type="password"
                      value={securityForm.newPassword}
                      onChange={(e) => setSecurityField("newPassword", e.target.value)}
                      placeholder="Min 8 characters"
                    />
                  </div>
                )}
                <Button
                  className="gradient-primary text-primary-foreground"
                  onClick={handlePasswordAction}
                  disabled={savingSecurity}
                >
                  {savingSecurity ? "Saving..." : hasGoogleAuth ? "Set Password" : "Change Password"}
                </Button>
              </div>

              {(securityMessage || securityError) && (
                <div className={securityError ? "text-sm text-destructive" : "text-sm text-accent-brand"}>
                  {securityError || securityMessage}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function getInitials(name: string) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || "SA";
}

function getErrorMessage(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "response" in err) {
    const apiMessage = (err as { response?: { data?: { message?: string } } }).response?.data
      ?.message;
    if (apiMessage) return apiMessage;
  }

  return err instanceof Error ? err.message : fallback;
}
