import type { Product } from "@/lib/api";

export type ExpiryStatus = "expired" | "critical" | "warning" | "good" | null;

export function getDaysUntilExpiry(expiryDate: string | null | undefined): number | null {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function getExpiryStatus(expiryDate: string | null | undefined): ExpiryStatus {
  const daysUntil = getDaysUntilExpiry(expiryDate);
  if (daysUntil === null) return null;
  if (daysUntil < 0) return "expired";
  if (daysUntil <= 7) return "critical";
  if (daysUntil <= 30) return "warning";
  return "good";
}

export function getExpiryBadgeColor(status: ExpiryStatus): string {
  switch (status) {
    case "expired":
      return "bg-red-100 text-red-700 border-red-200";
    case "critical":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "warning":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "good":
      return "bg-green-100 text-green-700 border-green-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export function getExpiryBadgeText(status: ExpiryStatus, daysUntil: number | null): string {
  switch (status) {
    case "expired":
      return "Expired";
    case "critical":
      return `Expires in ${daysUntil} days`;
    case "warning":
      return `Expires in ${daysUntil} days`;
    case "good":
      return "";
    default:
      return "No expiry";
  }
}

export function formatExpiryDate(expiryDate: string | null | undefined): string {
  if (!expiryDate) return "—";
  const date = new Date(expiryDate);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
