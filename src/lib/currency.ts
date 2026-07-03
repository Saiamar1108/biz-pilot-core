const inrFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number) {
  return `₹${inrFormatter.format(Math.round(Number(value) || 0))}`;
}
