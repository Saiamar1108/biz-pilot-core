import { createFileRoute } from "@tanstack/react-router";
import { AssistantPage } from "@/components/assistant/AssistantPage";
import { requireAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/assistant")({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: "AI Assistant — ShopPilot AI" }] }),
  component: AssistantPage,
});
