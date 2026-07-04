import { createFileRoute, redirect } from "@tanstack/react-router";
import { PinSetupScreen } from "@/components/auth/PinSetupScreen";

export const Route = createFileRoute("/pin-setup")({
  beforeLoad: () => {
    const skipped = typeof window !== "undefined" && sessionStorage.getItem("sp_pin_skipped") === "true";
    if (skipped) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({ meta: [{ title: "Set Shop PIN — ShopPilot AI" }] }),
  component: PinSetupScreen,
});