const SURFACES = {
  website: {
    label: "Website claim",
    shortLabel: "Website",
    base: 96,
    reason: "The first controlled surface. It must make the product, buyer, and reason to believe legible in one pass."
  },
  customerProof: {
    label: "Customer proof",
    shortLabel: "Proof",
    base: 92,
    reason: "Specific outcomes transfer belief from the founder to people the buyer recognizes as peers."
  },
  founderProfile: {
    label: "Founder profile",
    shortLabel: "Founder",
    base: 84,
    reason: "Early buyers underwrite the person behind the product before the company has earned institutional trust."
  },
  brandedSearch: {
    label: "Branded search",
    shortLabel: "Search",
    base: 86,
    reason: "A buyer who searches the name is asking the open internet to confirm or contradict the pitch."
  },
  productProof: {
    label: "Product in action",
    shortLabel: "In action",
    base: 78,
    reason: "A demo, teardown, sample, or public artifact makes the promise inspectable before a sales call."
  },
  thirdParty: {
    label: "Third-party signal",
    shortLabel: "3rd party",
    base: 76,
    reason: "An independent mention, podcast, partner, or respected byline says the claim survives outside owned channels."
  },
  reviews: {
    label: "Review trail",
    shortLabel: "Reviews",
    base: 68,
    reason: "Reviews compress many small credibility checks into one familiar buyer behavior."
  },
  peerRooms: {
    label: "Peer rooms",
    shortLabel: "Peers",
    base: 70,
    reason: "Buyers ask people like them in private communities, operator groups, and category-specific forums."
  }
};

const priceBoost = {
  starter: { customerProof: 0, thirdParty: -8, founderProfile: 4, productProof: 8, reviews: 8 },
  considered: { customerProof: 5, thirdParty: 0, founderProfile: 3, productProof: 5, reviews: 4 },
  high: { customerProof: 12, thirdParty: 10, founderProfile: 6, productProof: 2, reviews: 0 },
  enterprise: { customerProof: 16, thirdParty: 14, founderProfile: 2, brandedSearch: 5, reviews: -3 }
};

const typeBoost = {
  service: { founderProfile: 15, customerProof: 10, website: 5, peerRooms: 5 },
  software: { productProof: 18, customerProof: 8, brandedSearch: 5, reviews: 2 },
  consumer: { reviews: 20, brandedSearch: 8, productProof: 6, thirdParty: 4 },
  local: { reviews: 25, brandedSearch: 16, website: 4, peerRooms: 2 },
  marketplace: { peerRooms: 16, reviews: 10, productProof: 8, thirdParty: 5 }
};

const statusBoost = { empty: 24, thin: 11, strong: -28 };
const statusValue = { empty: 0, thin: 0.5, strong: 1 };

function addBoost(scores, boosts = {}) {
  Object.entries(boosts).forEach(([id, amount]) => {
    scores[id] = (scores[id] || 0) + amount;
  });
}

function textSignals(text) {
  const normalized = text.toLowerCase();
  return {
    executive: /\b(ceo|coo|cmo|cto|chief|vp|vice president|director|partner|owner|executive|enterprise)\b/.test(normalized),
    technical: /\b(developer|engineer|technical|cto|data|security|it |software)\b/.test(normalized),
    founder: /\b(founder|startup|seed|series [abc]|entrepreneur)\b/.test(normalized),
    local: /\b(local|nearby|homeowner|patient|resident|city|neighborhood)\b/.test(normalized),
    regulated: /\b(legal|law|health|medical|finance|financial|insurance|compliance|government)\b/.test(normalized)
  };
}

function surfacePrompt(id, product, buyer) {
  const prompts = {
    website: `Can ${buyer} explain what ${product} does and why it is credible after one page?`,
    customerProof: `Can ${buyer} find a named outcome from someone facing the same stakes?`,
    founderProfile: `Would ${buyer} see the person behind ${product} as specific, active, and qualified to build it?`,
    brandedSearch: `What does branded search show ${buyer} when they look up “${product}”?`,
    productProof: `Can ${buyer} inspect ${product} before agreeing to a call or purchase?`,
    thirdParty: `Can ${buyer} find an independent description of ${product} on a source they already trust?`,
    reviews: `Can ${buyer} find recent, specific feedback on a platform they already trust?`,
    peerRooms: `Would ${product} survive a recommendation request from ${buyer} in the rooms they use to compare notes?`
  };
  return prompts[id];
}

export function generateTrustMap(input = {}, currentStatuses = {}) {
  const product = String(input.product || "your product").trim() || "your product";
  const buyer = String(input.buyer || "your buyer").trim() || "your buyer";
  const type = typeBoost[input.type] ? input.type : "service";
  const price = priceBoost[input.price] ? input.price : "considered";
  const signals = textSignals(`${buyer} ${product}`);
  const scores = Object.fromEntries(Object.entries(SURFACES).map(([id, surface]) => [id, surface.base]));

  addBoost(scores, typeBoost[type]);
  addBoost(scores, priceBoost[price]);
  if (signals.executive) addBoost(scores, { customerProof: 7, thirdParty: 7, brandedSearch: 4 });
  if (signals.technical) addBoost(scores, { productProof: 8, peerRooms: 4 });
  if (signals.founder) addBoost(scores, { founderProfile: 8, peerRooms: 5 });
  if (signals.local) addBoost(scores, { reviews: 12, brandedSearch: 8 });
  if (signals.regulated) addBoost(scores, { customerProof: 6, thirdParty: 6, brandedSearch: 4 });

  const candidates = Object.entries(SURFACES)
    .map(([id, surface]) => ({ id, ...surface, relevance: scores[id] }))
    .sort((a, b) => b.relevance - a.relevance || a.label.localeCompare(b.label))
    .slice(0, 5)
    .map((surface) => {
      const status = ["empty", "thin", "strong"].includes(currentStatuses[surface.id])
        ? currentStatuses[surface.id]
        : "empty";
      return {
        ...surface,
        status,
        priority: surface.relevance + statusBoost[status],
        prompt: surfacePrompt(surface.id, product, buyer)
      };
    })
    .sort((a, b) => b.priority - a.priority || b.relevance - a.relevance);

  const totalWeight = candidates.reduce((sum, item) => sum + item.relevance, 0);
  const earnedWeight = candidates.reduce(
    (sum, item) => sum + item.relevance * statusValue[item.status],
    0
  );

  return {
    product,
    buyer,
    type,
    price,
    surfaces: candidates,
    coverage: totalWeight ? Math.round((earnedWeight / totalWeight) * 100) : 0,
    emptyCount: candidates.filter((item) => item.status === "empty").length,
    thinCount: candidates.filter((item) => item.status === "thin").length,
    strongCount: candidates.filter((item) => item.status === "strong").length
  };
}