import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAuth } from "@/lib/auth-guard";
import { useAuth } from "@/contexts/AuthContext";
import {
  getSettings,
  updateProfileSettings,
  updateBusinessSettings,
  updateBrandingSettings,
  updateNotificationSettings,
  updatePreferenceSettings,
  updateAiSettings,
  changePassword,
} from "@/lib/api";
import { toast } from "sonner";
import {
  User as UserIcon,
  Building,
  Palette,
  Bell,
  Lock,
  Sliders,
  Bot,
  Database,
  Info,
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

type TabId =
  | "profile"
  | "business"
  | "branding"
  | "notifications"
  | "security"
  | "preferences"
  | "ai"
  | "backup"
  | "about";

function SettingsPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [loading, setLoading] = useState(true);

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
  });

  const [branding, setBranding] = useState({
    logo: "",
    invoiceLogo: "",
    primaryColor: "#6366f1",
    accentColor: "#10b981",
    invoiceFooter: "Thank you for your business.",
    invoicePrefix: "INV-",
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

  const [aiSettings, setAiSettings] = useState({
    personality: "professional",
    responseLength: "medium",
    businessContext: "",
    enableVoice: false,
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [twoFactor, setTwoFactor] = useState(false);

  // Saving states
  const [savingSection, setSavingSection] = useState<string | null>(null);

  // File input refs
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const invoiceLogoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    getSettings()
      .then((data) => {
        if (!active) return;
        if (data.profile) setProfile((prev) => ({ ...prev, ...data.profile }));
        if (data.business) setBusiness((prev) => ({ ...prev, ...data.business }));
        if (data.branding) setBranding((prev) => ({ ...prev, ...data.branding }));
        if (data.notifications) setNotifications((prev) => ({ ...prev, ...data.notifications }));
        if (data.preferences) setPreferences((prev) => ({ ...prev, ...data.preferences }));
        if (data.aiSettings) setAiSettings((prev) => ({ ...prev, ...data.aiSettings }));
      })
      .catch((err) => {
        toast.error("Failed to load settings: " + (err instanceof Error ? err.message : "Error"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
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
      const res = await updateFn();
      toast.success("Settings saved successfully.");

      // If updating profile, business, or branding, refresh AuthContext to sync sidebar / header
      if (section === "profile" || section === "business" || section === "branding") {
        await auth.refresh();
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
    { id: "branding", label: "Branding", icon: Palette },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Lock },
    { id: "preferences", label: "Preferences", icon: Sliders },
    { id: "ai", label: "AI Settings", icon: Bot },
    { id: "backup", label: "Backup & Export", icon: Database },
    { id: "about", label: "About", icon: Info },
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
              Manage your personal profile, business parameters, invoices branding, and AI behavior.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-[220px_1fr]">
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
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
                <div className="rounded-2xl border border-border/50 bg-card p-6 md:p-8 shadow-sm backdrop-blur-md space-y-6 relative overflow-hidden">
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
                    <div className="space-y-1">
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
                    <div className="space-y-1">
                      <Label>Account Role</Label>
                      <Input value={profile.role} readOnly className="bg-muted opacity-80" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="profile-timezone">Timezone</Label>
                      <select
                        id="profile-timezone"
                        value={profile.timezone}
                        onChange={(e) =>
                          setProfile((prev) => ({ ...prev, timezone: e.target.value }))
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="Asia/Kolkata">India (GMT+5:30)</option>
                        <option value="UTC">Coordinated Universal Time (UTC)</option>
                        <option value="US/Eastern">US Eastern (GMT-5:00)</option>
                        <option value="Europe/London">London (GMT+0:00)</option>
                        <option value="Asia/Singapore">Singapore (GMT+8:00)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="profile-language">Language</Label>
                      <select
                        id="profile-language"
                        value={profile.language}
                        onChange={(e) =>
                          setProfile((prev) => ({ ...prev, language: e.target.value }))
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="hi">हिन्दी (Hindi)</option>
                        <option value="te">తెలుగు (Telugu)</option>
                      </select>
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
                      Set up your GST, address, and invoice transaction currencies.
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
                        Recommended: High resolution, transparent PNG.
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
                      <Label htmlFor="biz-type">Business Type</Label>
                      <Input
                        id="biz-type"
                        value={business.category}
                        onChange={(e) =>
                          setBusiness((prev) => ({ ...prev, category: e.target.value }))
                        }
                        placeholder="Grocery & Retail"
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
                      <Label htmlFor="biz-pan">PAN</Label>
                      <Input
                        id="biz-pan"
                        value={business.pan}
                        onChange={(e) =>
                          setBusiness((prev) => ({ ...prev, pan: e.target.value }))
                        }
                        placeholder="ABCDE1234F"
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
                      <Label htmlFor="biz-web">Website URL</Label>
                      <Input
                        id="biz-web"
                        value={business.website}
                        onChange={(e) =>
                          setBusiness((prev) => ({ ...prev, website: e.target.value }))
                        }
                        placeholder="https://saimart.in"
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
                      <Label htmlFor="biz-city">City</Label>
                      <Input
                        id="biz-city"
                        value={business.city}
                        onChange={(e) =>
                          setBusiness((prev) => ({ ...prev, city: e.target.value }))
                        }
                        placeholder="Vijayawada"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="biz-state">State / Region</Label>
                      <Input
                        id="biz-state"
                        value={business.state}
                        onChange={(e) =>
                          setBusiness((prev) => ({ ...prev, state: e.target.value }))
                        }
                        placeholder="Andhra Pradesh"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="biz-pin">Pincode</Label>
                      <Input
                        id="biz-pin"
                        value={business.pincode}
                        onChange={(e) =>
                          setBusiness((prev) => ({ ...prev, pincode: e.target.value }))
                        }
                        placeholder="520010"
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

              {/* Branding Card */}
              {activeTab === "branding" && (
                <div className="rounded-2xl border border-border/50 bg-card p-6 md:p-8 shadow-sm backdrop-blur-md space-y-6">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                      Invoices & Branding
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Customize generated invoice design elements, prefix formats, and terms.
                    </p>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2 border-b border-border/30 pb-6">
                    <div className="space-y-2">
                      <Label>Standard Invoice Logo</Label>
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 overflow-hidden rounded-lg bg-secondary flex items-center justify-center border border-border">
                          {branding.invoiceLogo ? (
                            <img
                              src={branding.invoiceLogo}
                              alt="Invoice Logo"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Building className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <input
                            type="file"
                            ref={invoiceLogoInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={(e) =>
                              handleFileChange(e, (url) =>
                                setBranding((prev) => ({ ...prev, invoiceLogo: url })),
                              )
                            }
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="cursor-pointer"
                            onClick={() => invoiceLogoInputRef.current?.click()}
                          >
                            Upload Logo
                          </Button>
                          {branding.invoiceLogo && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive cursor-pointer h-7 p-0"
                              onClick={() =>
                                setBranding((prev) => ({ ...prev, invoiceLogo: "" }))
                              }
                            >
                              Remove Logo
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="brand-primary">Primary Theme Color</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            id="brand-primary"
                            value={branding.primaryColor}
                            onChange={(e) =>
                              setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))
                            }
                            className="h-9 w-12 rounded border border-input cursor-pointer p-0.5"
                          />
                          <Input
                            value={branding.primaryColor}
                            onChange={(e) =>
                              setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))
                            }
                            className="font-mono text-xs uppercase"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="brand-accent">Accent Color</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            id="brand-accent"
                            value={branding.accentColor}
                            onChange={(e) =>
                              setBranding((prev) => ({ ...prev, accentColor: e.target.value }))
                            }
                            className="h-9 w-12 rounded border border-input cursor-pointer p-0.5"
                          />
                          <Input
                            value={branding.accentColor}
                            onChange={(e) =>
                              setBranding((prev) => ({ ...prev, accentColor: e.target.value }))
                            }
                            className="font-mono text-xs uppercase"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="brand-prefix">Invoice Prefix</Label>
                      <Input
                        id="brand-prefix"
                        value={branding.invoicePrefix}
                        onChange={(e) =>
                          setBranding((prev) => ({ ...prev, invoicePrefix: e.target.value }))
                        }
                        placeholder="INV-"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="brand-footer">Invoice Terms & Footer Policy</Label>
                      <Textarea
                        id="brand-footer"
                        value={branding.invoiceFooter}
                        onChange={(e) =>
                          setBranding((prev) => ({ ...prev, invoiceFooter: e.target.value }))
                        }
                        placeholder="Terms and conditions, return policy details, payment details, etc."
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      className="cursor-pointer font-semibold min-w-32 gap-2"
                      disabled={savingSection === "branding"}
                      onClick={() =>
                        handleSave("branding", () => updateBrandingSettings({ branding }))
                      }
                    >
                      {savingSection === "branding" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" /> Save Branding
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
                      Select how and when you want to receive shop activity notifications.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-border/30 rounded-xl hover:bg-muted/30 transition-colors">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">Email Alerts</Label>
                        <p className="text-xs text-muted-foreground">
                          Receive reports, invoices, and supplier receipts by email.
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
                          Send customer billing and reminders instantly via WhatsApp.
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
                          Show in-app toast notices when running the browser window.
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
                          Receive background alerts directly on your devices.
                        </p>
                      </div>
                      <Switch
                        checked={notifications.push}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({ ...prev, push: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-border/30 rounded-xl hover:bg-muted/30 transition-colors">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">Low Stock Thresholds</Label>
                        <p className="text-xs text-muted-foreground">
                          Warn if item inventory dips below critical margins.
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
                        <Label className="text-sm font-semibold">Invoice Payment confirmations</Label>
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
                        <Label className="text-sm font-semibold">AI Insights Alerts</Label>
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
                      Secure your account settings, enable 2FA, and manage connected devices.
                    </p>
                  </div>

                  <form onSubmit={handlePasswordChange} className="space-y-4 border-b border-border/30 pb-6">
                    <h3 className="text-sm font-semibold text-foreground">Change Password</h3>
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
                        className="cursor-pointer gap-2"
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

                  <div className="space-y-4 border-b border-border/30 pb-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">Two-Factor Authentication (2FA)</Label>
                        <p className="text-xs text-muted-foreground">
                          Protect your account by adding an extra layer of verification security.
                        </p>
                      </div>
                      <Switch
                        checked={twoFactor}
                        onCheckedChange={(checked) => {
                          setTwoFactor(checked);
                          toast.success(checked ? "2FA Setup Triggered" : "2FA Disabled");
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">Active Sessions & Devices</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 cursor-pointer"
                        onClick={() => toast.success("Revoked all sessions on other devices")}
                      >
                        Revoke All Other Sessions
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 border border-border/30 rounded-xl bg-muted/20">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Chrome on macOS (Current)</p>
                          <p className="text-xs text-muted-foreground">IP: 192.168.1.10 — Vijayawada, India</p>
                        </div>
                        <span className="text-[10px] font-semibold text-accent-brand bg-accent-brand/10 px-2.5 py-1 rounded-full">
                          Active Now
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-4 border border-border/30 rounded-xl hover:bg-muted/20 transition-colors">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Safari on iPhone 15 Pro</p>
                          <p className="text-xs text-muted-foreground">IP: 103.88.24.4 — Hyderabad, India</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive cursor-pointer h-8"
                          onClick={() => toast.success("iPhone session revoked successfully")}
                        >
                          Revoke
                        </Button>
                      </div>
                    </div>
                  </div>
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
                      Configure color schemes, date formatting, and regional parameters.
                    </p>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Interface Theme Mode</Label>
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
                      <Label htmlFor="pref-lang">Interface Language</Label>
                      <select
                        id="pref-lang"
                        value={preferences.language}
                        onChange={(e) =>
                          setPreferences((prev) => ({ ...prev, language: e.target.value }))
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="en">English (US)</option>
                        <option value="hi">Hindi</option>
                        <option value="te">Telugu</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pref-currency">Currency Format</Label>
                      <select
                        id="pref-currency"
                        value={preferences.currency}
                        onChange={(e) =>
                          setPreferences((prev) => ({ ...prev, currency: e.target.value }))
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="INR">Lakhs (Rs 1,00,000.00)</option>
                        <option value="USD">Millions ($100,000.00)</option>
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
                      <Label htmlFor="pref-num">Number Layout Format</Label>
                      <select
                        id="pref-num"
                        value={preferences.numberFormat}
                        onChange={(e) =>
                          setPreferences((prev) => ({ ...prev, numberFormat: e.target.value }))
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="en-IN">Indian system (10,00,000)</option>
                        <option value="en-US">US system (1,000,000)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pref-start">Default Start Page</Label>
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

              {/* AI Settings Card */}
              {activeTab === "ai" && (
                <div className="rounded-2xl border border-border/50 bg-card p-6 md:p-8 shadow-sm backdrop-blur-md space-y-6">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                      AI Copilot Configuration
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Define the persona characteristics and context boundaries for ShopPilot AI.
                    </p>
                  </div>

                  <div className="grid gap-6">
                    <div className="space-y-2">
                      <Label>AI Copilot Personality Persona</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "professional", label: "Professional", desc: "Concise & analytical" },
                          { id: "friendly", label: "Friendly", desc: "Conversational & supportive" },
                          { id: "creative", label: "Executive", desc: "Strategical insights" },
                        ].map((p) => {
                          const selected = aiSettings.personality === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() =>
                                setAiSettings((prev) => ({ ...prev, personality: p.id }))
                              }
                              className={`flex flex-col items-start gap-1 p-4 border rounded-xl cursor-pointer text-left transition-all ${
                                selected
                                  ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                                  : "border-border/60 hover:bg-muted"
                              }`}
                            >
                              <span className="text-sm font-semibold">{p.label}</span>
                              <span className="text-[10px] text-muted-foreground leading-normal">{p.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Preferred Response Length</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "short", label: "Short (Bullet points)" },
                          { id: "medium", label: "Medium (Standard)" },
                          { id: "long", label: "Long (Detailed reports)" },
                        ].map((len) => {
                          const selected = aiSettings.responseLength === len.id;
                          return (
                            <button
                              key={len.id}
                              type="button"
                              onClick={() =>
                                setAiSettings((prev) => ({ ...prev, responseLength: len.id }))
                              }
                              className={`p-3 border rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                                selected
                                  ? "border-primary bg-primary/5 text-primary"
                                  : "border-border/60 hover:bg-muted"
                              }`}
                            >
                              {len.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="ai-context">Custom Business Context for AI</Label>
                      <Textarea
                        id="ai-context"
                        value={aiSettings.businessContext}
                        onChange={(e) =>
                          setAiSettings((prev) => ({ ...prev, businessContext: e.target.value }))
                        }
                        placeholder="Explain unique details about your store, business rules, or customer preferences that you want the AI assistant to remember."
                        rows={4}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-border/30 rounded-xl hover:bg-muted/30 transition-colors">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">Enable Voice Mode / Speech Synthesizer</Label>
                        <p className="text-xs text-muted-foreground">
                          Support voice answers and dictation interfaces in the AI copilot chat.
                        </p>
                      </div>
                      <Switch
                        checked={aiSettings.enableVoice}
                        onCheckedChange={(checked) =>
                          setAiSettings((prev) => ({ ...prev, enableVoice: checked }))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      className="cursor-pointer font-semibold min-w-32 gap-2"
                      disabled={savingSection === "ai"}
                      onClick={() =>
                        handleSave("ai", () => updateAiSettings({ aiSettings }))
                      }
                    >
                      {savingSection === "ai" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" /> Save AI Persona
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Backup Card */}
              {activeTab === "backup" && (
                <div className="rounded-2xl border border-border/50 bg-card p-6 md:p-8 shadow-sm backdrop-blur-md space-y-6">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                      Backup & Export Tools
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Export your reports, inventory logs, customers, or download a full database backup.
                    </p>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="p-5 border border-border/30 rounded-xl bg-card space-y-3">
                      <h3 className="font-semibold text-sm">Export Store Analytics</h3>
                      <p className="text-xs text-muted-foreground">
                        Download raw spreadsheets of billing activity, sales logs, and customer sheets.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="cursor-pointer w-full"
                          onClick={() => toast.success("Initiating CSV Export...")}
                        >
                          Export CSV
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="cursor-pointer w-full"
                          onClick={() => toast.success("Initiating JSON Export...")}
                        >
                          Export JSON
                        </Button>
                      </div>
                    </div>

                    <div className="p-5 border border-border/30 rounded-xl bg-card space-y-3">
                      <h3 className="font-semibold text-sm">Database System Backup</h3>
                      <p className="text-xs text-muted-foreground">
                        Create a secure snapshot containing all products, suppliers, and purchase history.
                      </p>
                      <Button
                        variant="default"
                        size="sm"
                        className="cursor-pointer w-full gap-2"
                        onClick={() => toast.success("System snapshot generated. Download starting...")}
                      >
                        Download Backup ZIP
                      </Button>
                    </div>

                    <div className="p-5 border border-border/30 rounded-xl bg-card space-y-3 md:col-span-2">
                      <h3 className="font-semibold text-sm">Import Data from CSV</h3>
                      <p className="text-xs text-muted-foreground">
                        Batch import inventory catalog list or supplier sheets directly into the database.
                      </p>
                      <div className="flex items-center gap-3">
                        <Input type="file" className="cursor-pointer text-xs" accept=".csv" />
                        <Button
                          variant="outline"
                          size="sm"
                          className="cursor-pointer shrink-0"
                          onClick={() => toast.success("Catalog imported successfully")}
                        >
                          Run Import
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* About Card */}
              {activeTab === "about" && (
                <div className="rounded-2xl border border-border/50 bg-card p-6 md:p-8 shadow-sm backdrop-blur-md space-y-6">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                      About ShopPilot AI
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      General system info, tour wizard, and product specifications.
                    </p>
                  </div>

                  <div className="border border-border/30 rounded-xl divide-y divide-border/30 text-sm">
                    <div className="flex justify-between p-4">
                      <span className="font-medium text-muted-foreground">Product Version</span>
                      <span className="font-mono text-xs">v2.4.1 (Stable Release)</span>
                    </div>
                    <div className="flex justify-between p-4">
                      <span className="font-medium text-muted-foreground">Database Engine</span>
                      <span className="font-semibold">MongoDB Atlas</span>
                    </div>
                    <div className="flex justify-between p-4">
                      <span className="font-medium text-muted-foreground">AI Intelligence Model</span>
                      <span className="font-semibold">Gemini Flash 3.5</span>
                    </div>
                    <div className="flex justify-between p-4">
                      <span className="font-medium text-muted-foreground">Author / Developer</span>
                      <span className="font-semibold">Advanced Agentic Coding Team</span>
                    </div>
                  </div>

                  <div className="p-5 border border-border/30 rounded-xl bg-primary/5 space-y-3">
                    <h3 className="font-semibold text-sm">Interactive Guide Tour Wizard</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Restart the guided wizard walkthrough to learn how to navigate and manage your store
                      invoices, products, and customer profiles.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="cursor-pointer text-xs"
                      onClick={() => {
                        localStorage.removeItem("sp_onboarding_completed");
                        localStorage.removeItem("sp_welcome_seen");
                        toast.success("Tour restarted", {
                          description: "Welcome back! Starting the product tour.",
                        });
                        void navigate({ to: "/dashboard" });
                      }}
                    >
                      Restart Welcome Tour
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
