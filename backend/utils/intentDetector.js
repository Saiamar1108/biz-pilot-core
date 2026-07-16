/**
 * Scalable Intent Detection Engine v2
 * ====================================
 *
 * ARCHITECTURE:
 *   1. Normalize input (lowercase, strip punctuation, normalize possessives/contractions)
 *   2. Check business intents using CONTEXTUAL PHRASE MATCHING (not isolated keywords)
 *   3. Check greeting/casual
 *   4. Score non-business intent using multi-strategy approach
 *   5. Fallback to "general"
 *
 * KEY DESIGN DECISIONS:
 *   - Generic words like "report", "summary", "status", "update", "information"
 *     are NOT used as isolated business keywords — they require context.
 *   - Business detection uses phrase patterns (e.g., "sales report" ✓, "weather report" → non-business)
 *   - Input normalization converts: "today's" → "today", "todays" → "today", etc.
 *   - New intents can be added by appending to the `intents` array.
 */

// ===========================================================================
// 1. INPUT NORMALIZATION
// ===========================================================================

function normalizeInput(message) {
  let s = String(message || "").toLowerCase().trim();

  // Remove punctuation (except apostrophes within words like "today's")
  s = s.replace(/[^\w\s']/g, " ");

  // Collapse multiple spaces
  s = s.replace(/\s+/g, " ").trim();

  // Normalize possessives and contractions:
  // "today's" → "today", "yesterday's" → "yesterday", "tomorrow's" → "tomorrow"
  // "what's" → "what is", "it's" → "it is", "that's" → "that is"
  // Also handle missing apostrophe: "todays" → "today"
  s = s
    .replace(/\btoday's\b/g, "today")
    .replace(/\btodays\b/g, "today")
    .replace(/\byesterday's\b/g, "yesterday")
    .replace(/\byesterdays\b/g, "yesterday")
    .replace(/\btomorrow's\b/g, "tomorrow")
    .replace(/\btomorrows\b/g, "tomorrow")
    .replace(/\bwhat's\b/g, "what is")
    .replace(/\bit's\b/g, "it is")
    .replace(/\bthat's\b/g, "that is")
    .replace(/\bwho's\b/g, "who is")
    .replace(/\bhow's\b/g, "how is")
    .replace(/\bwhere's\b/g, "where is")
    .replace(/\bwhen's\b/g, "when is")
    .replace(/\bwhy's\b/g, "why is")
    .replace(/\bdon't\b/g, "do not")
    .replace(/\bdoesn't\b/g, "does not")
    .replace(/\bdidn't\b/g, "did not")
    .replace(/\bcan't\b/g, "cannot")
    .replace(/\bwon't\b/g, "will not")
    .replace(/\bi'm\b/g, "i am")
    .replace(/\byou're\b/g, "you are")
    .replace(/\bhe's\b/g, "he is")
    .replace(/\bshe's\b/g, "she is")
    .replace(/\bwe're\b/g, "we are")
    .replace(/\bthey're\b/g, "they are")
    .replace(/\bit'll\b/g, "it will")
    .replace(/\bi'll\b/g, "i will")
    .replace(/\byou'll\b/g, "you will")
    .replace(/\bwe'll\b/g, "we will")
    .replace(/\bthey'll\b/g, "they will")
    // Remove remaining apostrophes (business possessives like "store's")
    .replace(/'s\b/g, "")
    .replace(/s'\b/g, "s")
    .replace(/'/g, "");

  // Final whitespace cleanup
  s = s.replace(/\s+/g, " ").trim();

  return s;
}

// ===========================================================================
// 2. NON-BUSINESS INTENT REGISTRY
// ===========================================================================
//
// This array contains only non-business intent definitions.
// Business intents are handled by explicit phrase matching in _checkBusiness()
// to ensure they never get misclassified.
//
// TO ADD A NEW INTENT:
//   Add an object to this array with a `name` and `strategies` object:
//   {
//     name: "hr",
//     strategies: {
//       primary: ["payroll", "employee"],
//       secondary: ["hr", "staff"],
//       phrases: [/pay\s*roll/i, /leave\s*balance/i],
//       questions: [/^(how many employees)/i],
//       exclusions: [],
//     },
//   }

const nonBusinessIntents = [
  // --- Non-Business: Weather, Entertainment, Personal, etc. ---
  {
    name: "non_business",
    strategies: {
      // High-weight tokens that strongly indicate non-business
      primary: [
        "weather", "temperature", "rain", "sunny", "cloudy", "forecast",
        "humidity", "rainfall", "storm", "wind",
        "movie", "film", "actor", "actress", "celebrity", "song", "music",
        "album", "concert", "netflix", "youtube", "entertainment",
        "cricket", "football", "soccer", "basketball", "tennis",
        "ipl", "fifa", "olympic", "tournament", "championship",
        "joke", "funny", "meme", "riddle", "puzzle", "trivia",
        "programming", "javascript", "python", "react", "algorithm",
        "recipe", "cook", "bake", "cuisine", "dish", "ingredient",
        "travel", "trip", "vacation", "hotel", "flight", "destination",
        "horoscope", "astrology", "zodiac", "tarot", "numerology",
        "dating", "girlfriend", "boyfriend", "relationship",
        "bitcoin", "crypto", "ethereum", "nft",
        "dance", "sing", "cinema", "theatre",
      ],
      // Lower-weight supporting words
      secondary: [
        "tell me", "joke", "news", "headline",
        "how to", "tutorial", "learn", "course",
        "recommend", "suggest", "game", "play", "fun",
        "health", "doctor", "hospital", "medicine", "diet", "workout",
        "fitness", "nutrition", "exercise",
        "history", "science", "math", "physics", "chemistry", "biology",
        "capital", "country", "city", "population",
        "religion", "god", "temple", "church", "mosque",
        "philosophy", "meaning", "spiritual",
      ],
      // Multi-word phrase patterns (match against normalized input)
      phrases: [
        // Weather
        /(today'?s?\s*)?weather\s*(report|forecast|today|update|now)?/i,
        /what('?s)?\s*(the\s+)?(weather|temperature|forecast)/i,
        /how (cold|hot|warm) is/i,
        /will it (rain|snow|storm)/i,
        /is it (sunny|cloudy|rainy|windy)/i,
        // Personal / identity
        /^who (is|was) [a-z]{3,}/i,
        /tell me (about|a|something|your)/i,
        // Programming
        /write (a|an|me) (program|code|script|function|app)/i,
        /how (do|can) i (write|code|build|create|make)/i,
        /fix (this|my|the) (bug|code|error|issue)/i,
        // Entertainment
        /recommend (a|some|me) (movie|show|song|book|game|film)/i,
        /what (movie|show|song|music|game) should/i,
        /what('?s)? (the\s+)?(best|latest|new) (movie|show|song|album)/i,
        // Knowledge
        /explain (what is|how|why|the concept of)/i,
        /what is the (meaning|definition|capital|population|largest|tallest)/i,
        // Health
        /how (to|can i) (lose|gain|build|improve)/i,
        /what should i (eat|do|take) (for|to)/i,
        // Food
        /how (to|can i) make/i,
        /^recipe (for|of|to)\b/i,
        // Time & Date
        /(what'?s|what is|what are)\s+(the\s+)?(time|date|day|year|month|hour)\b/i,
        /current (time|date|day|year|month)/i,
        /tell me (the\s+)?(time|date|day)/i,
        /what\s+(time|date|day)\s+(is|are)\s+(it|today|now)/i,
        // General knowledge questions
        /(who|what|when|where|why|how)\s+(is|was|are|were|does|did)\s+(a|an|the)\s+[a-z]{3,}/i,
        // Jokes
        /tell me a (joke|funny|riddle|story)/i,
        // Travel
        /where should i (go|visit|travel)/i,
        /best (place|destination|hotel|restaurant) (to|in|for)/i,
        // Developer / tech
        /how (to|do i|can i|would i)\s+(design|build|create|write|code|use|install|setup|configure|deploy)\s+/i,
        // Sports match query
        /(cricket|football|soccer|ipl)\s*(match|score|result|today|live|winner|win)/i,
        /who (won|win|wins|is winning)\s+(the\s+)?(match|game|tournament|series)/i,
        // News
        /^(what'?s|what is)\s+(in\s+the\s+)?(news|headline)/i,
        // Movie / show review
        /(movie|film|show)\s*(review|rating|recommendation)/i,
      ],
      // Question starter patterns
      questions: [
        /^(what|who|when|where|why|how)\s+(is|are|was|were|does|do|did|can|will|would)\s+(a|an|the|my|your|this|that|it|he|she|they|we|i)\b/i,
        /^(tell|show|give|name|list|recommend|suggest)\s+(me\s+)?(a|an|the|some|few|different)\b/i,
      ],
      // Business words that should NEGATE non-business detection
      exclusions: [
        "sales", "revenue", "order", "inventory", "stock", "product",
        "customer", "payment", "invoice", "supplier", "profit",
        "margin", "analytics", "dashboard", "business",
        "store", "shop", "sell", "sold", "purchase", "billing",
        "expense", "income", "overdue", "pending", "collection",
      ],
    },
  },
];

// ===========================================================================
// 3. BUSINESS PHRASE MAP (contextual, not isolated keywords)
// ===========================================================================
//
// Each entry maps to a specific business intent using phrase patterns.
// Generic words like "report", "summary", "status" are only matched
// when they appear WITH a business context word.

const businessPhrases = [
  // Sales & Revenue
  {
    key: "sales",
    phrases: [
      /sales\s*(report|summary|status|data|figure|number|performance|trend|analysis|chart|graph)/i,
      /revenue\s*(report|summary|status|data|figure|number|growth|trend|analysis|chart|graph)/i,
      /^sales\s*(today|this\s*(week|month|year|quarter)|last\s*(week|month|year|quarter)|overall|total)/i,
      /\b(revenue|sales)\s+(this\s+)?(month|week|year|quarter|today)/i,
      /\b(how\s+much\s+(revenue|profit|money)|what(\'?s| is)\s+(my\s+)?(revenue|profit|income))\b/i,
      /\b(total\s+)?(revenue|sales|income)\b/i,
      /\b(how many orders|order count|total orders)\b/i,
      /\b(business\s+(performance|health|growth))\b/i,
      /\b(how is|how are)\s+(my\s+)?(business|store|shop)\s+(performing|doing)\b/i,
      /\b(top\s+sell(ing|er)?)\b/i,
      /\b(income|turnover)\s*(report|summary)?\b/i,
    ],
  },
  // Inventory & Products
  {
    key: "inventory",
    phrases: [
      /inventory\s*(report|summary|status|update|list|count|value|level|check)?\b/i,
      /(stock|inventory)\s*(level|count|status|report|summary|alert|reorder|restock)?\b/i,
      /\b(low stock|out of stock|stock alert|stock status)\b/i,
      /product\s*(report|summary|list|catalog|count|status|performance)?\b/i,
      /\b(product|item|sku)\s*(list|catalog|count|status|performance|report|summary)\b/i,
      /\b(reorder|restock)\s*(level|point|list|alert|suggestion)?\b/i,
      /\b(warehouse|shelf)\s*(stock|inventory|space|status)?\b/i,
      /\b(what\s+(product|item)s?\s+(to\s+)?reorder|which\s+product)\b/i,
      /\b(how many (product|item)s?\s+(in stock|do i have|are available))\b/i,
      /\b(inventory|stock)\s+(value|worth|cost)\b/i,
      /\b(list|show|get)\s+(me\s+)?(my\s+)?(product|products|item|items)\b/i,
    ],
  },
  // Customers
  {
    key: "customers",
    phrases: [
      /customer\s*(report|summary|list|data|insight|analytics|behavior|segment)?\b/i,
      /\b(top customer|top customers|best customer|best customers|most paying|customer list)\b/i,
      /\b(customer|client)\s*(loyalty|retention|churn|acquisition)\b/i,
      /\b(repeat\s*(customer|buyer|customers|buyers)|regular\s+customer)\b/i,
      /\b(who are|show me|list)\s+(my\s+)?(customer|client)s?\b/i,
      /\b(active customer|active customers|total customer|total customers|customer count)\b/i,
    ],
  },
  // Payments
  {
    key: "payments",
    phrases: [
      /payment\s*(report|summary|status|history|record|method|gateway)?\b/i,
      /(pending|overdue|unpaid|due)\s+(payment|payment|payments)\b/i,
      /\b(payment|paid|due)\s*(amount|status|date|history|report|summary)\b/i,
      /\b(who hasn'?t paid|who has not paid|who owes|pending dues)\b/i,
      /\b(accounts receivable|receivable)\b/i,
      /\b(collection\s*(efficiency|rate|report|summary))\b/i,
      /\bshow\s+(me\s+)?(pending|overdue|unpaid|due)\s+(payment|payments)\b/i,
    ],
  },
  // Invoices
  {
    key: "invoices",
    phrases: [
      /invoice\s*(report|summary|status|list|history|details)?\b/i,
      /\b(billing|bill)\s*(report|summary|status|history|details)?\b/i,
      /\b(show|list|get)\s+(my\s+)?(invoice|bill)s?\b/i,
      /\b(invoice|billing)\s*(aging|overdue|pending|status)\b/i,
      /\b(recent invoice|last invoice|latest invoice)\b/i,
    ],
  },
  // Purchase Orders & Suppliers
  {
    key: "purchase_orders",
    phrases: [
      /purchase\s*order\s*(report|summary|list|status)?\b/i,
      /\bsupplier\s*(list|report|performance|status|contact)?\b/i,
      /\b(po\s+|purchase\s+order)\s*(status|pending|report|summary)\b/i,
      /\b(stock replenishment|reorder point|supply chain)\b/i,
      /\b(who are|list)\s+(my\s+)?suppliers?\b/i,
    ],
  },
  // Profit
  {
    key: "profit",
    phrases: [
      /profit\s*(report|analysis|margin|summary|statement|loss)?\b/i,
      /\bprofit margin|gross profit|net profit|profitability\b/i,
      /\b(margin|markup)\s*(report|analysis|percent|rate)?\b/i,
      /\b(most profitable|profit driver|earnings)\b/i,
      /\b(net income|profit and loss|pnl|p&l)\b/i,
    ],
  },
  // Forecasting
  {
    key: "forecasting",
    phrases: [
      /(forecast|prediction|projection|trend)\s*(report|analysis|summary)?\b/i,
      /\b(demand\s*(forecast|plan|prediction)|future\s+(sales|revenue|trend))\b/i,
      /\b(expected\s+(sales|revenue|growth|demand))\b/i,
      /\b(sales\s+forecast|revenue\s+projection)\b/i,
    ],
  },
  // Analytics / Insights / Dashboard
  {
    key: "analytics",
    phrases: [
      /analytic(s)?\s*(report|dashboard|data|insight|summary)?\b/i,
      /\b(dashboard|kpi|metric|insight)\s*(report|summary|data)?\b/i,
      /\b(business\s+)?(insight|analytics)\b/i,
      /\b(show|give|get)\s+(me\s+)?(the\s+)?(dashboard|analytics|insights?)\b/i,
    ],
  },
];

// ===========================================================================
// 4. DETECTION ENGINE
// ===========================================================================

class IntentDetector {
  constructor(registry) {
    this.registry = registry;
  }

  /**
   * Detect the intent of a user message.
   */
  detect(message) {
    const raw = String(message || "").trim();
    if (!raw) {
      return { intent: "general", confidence: 0, scores: {} };
    }

    // Step 1: Normalize input
    const normalized = normalizeInput(raw);

    // Step 2: Check business intents using contextual phrase matching
    const businessIntent = this._checkBusiness(normalized);
    if (businessIntent) {
      const scores = this._computeScores(normalized);
      return {
        intent: businessIntent,
        confidence: 1.0,
        scores: { ...scores, _business_override: true },
        _explanation: `Business phrase matched: ${businessIntent}`,
        _normalized: normalized,
      };
    }

    // Step 3: Check greeting & casual (on normalized input)
    const greetingIntent = this._checkGreeting(normalized);
    if (greetingIntent) {
      return greetingIntent;
    }

    // Step 4: Score non-business intent from registry
    const scores = this._computeScores(normalized);
    const intentsSorted = Object.entries(scores)
      .filter(([name]) => name !== "_excluded")
      .sort(([, a], [, b]) => b - a);

    if (intentsSorted.length > 0) {
      const [topIntent, topScore] = intentsSorted[0];
      const confidence = Math.min(topScore / 20, 1.0);

      if (topIntent === "non_business" && confidence >= 0.15) {
        return {
          intent: topIntent,
          confidence,
          scores,
          _explanation: `Non-business score ${topScore} (confidence ${(confidence * 100).toFixed(0)}%)`,
          _normalized: normalized,
        };
      }
    }

    // Step 5: Fallback to general
    return {
      intent: "general",
      confidence: 0,
      scores,
      _explanation: "No specific intent detected; falling back to general",
      _normalized: normalized,
    };
  }

  /**
   * Check business intents using contextual phrase patterns.
   * Generic words like "report" alone do NOT trigger business intent.
   */
  _checkBusiness(normalized) {
    for (const entry of businessPhrases) {
      for (const pattern of entry.phrases) {
        if (pattern.test(normalized)) {
          return entry.key;
        }
      }
    }
    return null;
  }

  /**
   * Check for greeting or casual messages.
   */
  _checkGreeting(normalized) {
    if (/^(hi|hello|hey|yo|what'?s\s*up|good\s*(morning|afternoon|evening)|namaste|hii|heyy)\b/i.test(normalized)) {
      return { intent: "greeting", confidence: 1.0, scores: { greeting: 10 } };
    }
    if (/^(how\s+are\s+you|what\s+can\s+you\s+do|who\s+are\s+you|tell\s+me\s+about\s+yourself|thanks?|thank\s+you|bye|goodbye|good\s*night|see\s+you|have\s+a\s+great|you\s+too|what'?s\s+up)\b/i.test(normalized)) {
      return { intent: "casual", confidence: 1.0, scores: { casual: 10 } };
    }
    return null;
  }

  /**
   * Score non-business intents from the registry.
   */
  _computeScores(normalized) {
    const scores = {};

    for (const intent of this.registry) {
      let score = 0;
      const { strategies } = intent;

      // Primary keywords
      if (strategies.primary) {
        for (const kw of strategies.primary) {
          if (new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(normalized)) {
            score += 4;
          }
        }
      }

      // Secondary keywords
      if (strategies.secondary) {
        for (const kw of strategies.secondary) {
          const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          if (new RegExp(`\\b${escaped}\\b`, "i").test(normalized)) {
            score += 2;
          }
        }
      }

      // Phrase patterns
      if (strategies.phrases) {
        for (const pattern of strategies.phrases) {
          if (pattern.test(normalized)) {
            score += 6;
          }
        }
      }

      // Question types
      if (strategies.questions) {
        for (const pattern of strategies.questions) {
          if (pattern.test(normalized)) {
            score += 3;
          }
        }
      }

      // Exclusions (negative signal)
      if (strategies.exclusions) {
        for (const ex of strategies.exclusions) {
          const escaped = ex.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          if (new RegExp(`\\b${escaped}\\b`, "i").test(normalized)) {
            score -= 5;
          }
        }
      }

      scores[intent.name] = score;
    }

    return scores;
  }
}

// ===========================================================================
// 5. SINGLETON INSTANCE & PUBLIC API
// ===========================================================================

const detector = new IntentDetector(nonBusinessIntents);

function detectIntent(message) {
  return detector.detect(message);
}

function getDetector() {
  return detector;
}

module.exports = {
  detectIntent,
  getDetector,
  IntentDetector,
  normalizeInput,
};