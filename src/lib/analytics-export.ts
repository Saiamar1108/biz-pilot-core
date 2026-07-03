import type { AnalyticsSummary } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { formatMonthLabel } from "@/lib/analytics";

function escapeCsv(value: string | number) {
  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportAnalyticsCsv(analytics: AnalyticsSummary) {
  const lines: string[] = [
    "ShopPilot AI Analytics Export",
    `Range,${escapeCsv(analytics.dateRange.label)}`,
    "",
    "Metric,Value",
    `Collected Revenue,${analytics.revenueReceived}`,
    `Pending Revenue,${analytics.pendingRevenue}`,
    `Total Billed,${analytics.totalBilled}`,
    `Profit,${analytics.profit}`,
    `Orders,${analytics.totalOrders}`,
    "",
    "Top Products,Name,Units,Revenue",
    ...analytics.topProducts.map((product) =>
      [product.name, product.sold, product.revenue].map(escapeCsv).join(","),
    ),
    "",
    "Top Customers,Name,Total Spent,Pending",
    ...analytics.topCustomers.map((customer) =>
      [customer.name, customer.totalSpent, customer.pendingAmount]
        .map(escapeCsv)
        .join(","),
    ),
    "",
    "Invoice Aging,Amount,Count",
    ...analytics.invoiceAging.map((bucket) =>
      [bucket.label, bucket.amount, bucket.count].map(escapeCsv).join(","),
    ),
  ];

  downloadBlob(
    `shoppilot-analytics-${new Date().toISOString().slice(0, 10)}.csv`,
    lines.join("\n"),
    "text/csv;charset=utf-8",
  );
}

export async function exportAnalyticsPdf(analytics: AnalyticsSummary) {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF();
  let y = 14;

  const writeln = (text: string, size = 11) => {
    if (y > 280) {
      doc.addPage();
      y = 14;
    }
    doc.setFontSize(size);
    doc.text(text, 14, y);
    y += size * 0.55;
  };

  writeln("ShopPilot AI — Analytics Report", 16);
  writeln(`Period: ${analytics.dateRange.label}`, 10);
  y += 4;

  writeln(`Collected: ${formatCurrency(analytics.revenueReceived)}`);
  writeln(`Pending: ${formatCurrency(analytics.pendingRevenue)}`);
  writeln(`Total Billed: ${formatCurrency(analytics.totalBilled)}`);
  writeln(`Profit: ${formatCurrency(analytics.profit)}`);
  writeln(`Orders: ${analytics.totalOrders}`);
  y += 4;

  writeln("Top Products", 13);
  for (const product of analytics.topProducts.slice(0, 5)) {
    writeln(
      `• ${product.name}: ${product.sold} sold, ${formatCurrency(product.revenue)}`,
      10,
    );
  }
  y += 2;

  writeln("Top Customers", 13);
  for (const customer of analytics.topCustomers.slice(0, 5)) {
    writeln(
      `• ${customer.name}: spent ${formatCurrency(customer.totalSpent)}, pending ${formatCurrency(customer.pendingAmount)}`,
      10,
    );
  }
  y += 2;

  writeln("Monthly Profit Trends", 13);
  for (const point of analytics.monthlyProfitTrends.slice(-6)) {
    writeln(
      `${formatMonthLabel(point.month)} — Collected ${formatCurrency(point.collected)}, Pending ${formatCurrency(point.pending)}, Profit ${formatCurrency(point.profit)}`,
      10,
    );
  }

  doc.save(`shoppilot-analytics-${new Date().toISOString().slice(0, 10)}.pdf`);
}
