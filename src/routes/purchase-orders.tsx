import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PurchaseOrderGenerator } from "@/components/inventory/PurchaseOrderGenerator";
import { getSettings } from "@/lib/api";

export const Route = createFileRoute("/purchase-orders")({
  head: () => ({ meta: [{ title: "Purchase Orders — ShopPilot AI" }] }),
  component: PurchaseOrdersPage,
});

function PurchaseOrdersPage() {
  const [businessName, setBusinessName] = useState("ShopPilot AI");

  useEffect(() => {
    let active = true;
    getSettings().then((settings) => {
      if (active) setBusinessName(settings.business?.storeName || "ShopPilot AI");
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <DashboardLayout title="Purchase Orders">
      <PurchaseOrderGenerator businessName={businessName} embedded />
    </DashboardLayout>
  );
}
