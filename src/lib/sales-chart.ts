import type { Invoice } from "@/lib/api";

function startOfDay(date: Date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const PENDING_STATUSES = new Set(["pending", "sent", "partial", "overdue"]);

function getOutstandingAmount(invoice: Invoice) {
  if (!PENDING_STATUSES.has(invoice.status)) return 0;
  if (invoice.status === "partial") {
    return invoice.pendingAmount > 0
      ? invoice.pendingAmount
      : Math.max(0, invoice.amount - invoice.paidAmount);
  }
  return invoice.amount;
}

export function getLast7Days(referenceDate = new Date()) {
  const today = startOfDay(referenceDate);
  const days: Date[] = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    days.push(day);
  }

  return days;
}

export function formatChartDayLabel(date: Date) {
  const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
  const monthDay = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${dayName} (${monthDay})`;
}

export type SalesChartPoint = {
  m: string;
  collected: number;
  pending: number;
};

export function buildLast7DaysRevenue(
  invoices: Invoice[],
  referenceDate = new Date(),
): SalesChartPoint[] {
  const last7Days = getLast7Days(referenceDate);
  const rangeStart = last7Days[0];

  const salesMap = invoices.reduce<Record<string, { collected: number; pending: number }>>(
    (acc, invoice) => {
      if (!invoice.createdAt) return acc;

      const createdAt = new Date(invoice.createdAt);
      if (Number.isNaN(createdAt.getTime())) return acc;

      const day = startOfDay(createdAt);
      if (day < rangeStart) return acc;

      const key = toDateKey(day);
      const current = acc[key] ?? { collected: 0, pending: 0 };

      if (invoice.status === "paid" || invoice.paidAmount > 0) {
        current.collected += invoice.paidAmount || invoice.amount;
      }

      const outstanding = getOutstandingAmount(invoice);
      if (outstanding > 0) {
        current.pending += outstanding;
      }

      acc[key] = current;
      return acc;
    },
    {},
  );

  return last7Days.map((day) => ({
    m: formatChartDayLabel(day),
    collected: salesMap[toDateKey(day)]?.collected ?? 0,
    pending: salesMap[toDateKey(day)]?.pending ?? 0,
  }));
}
