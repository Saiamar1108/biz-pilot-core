import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Key, Copy, Plus, Trash2 } from "lucide-react";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import {
  getSettings,
  updateNotifications,
  updateProfile,
  updateProfileImage,
  type NotificationSettings,
  type SettingsProfile,
} from "@/lib/api";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — ShopPilot AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<SettingsProfile>({
    fullName: "A. Sai Amar Chaitanya",
    email: "asaiamar@shoppilot.ai",
    phone: "+91 75696 81350",
    timezone: "Asia/Kolkata",
    imageDataUrl: "",
  });
  const [notifications, setNotifications] = useState<NotificationSettings>({
    invoiceNotifications: true,
    stockAlerts: true,
    paymentReminders: true,
    aiInsightsAlerts: false,
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [keys] = useState([
    { name: "Production", key: "sk_live_••••••••••••4a9f", created: "Mar 12, 2026" },
    { name: "Development", key: "sk_test_••••••••••••81ac", created: "Jan 4, 2026" },
  ]);

  useEffect(() => {
    let active = true;

    getSettings()
      .then((settings) => {
        if (!active) return;
        setProfile(settings.profile);
        setNotifications(settings.notifications);
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

  return (
    <DashboardLayout title="Settings">
      <div className="max-w-4xl">
        <Tabs defaultValue="profile">
          <TabsList className="mb-6 bg-secondary/60 p-1 h-11">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="api">API Keys</TabsTrigger>
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
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h3 className="font-display text-lg font-bold">Business Details</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">Business Name</Label>
                  <Input defaultValue="Amari General Store" />
                </div>
                <div>
                  <Label className="mb-2 block">Tax ID</Label>
                  <Input defaultValue="TAX-2938-AZ" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-2 block">Address</Label>
                  <Input defaultValue="221B Baker Street, Suite 3, London" />
                </div>
                <div>
                  <Label className="mb-2 block">Currency</Label>
                  <Input defaultValue="USD" />
                </div>
                <div>
                  <Label className="mb-2 block">Tax Rate</Label>
                  <Input defaultValue="8%" />
                </div>
              </div>
              <Button className="gradient-primary text-primary-foreground">Update Business</Button>
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

          <TabsContent value="api">
            <div className="glass-card rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold">API Keys</h3>
                  <p className="text-sm text-muted-foreground">Manage keys for the ShopPilot API</p>
                </div>
                <Button className="gradient-primary text-primary-foreground">
                  <Plus className="h-4 w-4 mr-1" /> New Key
                </Button>
              </div>
              <div className="space-y-3">
                {keys.map((k) => (
                  <div
                    key={k.key}
                    className="flex items-center gap-3 p-4 rounded-xl border border-border bg-background"
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <Key className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm">{k.name}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate">
                        {k.key}
                      </div>
                    </div>
                    <div className="hidden sm:block text-xs text-muted-foreground shrink-0">
                      {k.created}
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="shrink-0 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
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
