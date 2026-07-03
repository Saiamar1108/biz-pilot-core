const numberOrZero = (value) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

function sanitizeUpiId(upiId) {
  return String(upiId || "")
    .trim()
    .replace(/\s+/g, "");
}

function buildUpiPaymentUrl({ upiId, payeeName, amount, note }) {
  const pa = sanitizeUpiId(upiId);
  if (!pa) return "";

  const params = new URLSearchParams();
  params.set("pa", pa);
  if (payeeName) params.set("pn", payeeName.slice(0, 50));
  if (amount > 0) params.set("am", numberOrZero(amount).toFixed(2));
  if (note) params.set("tn", note.slice(0, 80));

  return `upi://pay?${params.toString()}`;
}

function buildQrImageUrl(paymentUrl, size = 200) {
  if (!paymentUrl) return "";
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(paymentUrl)}`;
}

function generatePaymentQRCode({ upiId, payeeName, amount, note, size = 200 }) {
  const paymentUrl = buildUpiPaymentUrl({ upiId, payeeName, amount, note });
  return {
    paymentUrl,
    qrImageUrl: buildQrImageUrl(paymentUrl, size),
  };
}

module.exports = {
  buildUpiPaymentUrl,
  buildQrImageUrl,
  generatePaymentQRCode,
};
