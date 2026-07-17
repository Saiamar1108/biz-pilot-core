import type { Customer, Invoice } from "@/lib/api";

export function calculateInvoiceProfit(invoice: Invoice): number | null {
  const hasHistorical = invoice.lineItems.some(
    (item) => item.costPrice === undefined || item.costPrice === null || item.costPrice <= 0,
  );
  if (hasHistorical) {
    return null;
  }
  return invoice.lineItems.reduce((sum, item) => {
    const cost = item.costPrice ?? 0;
    return sum + (item.unitPrice - cost) * item.quantity;
  }, 0);
}

export function detectDuplicateInvoices(invoices: Invoice[]) {
  const signatures = new Map<string, Invoice[]>();

  for (const invoice of invoices) {
    const productKey = invoice.lineItems
      .map((item) => `${item.productId}:${item.quantity}:${item.unitPrice}`)
      .sort()
      .join("|");
    const signature = `${invoice.customerId}|${invoice.amount}|${productKey}`;
    const group = signatures.get(signature) || [];
    group.push(invoice);
    signatures.set(signature, group);
  }

  const duplicates = new Set<string>();
  for (const group of signatures.values()) {
    if (group.length > 1) {
      for (const invoice of group) duplicates.add(invoice.id);
    }
  }
  return duplicates;
}

export function getTopUnpaidCustomers(invoices: Invoice[], customers: Customer[], limit = 5) {
  const pendingByCustomer = new Map<string, { name: string; pending: number; count: number }>();

  for (const invoice of invoices) {
    if (invoice.status === "paid") continue;
    const outstanding =
      invoice.status === "partial"
        ? invoice.pendingAmount || Math.max(0, invoice.amount - invoice.paidAmount)
        : invoice.amount;
    if (outstanding <= 0) continue;

    const current = pendingByCustomer.get(invoice.customerId) || {
      name: invoice.customer,
      pending: 0,
      count: 0,
    };
    current.pending += outstanding;
    current.count += 1;
    pendingByCustomer.set(invoice.customerId, current);
  }

  return [...pendingByCustomer.entries()]
    .map(([id, row]) => ({
      id,
      name: row.name,
      pendingAmount: row.pending,
      invoiceCount: row.count,
      customer: customers.find((c) => c.id === id),
    }))
    .sort((a, b) => b.pendingAmount - a.pendingAmount)
    .slice(0, limit);
}

export function getCustomerLifetimeValue(customer: Customer) {
  return customer.totalSpent || customer.spent || 0;
}

export function isBestCustomer(customer: Customer) {
  return customer.customerType === "VIP" || customer.status === "vip";
}

export function getMostPurchasedProducts(invoices: Invoice[], limit = 5) {
  const counts = new Map<string, { name: string; units: number; revenue: number }>();

  for (const invoice of invoices) {
    for (const item of invoice.lineItems) {
      const key = item.productId || item.productName;
      const row = counts.get(key) || {
        name: item.productName,
        units: 0,
        revenue: 0,
      };
      row.units += item.quantity;
      row.revenue += item.lineTotal;
      counts.set(key, row);
    }
  }

  return [...counts.values()].sort((a, b) => b.units - a.units).slice(0, limit);
}

export function exportInvoicesCsv(invoices: Invoice[]) {
  const header = ["Invoice", "Customer", "Date", "Status", "Total", "Paid", "Pending", "Profit"];

  const rows = invoices.map((invoice) => [
    invoice.id,
    invoice.customer,
    invoice.date,
    invoice.status,
    invoice.amount,
    invoice.paidAmount,
    invoice.status === "paid"
      ? 0
      : invoice.status === "partial"
        ? invoice.pendingAmount
        : invoice.amount,
    (() => {
      const profit = calculateInvoiceProfit(invoice);
      return profit === null ? "Profit unavailable for historical invoices." : profit.toFixed(2);
    })(),
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
