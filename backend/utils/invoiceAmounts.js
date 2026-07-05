const PENDING_BUCKET_STATUSES = new Set(["pending", "sent", "overdue", "partial"]);

const numberOrZero = (value) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

function getOutstandingAmount(invoice) {
  const status = String(invoice?.status || "");

  if (!PENDING_BUCKET_STATUSES.has(status)) {
    return 0;
  }

  const total = numberOrZero(invoice.total ?? invoice.amount);
  const paidAmount = numberOrZero(invoice.paidAmount);

  if (status === "partial") {
    const storedPending = invoice.pendingAmount;
    if (storedPending != null && storedPending > 0) {
      return numberOrZero(storedPending);
    }
    return Math.max(0, total - paidAmount);
  }

  return total;
}

module.exports = {
  PENDING_BUCKET_STATUSES,
  getOutstandingAmount,
  numberOrZero,
};
