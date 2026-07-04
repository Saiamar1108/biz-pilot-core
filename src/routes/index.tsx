import { createFileRoute } from "@tanstack/react-router";
import { LandingNavbar } from "@/components/marketing/LandingNavbar";
import { LandingHero } from "@/components/marketing/LandingHero";
import { LandingFeatures } from "@/components/marketing/LandingFeatures";
import { LandingSocialProof } from "@/components/marketing/LandingSocialProof";
import { LandingWorkflow } from "@/components/marketing/LandingWorkflow";
import { LandingFooter } from "@/components/marketing/LandingFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ShopPilot AI — Business software for modern shops" },
      {
        name: "description",
        content:
          "Invoice faster, manage inventory, and understand your business with ShopPilot AI — built for retail and SME operators.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingFeatures />
        <LandingSocialProof />
        <LandingWorkflow />
      </main>
      <LandingFooter />
    </div>
  );
}
