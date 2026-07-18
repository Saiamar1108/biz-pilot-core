import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAuth } from "@/lib/auth-guard";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  getSettings,
  updateProfileSettings,
  updateBusinessSettings,
  updateNotificationSettings,
  updatePreferenceSettings,
  changePassword,
  api,
} from "@/lib/api";
import { setAccessToken } from "@/lib/auth-store";
import { toast } from "sonner";
import { subscribeToCache } from "@/lib/apiCache";
import {
  User as UserIcon,
  Building,
  Bell,
  Lock,
  Sliders,
  Upload,
  Trash2,
  Check,
  Loader2,
  Moon,
  Sun,
  Laptop,
  Database,
  Download,
  Eye,
  EyeOff,
} from "lucide-react";

export const Route = createFileRoute("/settings")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Settings — ShopPilot AI" }] }),
  component: SettingsPage,
});

type TabId = "profile" | "business" | "notifications" | "security" | "preferences" | "backup";

function SettingsPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const themeContext = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [notificationSupported, setNotificationSupported] = useState(false);

  // Form states
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    role: "owner",
    timezone: "Asia/Kolkata",
    language: "en",
    imageDataUrl: "",
    hasPassword: false,
  });

  const [business, setBusiness] = useState({
    logoDataUrl: "",
    storeName: "",
    category: "Retail",
    gstNumber: "",
    pan: "",
    upiId: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    state: "",
    city: "",
    pincode: "",
    currency: "INR",
    timezone: "Asia/Kolkata",
    invoicePrefix: "INV",
  });

  const [notifications, setNotifications] = useState({
    email: true,
    whatsapp: true,
    desktop: true,
    push: false,
    lowStock: true,
    invoicePaid: true,
    purchaseOrders: true,
    aiAlerts: false,
  });

  const [preferences, setPreferences] = useState({
    theme: "system",
    language: "en",
    currency: "INR",
    dateFormat: "DD/MM/YYYY",
    numberFormat: "en-IN",
    startPage: "/dashboard",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // File input refs
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [exporting, setExporting] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("last_export_timestamp");
    }
    return null;
  });

  const handleDownloadBackup = async () => {
    setExporting(true);
    try {
      const res = await api.get("/settings/backup/complete", { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `ShopPilot_Backup_${new Date().toISOString().split('T')[0]}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      const nowStr = new Date().toLocaleString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
      setLastExport(nowStr);
      localStorage.setItem("last_export_timestamp", nowStr);
      
      toast.success("Complete backup ZIP downloaded successfully.");
    } catch (err) {
      toast.error("Failed to export backup data.");
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadReport = async () => {
    setExporting(true);
    try {
      const res = await api.get("/settings/backup/report", { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `ShopPilot_BusinessReport_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("Business Report PDF downloaded successfully.");
    } catch (err) {
      toast.error("Failed to export business report PDF.");
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadCSVs = async () => {
    setExporting(true);
    try {
      const res = await api.get("/settings/backup/csvs", { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `ShopPilot_CSVs_${new Date().toISOString().split('T')[0]}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("CSV files ZIP downloaded successfully.");
    } catch (err) {
      toast.error("Failed to export CSV files.");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationSupported(true);
    }

    let active = true;
    const load = (showLoading = true) => {
      if (showLoading) setLoading(true);
      getSettings()
        .then((data) => {
          if (!active) return;
          if (data.profile) setProfile((prev) => ({ ...prev, ...data.profile }));
          if (data.business) {
            // Merge invoice prefix from branding if not present
            const invoicePrefix = data.branding?.invoicePrefix || data.business.invoicePrefix || "INV";
            setBusiness((prev) => ({ ...prev, ...data.business, invoicePrefix }));
          }
          if (data.notifications) setNotifications((prev) => ({ ...prev, ...data.notifications }));
          if (data.preferences) setPreferences((prev) => ({ ...prev, ...data.preferences }));
        })
        .catch((err) => {
          toast.error("Failed to load settings: " + (err instanceof Error ? err.message : "Error"));
        })
        .finally(() => {
          if (active && showLoading) setLoading(false);
        });
    };

    load(true);

    const unsubSettings = subscribeToCache("settings", () => load(false));

    return () => {
      active = false;
      unsubSettings();
    };
  }, []);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image file is too large (maximum size is 2MB)");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setter(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (section: TabId, updateFn: () => Promise<any>) => {
    try {
      setSavingSection(section);
      await updateFn();
      toast.success("Settings saved successfully.");

      // Propagate changes immediately to the global UI scope
      if (section === "profile" || section === "business") {
        await auth.refresh();
      }

      if (section === "preferences") {
        // Theme immediate update
        themeContext.setTheme(preferences.theme as any);
        
        // Currency immediate format
        localStorage.setItem("sp_currency", preferences.currency);
        
        // Date format immediate patch
        localStorage.setItem("sp_date_format", preferences.dateFormat);
        
        // Number format immediate layout
        localStorage.setItem("sp_number_format", preferences.numberFormat);
        
        // Start page redirect layout
        localStorage.setItem("sp_start_page", preferences.startPage);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save settings.");
    } finally {
      setSavingSection(null);
    }
  };

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const getPasswordErrors = (password: string, confirm: string) => {
    const errs = [];
    if (password.length < 8) errs.push("Minimum 8 characters");
    if (!/[A-Z]/.test(password)) errs.push("At least 1 uppercase letter");
    if (!/[a-z]/.test(password)) errs.push("At least 1 lowercase letter");
    if (!/[0-9]/.test(password)) errs.push("At least 1 number");
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errs.push("At least 1 special character");
    if (confirm && password !== confirm) errs.push("Confirm password must match");
    return errs;
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    
    const errors = getPasswordErrors(passwordForm.newPassword, passwordForm.confirmPassword);
    if (errors.length > 0) {
      toast.error(`Invalid Password: ${errors.join(", ")}`);
      return;
    }

    try {
      setSavingSection("security");
      const res = await api.post("/auth/change-password", {
        currentPassword: profile.hasPassword ? passwordForm.currentPassword : undefined,
        newPassword: passwordForm.newPassword,
      });
      
      const isFirstTime = !profile.hasPassword;
      
      setProfile((prev: any) => ({ ...prev, hasPassword: true }));
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      
      if (res.data?.accessToken) {
        setAccessToken(res.data.accessToken);
      }

      if (isFirstTime) {
        toast.success("Password Created Successfully");
      } else {
        toast.success("Password Updated Successfully");
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || "Failed to update password.";
      toast.error(errMsg);
    } finally {
      setSavingSection(null);
    }
  };

  const sidebarItems = [
    { id: "profile", label: "Profile", icon: UserIcon },
    { id: "business", label: "Business", icon: Building },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Lock },
    { id: "preferences", label: "Preferences", icon: Sliders },
    { id: "backup", label: "Backup & Export", icon: Database },
  ] as const;

  return (
    <DashboardLayout title="Settings">
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/75 bg-clip-text text-transparent">
              Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure personal profile credentials, business parameters, alerts notifications, and preferences.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-[220px_1fr]">
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-xl" />
              ))}
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-[240px_1fr] items-start">
            {/* Left Nav */}
            <aside className="flex flex-row md:flex-col overflow-x-auto md:overflow-visible gap-1.5 pb-2 md:pb-0 border-b md:border-b-0 border-border/50 scrollbar-none">
              {sidebarItems.map((item) => {
                const ActiveIcon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 shrink-0 text-left cursor-pointer ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-glow hover:bg-primary/95"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <ActiveIcon className="h-4.5 w-4.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </aside>

            {/* Right Panel */}
            <div className="min-w-0 space-y-6 transition-all duration-300">
              {/* Profile Card */}
              {activeTab === "profile" && (
                <div className="rounded-2xl border border-border/50 bg-card p-6 md:p-8 shadow-sm backdrop-blur-md space-y-6">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                      Profile Information
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Update your account details and profile photo.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-6 border-b border-border/30 pb-6">
                    <div className="relative group">
                      <div className="h-24 w-24 overflow-hidden rounded-full ring-4 ring-primary/20 bg-secondary flex items-center justify-center">
                        {profile.imageDataUrl ? (
                          <img
                            src={profile.imageDataUrl}
                            alt="Avatar"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-muted-foreground">
                            {profile.fullName
                              ? profile.fullName.charAt(0).toUpperCase()
                              : "U"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:items-start items-center gap-2">
                      <div className="flex flex-wrap gap-2">
                        <input
                          type="file"
                          ref={avatarInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={(e) =>
                            handleFileChange(e, (url) =>
                              setProfile((prev) => ({ ...prev, imageDataUrl: url })),
                            )
                          }
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="cursor-pointer gap-2 transition-all"
                          onClick={() => avatarInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4" /> Upload Photo
                        </Button>
                        {profile.imageDataUrl && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="cursor-pointer gap-2"
                            onClick={() =>
                              setProfile((prev) => ({ ...prev, imageDataUrl: "" }))
                            }
                          >
                            <Trash2 className="h-4 w-4" /> Remove
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Recommended: Square image, PNG or JPEG up to 2MB.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="profile-name">Full Name</Label>
                      <Input
                        id="profile-name"
                        value={profile.fullName}
                        onChange={(e) =>
                          setProfile((prev) => ({ ...prev, fullName: e.target.value }))
                        }
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="profile-email">Email Address</Label>
                      <Input
                        id="profile-email"
                        value={profile.email}
                        onChange={(e) =>
                          setProfile((prev) => ({ ...prev, email: e.target.value }))
                        }
                        placeholder="john@example.com"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="profile-phone">Phone Number</Label>
                      <Input
                        id="profile-phone"
                        value={profile.phone}
                        onChange={(e) =>
                          setProfile((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      className="cursor-pointer font-semibold min-w-32 gap-2"
                      disabled={savingSection === "profile"}
                      onClick={() =>
                        handleSave("profile", () => updateProfileSettings({ profile }))
                      }
                    >
                      {savingSection === "profile" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" /> Save Profile
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Business Card */}
              {activeTab === "business" && (
                <div className="rounded-2xl border border-border/50 bg-card p-6 md:p-8 shadow-sm backdrop-blur-md space-y-6">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                      Business Details
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Set up your storefront identification, contact channels, address, and invoice configurations.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-6 border-b border-border/30 pb-6">
                    <div className="h-20 w-20 overflow-hidden rounded-xl bg-secondary flex items-center justify-center border border-border">
                      {business.logoDataUrl ? (
                        <img
                          src={business.logoDataUrl}
                          alt="Logo"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Building className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex flex-col sm:items-start items-center gap-2">
                      <div className="flex flex-wrap gap-2">
                        <input
                          type="file"
                          ref={logoInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={(e) =>
                            handleFileChange(e, (url) =>
                              setBusiness((prev) => ({ ...prev, logoDataUrl: url })),
                            )
                          }
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="cursor-pointer gap-2"
                          onClick={() => logoInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4" /> Upload Logo
                        </Button>
                        {business.logoDataUrl && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="cursor-pointer gap-2"
                            onClick={() =>
                              setBusiness((prev) => ({ ...prev, logoDataUrl: "" }))
                            }
                          >
                            <Trash2 className="h-4 w-4" /> Remove
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Recommended: Transparent PNG, under 2MB.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="biz-name">Business Name</Label>
                      <Input
                        id="biz-name"
                        value={business.storeName}
                        onChange={(e) =>
                          setBusiness((prev) => ({ ...prev, storeName: e.target.value }))
                        }
                        placeholder="SaiMart Retail"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="biz-phone">Phone Number</Label>
                      <Input
                        id="biz-phone"
                        value={business.phone}
                        onChange={(e) =>
                          setBusiness((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        placeholder="+91 7569681350"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="biz-email">Contact Email</Label>
                      <Input
                        id="biz-email"
                        value={business.email}
                        onChange={(e) =>
                          setBusiness((prev) => ({ ...prev, email: e.target.value }))
                        }
                        placeholder="support@saimart.in"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="biz-gst">GSTIN</Label>
                      <Input
                        id="biz-gst"
                        value={business.gstNumber}
                        onChange={(e) =>
                          setBusiness((prev) => ({ ...prev, gstNumber: e.target.value }))
                        }
                        placeholder="37ABCDE1234F1Z5"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="biz-upi">Business UPI ID</Label>
                      <Input
                        id="biz-upi"
                        value={business.upiId}
                        onChange={(e) =>
                          setBusiness((prev) => ({ ...prev, upiId: e.target.value }))
                        }
                        placeholder="store@okaxis"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="biz-prefix">Invoice Prefix</Label>
                      <Input
                        id="biz-prefix"
                        value={business.invoicePrefix}
                        onChange={(e) =>
                          setBusiness((prev) => ({ ...prev, invoicePrefix: e.target.value }))
                        }
                        placeholder="INV"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="biz-address">Store Address</Label>
                      <Input
                        id="biz-address"
                        value={business.address}
                        onChange={(e) =>
                          setBusiness((prev) => ({ ...prev, address: e.target.value }))
                        }
                        placeholder="Vijayawada, Andhra Pradesh"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="biz-currency">Currency</Label>
                      <select
                        id="biz-currency"
                        value={business.currency}
                        onChange={(e) =>
                          setBusiness((prev) => ({ ...prev, currency: e.target.value }))
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="INR">Indian Rupee (₹)</option>
                        <option value="USD">US Dollar ($)</option>
                        <option value="EUR">Euro (€)</option>
                        <option value="GBP">British Pound (£)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      className="cursor-pointer font-semibold min-w-32 gap-2"
                      disabled={savingSection === "business"}
                      onClick={() =>
                        handleSave("business", () => updateBusinessSettings({ business }))
                      }
                    >
                      {savingSection === "business" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" /> Save Business Info
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Notifications Card */}
              {activeTab === "notifications" && (
                <div className="rounded-2xl border border-border/50 bg-card p-6 md:p-8 shadow-sm backdrop-blur-md space-y-6">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                      Notification Preferences
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Configure alert channels and triggers. Real settings persisted directly to database.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-border/30 rounded-xl hover:bg-muted/30 transition-colors">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">Email Alerts</Label>
                        <p className="text-xs text-muted-foreground">
                          Receive reports, invoices, and supplier logs via email.
                        </p>
                      </div>
                      <Switch
                        checked={notifications.email}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({ ...prev, email: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-border/30 rounded-xl hover:bg-muted/30 transition-colors">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">WhatsApp Messages</Label>
                        <p className="text-xs text-muted-foreground">
                          Send billing receipt links directly to customer WhatsApp channels.
                        </p>
                      </div>
                      <Switch
                        checked={notifications.whatsapp}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({ ...prev, whatsapp: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-border/30 rounded-xl hover:bg-muted/30 transition-colors">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">Desktop Alerts</Label>
                        <p className="text-xs text-muted-foreground">
                          Show alert cards in-browser while running the application.
                        </p>
                      </div>
                      <Switch
                        checked={notifications.desktop}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({ ...prev, desktop: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-border/30 rounded-xl hover:bg-muted/30 transition-colors">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">Push Notifications</Label>
                        <p className="text-xs text-muted-foreground">
                          Receive background alerts directly on your devices (requires browser capabilities).
                        </p>
                      </div>
                      <Switch
                        disabled={!notificationSupported}
                        checked={notifications.push && notificationSupported}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({ ...prev, push: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-border/30 rounded-xl hover:bg-muted/30 transition-colors">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">Low Stock Thresholds</Label>
                        <p className="text-xs text-muted-foreground">
                          Warn if item inventory levels drop below critical margins.
                        </p>
                      </div>
                      <Switch
                        checked={notifications.lowStock}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({ ...prev, lowStock: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-border/30 rounded-xl hover:bg-muted/30 transition-colors">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">Invoice Paid Alerts</Label>
                        <p className="text-xs text-muted-foreground">
                          Notify me immediately when customers pay invoice links.
                        </p>
                      </div>
                      <Switch
                        checked={notifications.invoicePaid}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({ ...prev, invoicePaid: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-border/30 rounded-xl hover:bg-muted/30 transition-colors">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">Purchase Orders Status</Label>
                        <p className="text-xs text-muted-foreground">
                          Alert when vendor approves delivery dates or logs.
                        </p>
                      </div>
                      <Switch
                        checked={notifications.purchaseOrders}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({ ...prev, purchaseOrders: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-border/30 rounded-xl hover:bg-muted/30 transition-colors">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">AI Alerts</Label>
                        <p className="text-xs text-muted-foreground">
                          Trigger AI business reports and revenue warning notices.
                        </p>
                      </div>
                      <Switch
                        checked={notifications.aiAlerts}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({ ...prev, aiAlerts: checked }))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      className="cursor-pointer font-semibold min-w-32 gap-2"
                      disabled={savingSection === "notifications"}
                      onClick={() =>
                        handleSave("notifications", () =>
                          updateNotificationSettings({ notifications }),
                        )
                      }
                    >
                      {savingSection === "notifications" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" /> Save Alerts
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Security Card */}
              {activeTab === "security" && (() => {
                const newPass = passwordForm.newPassword;
                const isMinLength = newPass.length >= 8;
                const hasUpper = /[A-Z]/.test(newPass);
                const hasLower = /[a-z]/.test(newPass);
                const hasNum = /[0-9]/.test(newPass);
                const hasSpec = /[!@#$%^&*(),.?":{}|<>]/.test(newPass);
                const isMatching = newPass && newPass === passwordForm.confirmPassword;

                return (
                  <div className="rounded-2xl border border-border/50 bg-card p-6 md:p-8 shadow-sm backdrop-blur-md space-y-6">
                    <div className="flex flex-col gap-2">
                      <h2 className="text-xl font-bold tracking-tight text-foreground">
                        {profile.hasPassword ? "Security & Password" : "Create Password"}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {profile.hasPassword
                          ? "Update your account security password parameters."
                          : "Secure your ShopPilot account by creating a password."}
                      </p>
                      {!profile.hasPassword && (
                        <p className="text-xs text-primary font-medium bg-primary/10 p-3 rounded-lg border border-primary/20 mt-1">
                          🛡️ Adding a password helps protect your business data and account.
                        </p>
                      )}
                    </div>

                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-3">
                        {profile.hasPassword && (
                          <div className="space-y-1">
                            <Label htmlFor="sec-curr">Current Password</Label>
                            <div className="relative">
                              <Input
                                id="sec-curr"
                                type={showCurrent ? "text" : "password"}
                                value={passwordForm.currentPassword}
                                onChange={(e) =>
                                  setPasswordForm((prev) => ({
                                    ...prev,
                                    currentPassword: e.target.value,
                                  }))
                                }
                                required
                                className="pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowCurrent(!showCurrent)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-1">
                          <Label htmlFor="sec-new">New Password</Label>
                          <div className="relative">
                            <Input
                              id="sec-new"
                              type={showNew ? "text" : "password"}
                              value={passwordForm.newPassword}
                              onChange={(e) =>
                                setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                              }
                              required
                              className="pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNew(!showNew)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="sec-conf">Confirm New Password</Label>
                          <div className="relative">
                            <Input
                              id="sec-conf"
                              type={showConfirm ? "text" : "password"}
                              value={passwordForm.confirmPassword}
                              onChange={(e) =>
                                setPasswordForm((prev) => ({
                                  ...prev,
                                  confirmPassword: e.target.value,
                                }))
                              }
                              required
                              className="pr-10"
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

                        {/* Real-time Checklist */}
                        {newPass && (
                          <div className="sm:col-span-3 space-y-2 p-3 rounded-lg bg-secondary/20 border border-border/40 text-xs mt-2">
                            <div className="font-semibold text-muted-foreground mb-1">Password Requirements:</div>
                            <div className="grid gap-1.5 sm:grid-cols-2">
                              <div className="flex items-center gap-1.5">
                                <span className={isMinLength ? "text-emerald-500 font-bold" : "text-muted-foreground"}>
                                  {isMinLength ? "✓" : "○"}
                                </span>
                                <span className={isMinLength ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}>
                                  Minimum 8 characters
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={hasUpper ? "text-emerald-500 font-bold" : "text-muted-foreground"}>
                                  {hasUpper ? "✓" : "○"}
                                </span>
                                <span className={hasUpper ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}>
                                  At least 1 uppercase letter
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={hasLower ? "text-emerald-500 font-bold" : "text-muted-foreground"}>
                                  {hasLower ? "✓" : "○"}
                                </span>
                                <span className={hasLower ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}>
                                  At least 1 lowercase letter
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={hasNum ? "text-emerald-500 font-bold" : "text-muted-foreground"}>
                                  {hasNum ? "✓" : "○"}
                                </span>
                                <span className={hasNum ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}>
                                  At least 1 number
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={hasSpec ? "text-emerald-500 font-bold" : "text-muted-foreground"}>
                                  {hasSpec ? "✓" : "○"}
                                </span>
                                <span className={hasSpec ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}>
                                  At least 1 special character
                                </span>
                              </div>
                              {passwordForm.confirmPassword && (
                                <div className="flex items-center gap-1.5">
                                  <span className={isMatching ? "text-emerald-500 font-bold" : "text-muted-foreground"}>
                                    {isMatching ? "✓" : "○"}
                                  </span>
                                  <span className={isMatching ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}>
                                    Passwords match
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end pt-2">
                        <Button
                          type="submit"
                          disabled={savingSection === "security"}
                          className="cursor-pointer gap-2 font-semibold"
                        >
                          {savingSection === "security" ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                            </>
                          ) : (
                            profile.hasPassword ? "Update Password" : "Create Password"
                          )}
                        </Button>
                      </div>
                    </form>
                  </div>
                );
              })()}

              {/* Preferences Card */}
              {activeTab === "preferences" && (
                <div className="rounded-2xl border border-border/50 bg-card p-6 md:p-8 shadow-sm backdrop-blur-md space-y-6">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                      UI Preferences
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Configure layout formats, display values, and regional parameters. Saved values propagate globally instantly.
                    </p>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Theme Color Mode</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "light", label: "Light", icon: Sun },
                          { id: "dark", label: "Dark", icon: Moon },
                          { id: "system", label: "System", icon: Laptop },
                        ].map((theme) => {
                          const Icon = theme.icon;
                          const selected = preferences.theme === theme.id;
                          return (
                            <button
                              key={theme.id}
                              type="button"
                              onClick={() =>
                                setPreferences((prev) => ({ ...prev, theme: theme.id }))
                              }
                              className={`flex flex-col items-center gap-2 p-3.5 border rounded-xl cursor-pointer text-xs font-semibold transition-all ${
                                selected
                                  ? "border-primary bg-primary/5 text-primary"
                                  : "border-border/60 hover:bg-muted"
                              }`}
                            >
                              <Icon className="h-5 w-5" />
                              {theme.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pref-currency">Currency Mode</Label>
                      <select
                        id="pref-currency"
                        value={preferences.currency}
                        onChange={(e) =>
                          setPreferences((prev) => ({ ...prev, currency: e.target.value }))
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="INR">Indian Rupee (₹)</option>
                        <option value="USD">US Dollar ($)</option>
                        <option value="EUR">Euro (€)</option>
                        <option value="GBP">British Pound (£)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pref-date">Date Format</Label>
                      <select
                        id="pref-date"
                        value={preferences.dateFormat}
                        onChange={(e) =>
                          setPreferences((prev) => ({ ...prev, dateFormat: e.target.value }))
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY (18/07/2026)</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY (07/18/2026)</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD (2026-07-18)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pref-num">Number Grouping Layout</Label>
                      <select
                        id="pref-num"
                        value={preferences.numberFormat}
                        onChange={(e) =>
                          setPreferences((prev) => ({ ...prev, numberFormat: e.target.value }))
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="en-IN">Indian Layout (10,00,000)</option>
                        <option value="en-US">US Layout (1,000,000)</option>
                        <option value="de-DE">European Layout (1.000.000)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pref-start">Default Landing Page</Label>
                      <select
                        id="pref-start"
                        value={preferences.startPage}
                        onChange={(e) =>
                          setPreferences((prev) => ({ ...prev, startPage: e.target.value }))
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="/dashboard">Overview Dashboard</option>
                        <option value="/billing">Invoices Billing</option>
                        <option value="/inventory">Inventory Management</option>
                        <option value="/assistant">AI Copilot Chat</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      className="cursor-pointer font-semibold min-w-32 gap-2"
                      disabled={savingSection === "preferences"}
                      onClick={() =>
                        handleSave("preferences", () =>
                          updatePreferenceSettings({ preferences }),
                        )
                      }
                    >
                      {savingSection === "preferences" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" /> Save Preferences
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === "backup" && (
                <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold leading-none tracking-tight text-card-foreground">
                      Backup & Export
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1.5">
                      Export your complete business data, download analytical reports, or obtain standalone CSV spreadsheets.
                    </p>
                  </div>

                  <hr className="border-border/40" />

                  <div className="grid gap-6 md:grid-cols-3">
                    {/* Complete Backup Card */}
                    <div className="flex flex-col justify-between p-5 rounded-xl border border-border/60 bg-secondary/15 hover:bg-secondary/25 transition-all">
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-primary">
                          <Database className="h-5 w-5" />
                          <span className="font-semibold text-sm">Complete Backup</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Downloads a comprehensive ZIP archive containing CSVs, JSON data, and a professional PDF report.
                        </p>
                      </div>
                      <Button
                        className="cursor-pointer font-semibold w-full mt-auto"
                        disabled={exporting}
                        onClick={handleDownloadBackup}
                      >
                        {exporting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Exporting...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" /> Export Backup
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Business Report Card */}
                    <div className="flex flex-col justify-between p-5 rounded-xl border border-border/60 bg-secondary/15 hover:bg-secondary/25 transition-all">
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-primary">
                          <Download className="h-5 w-5" />
                          <span className="font-semibold text-sm">Business Report</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Generates a multi-page PDF summary detailing financial metrics, catalog intelligence, and recent invoices.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="cursor-pointer font-semibold w-full mt-auto"
                        disabled={exporting}
                        onClick={handleDownloadReport}
                      >
                        {exporting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Exporting...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" /> Export Report
                          </>
                        )}
                      </Button>
                    </div>

                    {/* CSVs Only Card */}
                    <div className="flex flex-col justify-between p-5 rounded-xl border border-border/60 bg-secondary/15 hover:bg-secondary/25 transition-all">
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-primary">
                          <Download className="h-5 w-5" />
                          <span className="font-semibold text-sm">All CSV Files</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Downloads a ZIP bundle with separate, structured CSV spreadsheets for every module in your store.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="cursor-pointer font-semibold w-full mt-auto"
                        disabled={exporting}
                        onClick={handleDownloadCSVs}
                      >
                        {exporting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Exporting...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" /> Export CSVs
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <hr className="border-border/40" />

                  {lastExport && (
                    <div className="text-xs text-muted-foreground flex items-center justify-between">
                      <span>Last Export</span>
                      <span className="font-medium text-foreground bg-secondary/35 px-2 py-0.5 rounded border border-border/40">
                        {lastExport}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
