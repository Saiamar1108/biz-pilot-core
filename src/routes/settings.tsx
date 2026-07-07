import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSettings, updateBusinessSettings, type BusinessProfile } from "@/lib/api";
import { requireAuth } from "@/lib/auth-guard";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "Settings — ShopPilot AI" }] }),
  component: SettingsPage,
});

type Profile = {
  fullName?: string;
  email?: string;
  phone?: string;
  timezone?: string;
  imageDataUrl?: string;
};

function SettingsPage() {
  const [profile, setProfile] = useState<Profile>({});
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [upiId, setUpiId] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingUpi, setSavingUpi] = useState(false);
  const [upiError, setUpiError] = useState<string | null>(null);
  const [upiSaved, setUpiSaved] = useState(false);

  useEffect(() => {
    let active = true;
    getSettings()
      .then((settings) => {
        if (!active) return;
        setProfile(settings.profile || {});
        setBusiness(settings.business || null);
        setUpiId(settings.business?.upiId || "");
        setTaxRate(settings.taxRate != null ? `${Number(settings.taxRate) * 100}%` : "");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const saveUpiId = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextUpiId = upiId.trim();
    if (nextUpiId && !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9]{2,64}$/.test(nextUpiId)) {
      setUpiError("Enter a valid UPI ID, for example store@okaxis.");
      return;
    }

    try {
      setSavingUpi(true);
      setUpiError(null);
      const updated = await updateBusinessSettings({ business: { upiId: nextUpiId } });
      setBusiness((current) => ({ ...(current || updated.business), ...updated.business }));
      setUpiId(updated.business.upiId || "");
      toast.success("UPI ID saved successfully.");
      setUpiSaved(true);
      setTimeout(() => setUpiSaved(false), 2000);
    } catch (err) {
      const responseMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      const text =
        responseMessage || (err instanceof Error ? err.message : "Unable to save Business UPI ID.");
      setUpiError(text);
      toast.error(text);
    } finally {
      setSavingUpi(false);
    }
  };

  return (
    <DashboardLayout title="Settings">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Profile and business details</p>
        </div>

        {loading ? (
          <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
            Loading settings...
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold">Profile</h2>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-full bg-secondary">
                  {profile.imageDataUrl && (
                    <img src={profile.imageDataUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="text-sm text-muted-foreground">Photo</div>
              </div>
              <div>
                <Label>Name</Label>
                <Input value={profile.fullName || ""} readOnly className="mt-1" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={profile.phone || ""} readOnly className="mt-1" />
              </div>
            </div>

            <div className="rounded-lg border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold">Business</h2>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-lg bg-secondary">
                  {business?.logoDataUrl && (
                    <img src={business.logoDataUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="text-sm text-muted-foreground">Logo</div>
              </div>
              <div>
                <Label>Business name</Label>
                <Input value={business?.storeName || ""} readOnly className="mt-1" />
              </div>
              <div>
                <Label>Business info</Label>
                <Input value={business?.category || ""} readOnly className="mt-1" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={business?.phone || ""} readOnly className="mt-1" />
              </div>
              <div>
                <Label>Address</Label>
                <Input value={business?.address || ""} readOnly className="mt-1" />
              </div>
              <form className="space-y-2" onSubmit={saveUpiId}>
                <Label htmlFor="business-upi-id">Business UPI ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="business-upi-id"
                    value={upiId}
                    onChange={(event) => setUpiId(event.target.value)}
                    placeholder="store@okaxis"
                    className="mt-1"
                  />
                  <Button type="submit" className="mt-1" disabled={savingUpi || upiSaved}>
                    {upiSaved ? "✓ Saved" : savingUpi ? "Saving..." : "Save"}
                  </Button>
                </div>
                {upiError && <p className="text-sm text-destructive">{upiError}</p>}
              </form>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>GST</Label>
                  <Input value={business?.gstNumber || ""} readOnly className="mt-1" />
                </div>
                <div>
                  <Label>Tax</Label>
                  <Input value={taxRate} readOnly className="mt-1" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
