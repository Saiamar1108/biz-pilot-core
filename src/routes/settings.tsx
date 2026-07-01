import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Key, Copy, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — ShopPilot AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [keys] = useState([
    { name: "Production", key: "sk_live_••••••••••••4a9f", created: "Mar 12, 2026" },
    { name: "Development", key: "sk_test_••••••••••••81ac", created: "Jan 4, 2026" },
  ]);

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
                  <AvatarFallback className="gradient-primary text-primary-foreground font-bold text-xl">SA</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-display text-xl font-bold">Sara Amari</div>
                  <div className="text-sm text-muted-foreground mb-2">sara@shoppilot.ai</div>
                  <Button size="sm" variant="outline">Change Photo</Button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label className="mb-2 block">Full Name</Label><Input defaultValue="Sara Amari" /></div>
                <div><Label className="mb-2 block">Email</Label><Input type="email" defaultValue="sara@shoppilot.ai" /></div>
                <div><Label className="mb-2 block">Phone</Label><Input defaultValue="+1 555 0132" /></div>
                <div><Label className="mb-2 block">Timezone</Label><Input defaultValue="Pacific / San Francisco" /></div>
              </div>
              <Button className="gradient-primary text-primary-foreground">Save Changes</Button>
            </div>
          </TabsContent>

          <TabsContent value="business">
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h3 className="font-display text-lg font-bold">Business Details</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label className="mb-2 block">Business Name</Label><Input defaultValue="Amari General Store" /></div>
                <div><Label className="mb-2 block">Tax ID</Label><Input defaultValue="TAX-2938-AZ" /></div>
                <div className="sm:col-span-2"><Label className="mb-2 block">Address</Label><Input defaultValue="221B Baker Street, Suite 3, London" /></div>
                <div><Label className="mb-2 block">Currency</Label><Input defaultValue="USD" /></div>
                <div><Label className="mb-2 block">Tax Rate</Label><Input defaultValue="8%" /></div>
              </div>
              <Button className="gradient-primary text-primary-foreground">Update Business</Button>
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <div className="glass-card rounded-2xl p-6 space-y-1">
              {[
                { t: "Low stock alerts", d: "Get notified when products fall below threshold" },
                { t: "Daily sales summary", d: "Every morning at 9AM" },
                { t: "New customer signups", d: "Real-time notification" },
                { t: "AI weekly insights", d: "Personalized predictions every Monday" },
                { t: "Invoice paid", d: "When a customer completes payment" },
              ].map((n, i) => (
                <div key={n.t} className={`flex items-center justify-between py-4 ${i > 0 ? "border-t border-border" : ""}`}>
                  <div>
                    <div className="font-medium">{n.t}</div>
                    <div className="text-sm text-muted-foreground">{n.d}</div>
                  </div>
                  <Switch defaultChecked={i < 3} />
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
                <Button className="gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" /> New Key</Button>
              </div>
              <div className="space-y-3">
                {keys.map((k) => (
                  <div key={k.key} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-background">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <Key className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm">{k.name}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate">{k.key}</div>
                    </div>
                    <div className="hidden sm:block text-xs text-muted-foreground shrink-0">{k.created}</div>
                    <Button variant="ghost" size="icon" className="shrink-0"><Copy className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="shrink-0 text-destructive"><Trash2 className="h-4 w-4" /></Button>
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
