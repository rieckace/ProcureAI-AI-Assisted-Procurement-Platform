const { chatCompletions } = require('./modelProvider');

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

    const prompt = `You are an AI procurement specialist analyzing vendor quotes for a purchase request.

PURCHASE REQUEST DETAILS:
- Item: ${purchaseRequest.itemName}
- Category: ${purchaseRequest.category}
- Quantity: ${purchaseRequest.quantity}
- Budget: $${purchaseRequest.budget}
- Urgency: ${purchaseRequest.urgency}
- Justification: ${purchaseRequest.justification || 'N/A'}

VENDOR RANKINGS (sorted by score):

${scoredVendors.map((v, i) => `#${i + 1} ${v.vendorName}
   - Price: $${v.price} (Score: ${v.scores.price}/35)
   - Delivery: ${v.deliveryDays} days (Score: ${v.scores.delivery}/20)
   - On-Time Delivery: ${v.onTimeDelivery}% | Defect Rate: ${v.defectRate}%
   - Rating: ${v.rating}/5 (Score: ${v.scores.rating}/15)
   - Total Score: ${v.scores.total}/100`).join('\n\n')}

${secondVendor ? `COST SAVINGS ANALYSIS (Top vs Second Best):
- Price difference: $${Math.abs(topVendor.price - secondVendor.price)}
- Delivery time difference: ${Math.abs(topVendor.deliveryDays - secondVendor.deliveryDays)} days` : ''}

Please provide:
1. A clear recommendation of the best vendor (max 2-3 sentences)
2. Key factors that influenced this decision
3. Any risks or considerations

Format your response as a concise, professional recommendation. Keep it under 200 words.`;

    const { result } = await chatCompletions({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
      supportTools: false,
    });

    const explanation = result.choices[0]?.message?.content || '';

    return {
      success: true,
      explanation: explanation.trim(),
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
 */
function generateFallbackRecommendation(purchaseRequest, scoredVendors) {
  if (!scoredVendors || scoredVendors.length === 0) return 'No vendor recommendations available.';

  const top = scoredVendors[0];
  const budgetStr = top.price <= purchaseRequest.budget
    ? `$${purchaseRequest.budget - top.price} under budget`
    : `$${top.price - purchaseRequest.budget} over budget`;

  return `${top.vendorName} is the top recommended vendor with a score of ${top.scores.total}/100. ` +
    `They offer the best balance of price ($${top.price}), delivery (${top.deliveryDays} days), ` +
    `and reliability (${top.onTimeDelivery}% on-time delivery, ${top.defectRate}% defect rate). ` +
    `This quote is ${budgetStr}. Consider their proven track record and competitive pricing.`;
}

module.exports = { scoreVendors, generateRecommendation };
