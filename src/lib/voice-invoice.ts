import type { Customer, Product } from "@/lib/api";

export type VoiceAction =
  | "download"
  | "send"
  | "generate_invoice"
  | "mark_paid"
  | "next_customer"
  | "clear"
  | null;

export type ParsedVoiceLine = {
  productId: string;
  productName: string;
  qty: number;
  price: number;
};

export type ParsedVoiceInvoice = {
  heard: string;
  customerId: string | null;
  customerName: string | null;
  lines: ParsedVoiceLine[];
  action: VoiceAction;
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

function parseQuantity(token: string) {
  const numeric = Number(token);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  return NUMBER_WORDS[token] ?? null;
}

export function detectVoiceAction(text: string): VoiceAction {
  const normalized = normalizeText(text);
  if (/\bdownload\s+invoice\b/.test(normalized)) return "download";
  if (/\bsend\s+invoice\b/.test(normalized)) return "send";
  if (/\bgenerate\s+invoice\b/.test(normalized)) return "generate_invoice";
  if (/\bmark\s+(?:as\s+)?paid\b/.test(normalized)) return "mark_paid";
  if (/\bnext\s+customer\b/.test(normalized)) return "next_customer";
  if (/\bclear\s+invoice\b/.test(normalized)) return "clear";
  return null;
}

function scoreCustomerMatch(text: string, customer: Customer) {
  const normalized = normalizeText(text);
  const name = normalizeText(customer.name);
  if (!name) return 0;

  let score = 0;
  if (normalized.includes(name)) score += 100;

  const parts = name.split(" ").filter((part) => part.length > 1);
  for (const part of parts) {
    if (new RegExp(`\\b${part}\\b`).test(normalized)) score += 30;
    else if (normalized.includes(part)) score += 15;
  }

  const forMatch = normalized.match(/\bfor\s+([a-z]+(?:\s+[a-z]+)?)\b/);
  if (forMatch) {
    const target = forMatch[1];
    if (name.includes(target) || target.split(" ").every((word) => name.includes(word))) {
      score += 80;
    }
  }

  const customerMatch = normalized.match(/\bcustomer\s+([a-z]+(?:\s+[a-z]+)?)\b/);
  if (customerMatch) {
    const target = customerMatch[1];
    if (name.includes(target) || target.split(" ").every((word) => name.includes(word))) {
      score += 90;
    }
  }

  const boughtMatch = normalized.match(/^([a-z]+(?:\s+[a-z]+)?)\s+(?:bought|purchased|ordered)\b/);
  if (boughtMatch) {
    const target = boughtMatch[1];
    if (name.startsWith(target) || name.includes(target)) score += 70;
  }

  return score;
}

function findCustomer(text: string, customers: Customer[]) {
  const ranked = customers
    .map((customer) => ({ customer, score: scoreCustomerMatch(text, customer) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.customer ?? null;
}

function scoreProductMatch(segment: string, product: Product) {
  const segmentNorm = normalizeText(segment);
  if (!segmentNorm) return 0;

  const name = normalizeText(product.name);
  const sku = normalizeText(product.sku);
  let score = 0;

  if (segmentNorm.includes(name)) score += name.length + 60;
  if (name.includes(segmentNorm) && segmentNorm.length >= 3) score += segmentNorm.length + 40;
  if (segmentNorm.includes(sku)) score += sku.length + 35;

  const productTokens = name.split(" ").filter((word) => word.length > 2);
  const segmentTokens = segmentNorm.split(" ").filter((word) => word.length > 2);

  for (const token of segmentTokens) {
    if (productTokens.some((productToken) => productToken.includes(token) || token.includes(productToken))) {
      score += 25;
    }
  }

  for (const token of productTokens) {
    if (segmentNorm.includes(token)) score += 12;
  }

  return score;
}

function matchProduct(segment: string, products: Product[]) {
  const cleaned = normalizeText(
    segment
      .replace(/\bfor\s+[a-z]+(?:\s+[a-z]+)?\s*$/i, " ")
      .replace(/\b(add|for|customer|bought|purchased|ordered)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );

  const ranked = products
    .map((product) => ({ product, score: scoreProductMatch(cleaned, product) }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best || best.score < 20) return null;

  return best.product;
}

function extractQuantityProductPairs(text: string) {
  const normalized = normalizeText(text);
  const pairs: Array<{ qty: number; segment: string }> = [];

  const addPattern = /\badd\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(.+?)(?=\s+and\s+|\s+for\s+|$)/gi;
  let match = addPattern.exec(normalized);
  while (match) {
    const qty = parseQuantity(match[1]) ?? 1;
    const segment = match[2].trim();
    if (segment) pairs.push({ qty, segment });
    match = addPattern.exec(normalized);
  }

  if (!pairs.length) {
    const qtyPattern = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(.+?)(?=\s+and\s+|$)/gi;
    match = qtyPattern.exec(normalized);
    while (match) {
      const qty = parseQuantity(match[1]) ?? 1;
      const segment = match[2].trim();
      if (segment) pairs.push({ qty, segment });
      match = qtyPattern.exec(normalized);
    }
  }

  if (!pairs.length) {
    const afterBought = normalized.split(/\b(?:bought|purchased|ordered)\b/)[1];
    if (afterBought) {
      afterBought.split(/\band\b/).forEach((part) => {
        const match = part.trim().match(/^(\d+|one|two|three|four|five|six|seven|eight|nine|ten)?\s*(.+)$/);
        if (!match) return;
        const qty = match[1] ? parseQuantity(match[1]) ?? 1 : 1;
        pairs.push({ qty, segment: match[2].trim() });
      });
    }
  }

  return pairs;
}

function parseLines(text: string, products: Product[]) {
  const pairs = extractQuantityProductPairs(text);
  const lines: ParsedVoiceLine[] = [];
  const used = new Set<string>();

  for (const pair of pairs) {
    const product = matchProduct(pair.segment, products);
    if (!product) continue;

    const existing = lines.find((line) => line.productId === product.id);
    if (existing) {
      existing.qty += pair.qty;
      continue;
    }

    lines.push({
      productId: product.id,
      productName: product.name,
      qty: pair.qty,
      price: product.price,
    });
  }

  if (!lines.length) {
    const sorted = [...products].sort((a, b) => b.name.length - a.name.length);
    const normalized = normalizeText(text);
    for (const product of sorted) {
      const name = normalizeText(product.name);
      const keywords = name.split(" ").filter((word) => word.length > 3);
      const hit = keywords.some((word) => normalized.includes(word)) || normalized.includes(name);
      if (!hit || used.has(product.id)) continue;

      const qtyMatch = normalized.match(
        new RegExp(`(\\d+|one|two|three|four|five|six|seven|eight|nine|ten)\\s+(?:\\w+\\s+)*?${keywords[0]}`),
      );
      const qty = qtyMatch ? parseQuantity(qtyMatch[1]) ?? 1 : 1;
      used.add(product.id);
      lines.push({
        productId: product.id,
        productName: product.name,
        qty,
        price: product.price,
      });
    }
  }

  return lines;
}

export function parseVoiceInvoice(text: string, customers: Customer[], products: Product[]): ParsedVoiceInvoice {
  const heard = text.trim();
  const action = detectVoiceAction(heard);

  if (action) {
    return {
      heard,
      customerId: null,
      customerName: null,
      lines: [],
      action,
    };
  }

  const matchedCustomer = findCustomer(heard, customers);
  const lines = parseLines(heard, products);

  return {
    heard,
    customerId: matchedCustomer?.id ?? null,
    customerName: matchedCustomer?.name ?? null,
    lines,
    action: null,
  };
}

export function formatVoiceParseSummary(parsed: ParsedVoiceInvoice) {
  const items =
    parsed.lines.length > 0
      ? parsed.lines.map((line) => `${line.qty}× ${line.productName}`).join(", ")
      : "—";
  const action = parsed.action
    ? parsed.action.replace(/_/g, " ")
    : "—";

  return {
    customer: parsed.customerName ?? "—",
    items,
    action,
  };
}

export function isUnpaidInvoiceStatus(status: string) {
  return status === "pending" || status === "partial" || status === "sent" || status === "overdue";
}
