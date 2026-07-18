import type { Customer, Product } from "@/lib/api";

export type VoiceAction =
  "download" | "send" | "generate_invoice" | "mark_paid" | "next_customer" | "clear" | null;

export type ParsedVoiceLine = {
  productId: string;
  productName: string;
  qty: number;
  price: number;
};

export type VoiceSuggestion = {
  originalSegment: string;
  qty: number;
  candidates: Array<{
    productId: string;
    productName: string;
    price: number;
    confidence: number;
  }>;
};

export type ParsedVoiceInvoice = {
  heard: string;
  customerId: string | null;
  customerName: string | null;
  lines: ParsedVoiceLine[];
  suggestions: VoiceSuggestion[];
  clarifications: string[];
  action: VoiceAction;
};

const NUMBER_WORDS: Record<string, number> = {
  half: 0.5,
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
  eleven: 11,
  dozen: 12,
  dozens: 12,
  double: 2,
  triple: 3,
};

const UNIT_MULTIPLIERS: Record<string, number> = {
  kilo: 1,
  kilos: 1,
  kg: 1,
  kgs: 1,
  gram: 0.001,
  grams: 0.001,
  g: 0.001,
  packet: 1,
  packets: 1,
  pkt: 1,
  dozen: 12,
  dozens: 12,
  piece: 1,
  pieces: 1,
  pc: 1,
  pcs: 1,
  pack: 1,
  packs: 1,
  bottle: 1,
  bottles: 1,
};

const ALIASES: Record<string, string[]> = {
  colgate: ["colgate", "max fresh", "maxfresh", "toothpaste", "col gate"],
  eggs: ["egg", "eggs", "farm fresh large eggs", "farm fresh eggs"],
  milk: ["milk", "dairy", "toned milk", "cow milk", "packet milk"],
  palak: ["palak", "spinach", "fresh green palak", "green palak"],
  potato: ["potato", "potatoes", "premium fresh potato", "potatos"],
  tomato: ["tomato", "tomatoes", "fresh tomato", "tamato", "tomatos"],
  onion: ["onion", "onions", "fresh onion", "orian", "onians"],
  bread: ["bread", "sandwich bread", "white bread", "wheat bread", "breadd"],
  biscuit: ["biscuit", "biscuits", "cookie", "cookies"],
  soap: ["soap", "soaps", "bath soap", "body wash"],
  sugar: ["sugar"],
  rice: ["rice", "basmati rice"],
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s\.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePlural(word: string): string {
  const plurals: Record<string, string> = {
    onions: "onion",
    eggs: "egg",
    potatoes: "potato",
    tomatoes: "tomato",
    biscuits: "biscuit",
    soaps: "soap",
    packets: "packet",
    buns: "bun",
    chocolates: "chocolate",
    apples: "apple",
    bananas: "banana",
    oranges: "orange",
    chips: "chip",
    sodas: "soda",
  };
  if (plurals[word]) return plurals[word];
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("es") && !word.endsWith("ses") && !word.endsWith("ches") && !word.endsWith("shes")) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseQuantityAndProduct(segment: string): { qty: number; cleanedProduct: string } {
  const words = segment
    .toLowerCase()
    .replace(/[^\w\s\.]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ");

  let qty = 1;
  let parsedQty = false;
  let startIndex = 0;

  if (words.length > 0) {
    const firstWord = words[0];
    const numeric = parseFloat(firstWord);
    if (!isNaN(numeric)) {
      qty = numeric;
      parsedQty = true;
      startIndex = 1;
    } else if (NUMBER_WORDS[firstWord] !== undefined) {
      qty = NUMBER_WORDS[firstWord];
      parsedQty = true;
      startIndex = 1;
    }
  }

  if (parsedQty && startIndex < words.length) {
    const nextWord = words[startIndex];
    if (UNIT_MULTIPLIERS[nextWord] !== undefined) {
      qty = qty * UNIT_MULTIPLIERS[nextWord];
      startIndex++;
    }
  } else if (!parsedQty && words.length > 0) {
    const firstWord = words[0];
    if (firstWord === "half" && words.length > 1) {
      const secondWord = words[1];
      if (secondWord === "dozen" || secondWord === "dozens") {
        qty = 6;
        startIndex = 2;
        parsedQty = true;
      } else if (UNIT_MULTIPLIERS[secondWord] !== undefined) {
        qty = 0.5 * UNIT_MULTIPLIERS[secondWord];
        startIndex = 2;
        parsedQty = true;
      }
    }
  }

  const remainingWords = words.slice(startIndex).map(normalizePlural);
  const cleanedProduct = remainingWords.join(" ").trim();

  return { qty, cleanedProduct };
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

function scoreProductMatch(segment: string, product: Product): number {
  const segmentNorm = segment.toLowerCase().trim();
  const productName = product.name.toLowerCase().trim();
  const productSku = product.sku.toLowerCase().trim();

  if (!segmentNorm) return 0;

  // 1. Exact Match
  if (productName === segmentNorm || productSku === segmentNorm) {
    return 100;
  }

  // 2. Starts With Match
  if (productName.startsWith(segmentNorm)) {
    return 95;
  }

  // 3. Contains Match (word boundary or substring)
  if (productName.includes(segmentNorm)) {
    const regex = new RegExp(`\\b${escapeRegExp(segmentNorm)}\\b`);
    if (regex.test(productName)) {
      return 90;
    }
    return 80;
  }

  // 4. Normalized Token Match (plural/singular aligned)
  const segmentNormalizedWords = segmentNorm.split(" ").map(normalizePlural);
  const productNameNormalizedWords = productName.split(" ").map(normalizePlural);

  const segNormJoined = segmentNormalizedWords.join(" ");
  const prodNormJoined = productNameNormalizedWords.join(" ");

  if (prodNormJoined === segNormJoined) {
    return 95;
  }
  if (prodNormJoined.startsWith(segNormJoined)) {
    return 90;
  }
  if (prodNormJoined.includes(segNormJoined)) {
    const regex = new RegExp(`\\b${escapeRegExp(segNormJoined)}\\b`);
    if (regex.test(prodNormJoined)) {
      return 85;
    }
    return 75;
  }

  // stand-alone token exact match (e.g. "eggs" inside product name tokens list)
  if (productNameNormalizedWords.includes(segNormJoined)) {
    return 92;
  }

  // 5. Alias Match
  for (const [key, aliasList] of Object.entries(ALIASES)) {
    const isAliasMatch =
      key === segmentNorm ||
      aliasList.some((alias) => segmentNorm.includes(alias) || alias.includes(segmentNorm));
    if (isAliasMatch) {
      if (productName.includes(key)) {
        return 85;
      }
    }
  }

  // 6. Fuzzy Match (Levenshtein overlap)
  const segmentTokens = segmentNormalizedWords.filter((t) => t.length > 1);
  const nameTokens = productNameNormalizedWords.filter((t) => t.length > 1);

  let matchCount = 0;
  for (const st of segmentTokens) {
    for (const nt of nameTokens) {
      if (nt.includes(st) || st.includes(nt)) {
        matchCount++;
        break;
      }
      const dist = levenshteinDistance(st, nt);
      const maxLength = Math.max(st.length, nt.length);
      if (dist <= 2 && maxLength > 3) {
        matchCount++;
        break;
      }
    }
  }

  if (matchCount > 0 && segmentTokens.length > 0) {
    const ratio = matchCount / segmentTokens.length;
    return Math.floor(ratio * 70);
  }

  return 0;
}

export function parseVoiceInvoice(
  text: string,
  customers: Customer[],
  products: Product[],
): ParsedVoiceInvoice {
  const heard = text.trim();
  const action = detectVoiceAction(heard);

  if (action) {
    return {
      heard,
      customerId: null,
      customerName: null,
      lines: [],
      suggestions: [],
      clarifications: [],
      action,
    };
  }

  const matchedCustomer = findCustomer(heard, customers);

  // Clean customer patterns out of product transcription text
  let productText = heard;
  if (matchedCustomer) {
    const customerNameNorm = normalizeText(matchedCustomer.name);
    const nameWords = customerNameNorm.split(" ");
    nameWords.forEach((word) => {
      if (word.length > 2) {
        const regex = new RegExp(`\\b${word}\\b`, "gi");
        productText = productText.replace(regex, "");
      }
    });
    productText = productText
      .replace(/\b(for|customer|bought|purchased|ordered)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Support list separators like "and", "plus", "then", or commas
  const segments = productText
    .split(/\b(?:and|plus|then|,)\b/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const lines: ParsedVoiceLine[] = [];
  const suggestions: VoiceSuggestion[] = [];
  const clarifications: string[] = [];

  for (const seg of segments) {
    const { qty, cleanedProduct } = parseQuantityAndProduct(seg);
    if (!cleanedProduct) continue;

    // Rank matching candidates
    const ranked = products
      .map((product) => {
        const score = scoreProductMatch(cleanedProduct, product);
        return { product, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);

    if (ranked.length === 0) {
      clarifications.push(seg);
      continue;
    }

    let best = ranked[0];
    let confidence = best.score;

    // Demote to suggestions if there are multiple candidates matching with equal high score
    if (confidence >= 90 && ranked.length > 1 && ranked[1].score >= 90) {
      confidence = 89;
    }

    if (confidence > 90) {
      // Auto add
      const existing = lines.find((line) => line.productId === best.product.id);
      if (existing) {
        existing.qty += qty;
      } else {
        lines.push({
          productId: best.product.id,
          productName: best.product.name,
          qty,
          price: best.product.price,
        });
      }
    } else if (confidence >= 60) {
      // Suggestions list
      suggestions.push({
        originalSegment: seg,
        qty,
        candidates: ranked.slice(0, 3).map((entry) => ({
          productId: entry.product.id,
          productName: entry.product.name,
          price: entry.product.price,
          confidence: entry.score,
        })),
      });
    } else {
      // Under 60% confidence: Clarify
      clarifications.push(seg);
    }
  }

  return {
    heard,
    customerId: matchedCustomer?.id ?? null,
    customerName: matchedCustomer?.name ?? null,
    lines,
    suggestions,
    clarifications,
    action: null,
  };
}

export function formatVoiceParseSummary(parsed: ParsedVoiceInvoice) {
  const items =
    parsed.lines.length > 0
      ? parsed.lines.map((line) => `${line.qty}× ${line.productName}`).join(", ")
      : "—";
  const action = parsed.action ? parsed.action.replace(/_/g, " ") : "—";

  return {
    customer: parsed.customerName ?? "—",
    items,
    action,
  };
}

export function isUnpaidInvoiceStatus(status: string) {
  return status === "pending" || status === "partial" || status === "sent" || status === "overdue";
}
