export function formatCurrency(value: number) {
  if (typeof window === "undefined") {
    return `₹${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;
  }

  const currency = localStorage.getItem("sp_currency") || "INR";
  const numberFormat = localStorage.getItem("sp_number_format") || "en-IN";
  
  let symbol = "₹";
  let locale = "en-IN";
  
  if (currency === "USD") {
    symbol = "$";
    locale = "en-US";
  } else if (currency === "EUR") {
    symbol = "€";
    locale = "de-DE";
  } else if (currency === "GBP") {
    symbol = "£";
    locale = "en-GB";
  }
  
  if (numberFormat) {
    locale = numberFormat;
  }
  
  const formatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  });
  
  return `${symbol}${formatter.format(Math.round(Number(value) || 0))}`;
}
