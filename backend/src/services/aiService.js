const { chatCompletions } = require('./modelProvider');

/**
 * Score vendors based on weighted criteria
 * Price: 35%, DeliveryTime: 20%, Reliability: 30%, Rating: 15%
 */
function scoreVendors(quotes) {
  if (!quotes || quotes.length === 0) return [];

  // Sanitize input — guard against missing fields, zero values, and NaN scores
  const safeQuotes = quotes.map(q => ({
    ...q,
    price: parseFloat(q.price) || 0,
    deliveryDays: parseInt(q.deliveryDays) || 7,
    vendor: q.vendor || {
      id: q.vendorId,
      name: 'Unknown Vendor',
      email: null,
      category: null,
      onTimeDelivery: 95,
      defectRate: 1,
      rating: 4,
    },
  }));

  // Find max values for normalization (spread with 0 avoids Math.max() on empty)
  const maxPrice = Math.max(...safeQuotes.map(q => q.price), 0);
  const maxDeliveryDays = Math.max(...safeQuotes.map(q => q.deliveryDays), 0);

  const scored = safeQuotes.map(quote => {
    const vendor = quote.vendor;

    // Price score - lower price is better (inverse normalized)
    const priceScore = maxPrice > 0 ? (1 - quote.price / maxPrice) * 35 : 35;

    // Delivery time score - fewer days is better (inverse normalized)
    const deliveryScore = maxDeliveryDays > 0 ? (1 - quote.deliveryDays / maxDeliveryDays) * 20 : 20;

    // Reliability score - based on onTimeDelivery and defectRate
    const reliabilityScore = ((vendor.onTimeDelivery / 100) * 0.7 + (1 - vendor.defectRate / 100) * 0.3) * 30;

    // Rating score - normalized to 15%
    const ratingScore = (vendor.rating / 5) * 15;

    const totalScore = Math.round((priceScore + deliveryScore + reliabilityScore + ratingScore) * 100) / 100;

    return {
      vendorId: vendor.id,
      vendorName: vendor.name,
      vendorEmail: vendor.email,
      category: vendor.category,
      price: quote.price,
      deliveryDays: quote.deliveryDays,
      onTimeDelivery: vendor.onTimeDelivery,
      defectRate: vendor.defectRate,
      rating: vendor.rating,
      scores: {
        price: Math.round(priceScore * 100) / 100,
        delivery: Math.round(deliveryScore * 100) / 100,
        reliability: Math.round(reliabilityScore * 100) / 100,
        rating: Math.round(ratingScore * 100) / 100,
        total: totalScore
      }
    };
  });

  // Sort by total score descending
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
