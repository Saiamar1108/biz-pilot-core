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
} from "@/lib/api";
import { toast } from "sonner";
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
} from "lucide-react";

export const Route = createFileRoute("/settings")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Settings — ShopPilot AI" }] }),
  component: SettingsPage,
});

type TabId = "profile" | "business" | "notifications" | "security" | "preferences";

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

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    try {
      setSavingSection("security");
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success("Password changed successfully. Please log in again.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => {
        void auth.logout().then(() => navigate({ to: "/login" }));
      }, 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password.");
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
              {activeTab === "security" && (
                <div className="rounded-2xl border border-border/50 bg-card p-6 md:p-8 shadow-sm backdrop-blur-md space-y-6">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                      Security & Password
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Update your account security password parameters.
                    </p>
                  </div>

                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label htmlFor="sec-curr">Current Password</Label>
                        <Input
                          id="sec-curr"
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={(e) =>
                            setPasswordForm((prev) => ({
                              ...prev,
                              currentPassword: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="sec-new">New Password</Label>
                        <Input
                          id="sec-new"
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(e) =>
                            setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                          }
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="sec-conf">Confirm New Password</Label>
                        <Input
                          id="sec-conf"
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) =>
                            setPasswordForm((prev) => ({
                              ...prev,
                              confirmPassword: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        type="submit"
                        disabled={savingSection === "security"}
                        className="cursor-pointer gap-2 font-semibold"
                      >
                        {savingSection === "security" ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Updating...
                          </>
                        ) : (
                          "Update Password"
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

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
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
