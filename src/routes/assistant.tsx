import { createFileRoute } from "@tanstack/react-router";
import { AssistantPage } from "@/components/assistant/AssistantPage";

export const Route = createFileRoute("/assistant")({
  head: () => ({ meta: [{ title: "AI Assistant — ShopPilot AI" }] }),
  component: AssistantPage,
});
