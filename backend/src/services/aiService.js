const { chatCompletions } = require('./modelProvider');
const { formatINR } = require('../lib/format');

/**
 * Score vendors based on weighted criteria
 * Price: 35%, DeliveryTime: 20%, Reliability: 30%, Rating: 15%
 */
/**
 * Score vendors based on weighted criteria.
 *
 * Price: 35%
 * Delivery Time: 20%
 * Reliability: 30%
 * Rating: 15%
 *
 * Price and delivery use inverse min-max normalization because
 * lower values are preferred.
 */
function scoreVendors(quotes) {
  if (!Array.isArray(quotes) || quotes.length === 0) {
    return [];
  }

  // Keep only quotations with valid mandatory decision fields.
  // Missing price or delivery information should not be converted
  // into artificial values because those values directly affect ranking.
  const validQuotes = quotes
    .map(q => ({
      ...q,
      price: Number(q.price),
      deliveryDays: Number(q.deliveryDays),
      vendor: q.vendor || {
        id: q.vendorId,
        name: 'Unknown Vendor',
        email: null,
        category: null,
        onTimeDelivery: 0,
        defectRate: 100,
        rating: 0
      }
    }))
    .filter(q =>
      Number.isFinite(q.price) &&
      q.price > 0 &&
      Number.isFinite(q.deliveryDays) &&
      q.deliveryDays > 0
    );

  if (validQuotes.length === 0) {
    return [];
  }

  // Calculate ranges for inverse min-max normalization.
  const prices = validQuotes.map(q => q.price);
  const deliveryDays = validQuotes.map(q => q.deliveryDays);

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  const minDeliveryDays = Math.min(...deliveryDays);
  const maxDeliveryDays = Math.max(...deliveryDays);

  const scored = validQuotes.map(quote => {
    const vendor = quote.vendor;

    // Lower price is better.
    const priceScore =
      maxPrice === minPrice
        ? 1
        : (maxPrice - quote.price) / (maxPrice - minPrice);

    // Lower delivery time is better.
    const deliveryScore =
      maxDeliveryDays === minDeliveryDays
        ? 1
        : (maxDeliveryDays - quote.deliveryDays) /
        (maxDeliveryDays - minDeliveryDays);

    // Reliability combines on-time delivery and defect rate.
    const onTimeDelivery = Math.min(
      Math.max(Number(vendor.onTimeDelivery) || 0, 0),
      100
    );

    const defectRate = Math.min(
      Math.max(Number(vendor.defectRate) || 0, 0),
      100
    );

    const reliabilityScore =
      0.7 * (onTimeDelivery / 100) +
      0.3 * (1 - defectRate / 100);

    // Normalize vendor rating from a 5-point scale.
    const rating = Math.min(
      Math.max(Number(vendor.rating) || 0, 0),
      5
    );

    const ratingScore = rating / 5;

    // Weighted final score.
    const totalScore =
      0.35 * priceScore +
      0.20 * deliveryScore +
      0.30 * reliabilityScore +
      0.15 * ratingScore;

    return {
      vendorId: vendor.id,
      vendorName: vendor.name,
      vendorEmail: vendor.email,
      category: vendor.category,
      price: quote.price,
      unitPrice: quote.unitPrice || null,
      deliveryDays: quote.deliveryDays,
      onTimeDelivery,
      defectRate,
      rating,

      scores: {
        price: Math.round(priceScore * 35 * 100) / 100,
        delivery: Math.round(deliveryScore * 20 * 100) / 100,
        reliability:
          Math.round(reliabilityScore * 30 * 100) / 100,
        rating:
          Math.round(ratingScore * 15 * 100) / 100,
        total:
          Math.round(totalScore * 10000) / 100
      }
    };
  });

  // Highest total score receives the highest rank.
  return scored.sort((a, b) => b.scores.total - a.scores.total);
}

/**
 * Generate AI recommendation using multi-model provider with automatic fallback
 */
async function generateRecommendation(purchaseRequest, scoredVendors) {
  try {
    const topVendor = scoredVendors[0];
    const secondVendor = scoredVendors[1];

    const cheapestPrice = Math.min(...scoredVendors.map(v => v.price || 0));
    const fastestDays = Math.min(...scoredVendors.map(v => v.deliveryDays || Infinity));

    const prompt = `You are a friendly procurement advisor. The person reading this is NOT technical, so explain everything in plain, everyday language. Avoid buzzwords and never mention "scores", "weights", "percentages", or "points".

CONTRACT — respond with EXACTLY this markdown structure, nothing else:

## ✅ Recommendation
One or two plain sentences naming the best vendor and the single most important reason. Keep it to 40 words max.

## 🧠 Why this vendor is the top pick
- one bullet per reason, max 4 bullets. Each bullet starts with a bold label (Price / Delivery speed / Reliability / Track record) followed by a one-line plain-language reason.

## ⚠️ Things to keep in mind
- 1 to 3 bullets listing any caveats (e.g. slightly over budget, slower delivery, higher defect rate).

## 💰 How the prices compare
- 1 to 2 plain bullets comparing the top pick against the runner-up.

RULES:
- Keep the whole answer under 150 words.
- Every bullet must explain WHY (give reasoning), never just restate a fact.
- Do not use any headings other than the four above.

PURCHASE REQUEST DETAILS:
- Item: ${purchaseRequest.itemName}
- Category: ${purchaseRequest.category}
- Quantity: ${purchaseRequest.quantity}
- Budget: ${formatINR(purchaseRequest.budget)}
- Urgency: ${purchaseRequest.urgency}
- Justification: ${purchaseRequest.justification || 'N/A'}

VENDOR COMPARISON (already ranked, best first):

${scoredVendors.map((v, i) => `#${i + 1} ${v.vendorName}
   - Price: ${formatINR(v.price)} — ${v.price <= cheapestPrice ? 'the lowest quoted price' : `${formatINR(v.price - cheapestPrice)} more than the lowest`}
   - Delivery: ${v.deliveryDays} days — ${v.deliveryDays <= fastestDays ? 'the fastest in this list' : `${v.deliveryDays - fastestDays} days slower than the fastest`}
   - Reliability: roughly ${v.onTimeDelivery}% of orders arrive on time; about ${v.defectRate}% of items are defective
   - Track record: past buyers rate them ${v.rating} out of 5`).join('\n\n')}

${secondVendor ? `COST COMPARISON (top pick vs runner-up):
- Price difference: ${formatINR(Math.abs(topVendor.price - secondVendor.price))}
- Delivery time difference: ${Math.abs(topVendor.deliveryDays - secondVendor.deliveryDays)} days` : ''}`;

    const { result } = await chatCompletions({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 600,
      supportTools: false,
    });

    const explanation = (result.choices[0]?.message?.content || '').trim();

    // Reasoning models occasionally return an empty or stub response ("##"),
    // which is unusable — fall back to the deterministic structured analysis.
    if (explanation.length < 40) {
      return {
        success: false,
        explanation: generateFallbackRecommendation(purchaseRequest, scoredVendors),
        fallback: true,
      };
    }

    return {
      success: true,
      explanation,
      fallback: false
    };
  } catch (err) {
    console.error('AI recommendation error:', err.message);
    return {
      success: false,
      explanation: generateFallbackRecommendation(purchaseRequest, scoredVendors),
      fallback: true,
      error: err.message
    };
  }
}

/**
 * Fallback recommendation when all AI providers are unavailable
 * Mirrors the structured, plain-language format used by the live model.
 */
function generateFallbackRecommendation(purchaseRequest, scoredVendors) {
  if (!scoredVendors || scoredVendors.length === 0) return 'No vendor recommendations available.';

  const top = scoredVendors[0];
  const second = scoredVendors[1];
  const budgetStr = top.price <= purchaseRequest.budget
    ? `${formatINR(purchaseRequest.budget - top.price)} under budget`
    : `${formatINR(top.price - purchaseRequest.budget)} over budget`;

  const sections = [`## ✅ Recommendation`,
    `${top.vendorName} is the best fit for this request — it offers the best balance of price, delivery speed, and reliability.`,
    ``,
    `## 🧠 Why this vendor is the top pick`,
    `- **Price:** ${formatINR(top.price)} — this quote is ${budgetStr}.`,
    `- **Delivery speed:** ${top.deliveryDays} days.`,
    `- **Reliability:** around ${top.onTimeDelivery}% of their orders arrive on time.`,
    `- **Track record:** past buyers rate them ${top.rating} out of 5.`];

  if (second) {
    sections.push(``,
      `## ⚠️ Things to keep in mind`,
      `- ${second.vendorName} quoted ${formatINR(second.price)} — ${formatINR(Math.abs(top.price - second.price))} ${top.price > second.price ? 'more' : 'less'} than the top pick.`,
      top.deliveryDays !== second.deliveryDays
        ? `- Their delivery time is ${Math.abs(top.deliveryDays - second.deliveryDays)} day(s) ${top.deliveryDays > second.deliveryDays ? 'longer' : 'shorter'} than the runner-up.`
        : `- Both vendors offer the same delivery time of ${top.deliveryDays} days.`);
  } else {
    sections.push(``,
      `## ⚠️ Things to keep in mind`,
      `- ${top.onTimeDelivery < 98 ? `This vendor still has about ${100 - top.onTimeDelivery}% of orders arriving late.` : `This vendor has a strong on-time record.`}`
    );
  }

  return sections.join('\n');
}

module.exports = { scoreVendors, generateRecommendation };
