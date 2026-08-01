const prisma = require('../lib/prisma');
const { chatCompletions } = require('./modelProvider');
const { scoreVendors, generateRecommendation } = require('./aiService');
const inventoryService = require('./inventoryService');
const poGeneratorService = require('./poGeneratorService');
const { logActivity } = require('../routes/activityLogs');
const { createNotificationForRole } = require('./notificationService');
const logger = require('../lib/logger');

/**
 * Autonomous Procurement Agent
 * 
 * Processes a natural language request and orchestrates the entire
 * procurement pipeline: parse → check inventory → search vendors →
 * compare prices → score → recommend → wait for approval → generate PO
 */

// Default unit price used when the user doesn't mention a budget
const DEFAULT_UNIT_PRICE = 1000;

/**
 * Parse a user message to extract structured procurement intent
 */
async function parseIntent(message) {
  const prompt = `Extract the procurement intent from this user message. Return ONLY valid JSON.

Message: "${message}"

Extract:
- itemName: The product/item being requested
- category: One of: Rice, Flour, Oil, Packaging, Equipment, Logistics, Services, IT, Office Supplies, Furniture, Software, Raw Materials
- quantity: Number of units (number)
- budget: Total budget in the organization's currency if mentioned, otherwise null
- department: The team/department requesting (or null if not mentioned)
- urgency: One of: low, medium, high, critical (infer from context like "ASAP", "urgent", "need by", etc.)

Example:
{"itemName":"Dell Latitude 5540","category":"IT","quantity":15,"budget":750000,"department":"AI Team","urgency":"high"}

Return ONLY the JSON object, no other text.`;

  try {
    const { result } = await chatCompletions({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 300,
      supportTools: false,
    });

    const content = result.choices[0]?.message?.content || '{}';
    // Try to parse JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(content);
  } catch (err) {
    logger.error('autonomousAgent.parseIntent', err.message);
    // Fallback: basic extraction
    let fallbackCategory = 'Equipment';
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('rice')) fallbackCategory = 'Rice';
    else if (lowerMsg.includes('flour') || lowerMsg.includes('wheat')) fallbackCategory = 'Flour';
    else if (lowerMsg.includes('oil') || lowerMsg.includes('mustard') || lowerMsg.includes('cooking')) fallbackCategory = 'Oil';
    else if (lowerMsg.includes('packaging') || lowerMsg.includes('bags') || lowerMsg.includes('sack')) fallbackCategory = 'Packaging';
    else if (lowerMsg.includes('logistics') || lowerMsg.includes('transport') || lowerMsg.includes('shipping')) fallbackCategory = 'Logistics';
    else if (lowerMsg.includes('laptop') || lowerMsg.includes('computer') || lowerMsg.includes('software')) fallbackCategory = 'IT';
    else if (lowerMsg.includes('furniture') || lowerMsg.includes('chair') || lowerMsg.includes('desk') || lowerMsg.includes('table')) fallbackCategory = 'Furniture';
    else if (lowerMsg.includes('office') || lowerMsg.includes('supplies') || lowerMsg.includes('paper') || lowerMsg.includes('pen')) fallbackCategory = 'Office Supplies';
    else if (lowerMsg.includes('mill') || lowerMsg.includes('machine') || lowerMsg.includes('roller') || lowerMsg.includes('equipment')) fallbackCategory = 'Equipment';
    else if (lowerMsg.includes('service') || lowerMsg.includes('consult')) fallbackCategory = 'Services';

    // Best-effort quantity + budget extraction
    const qtyMatch = message.match(/(\d+)\s*(?:units?|bags?|kg|laptops?|pcs?|boxes|sacks?|sets?|pairs)/i);
    const budgetMatch = message.match(/budget[^\d]*(\d[\d,]*)/i)
      || message.match(/[$₹]\s*(\d[\d,]*(?:\.\d+)?)/)
      || message.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:rs|inr|usd|dollars)/i);

    return {
      itemName: message.length > 50 ? message.substring(0, 50) + '...' : message,
      category: fallbackCategory,
      quantity: qtyMatch ? parseInt(qtyMatch[1]) : 1,
      budget: budgetMatch ? parseFloat(budgetMatch[1].replace(/,/g, '')) : null,
      department: null,
      urgency: 'medium',
    };
  }
}

/**
 * Estimate a per-unit price for a vendor quote.
 * Higher-rated vendors command a slight premium — keeps scoring meaningful.
 */
function estimateUnitPrice(vendor, unitBase) {
  const rating = vendor.rating || 4;
  return Math.max(1, Math.round(unitBase * (1 + (rating - 4) * 0.05)));
}

/**
 * Estimate delivery days for a vendor quote. More reliable vendors = faster.
 */
function estimateDeliveryDays(vendor) {
  return Math.max(3, Math.round(30 - (vendor.onTimeDelivery || 90) / 4));
}

/**
 * Create estimated quotes for the vendors the agent found.
 * These make scoring, recommendation, and PO generation work end-to-end.
 * Each quote is clearly flagged as an agent estimate.
 */
async function createEstimatedQuotes(vendors, intent, orgId, prId) {
  const unitBase = intent.budget && intent.quantity
    ? intent.budget / intent.quantity
    : DEFAULT_UNIT_PRICE;

  const created = [];
  for (const vendor of vendors) {
    const unitPrice = estimateUnitPrice(vendor, unitBase);
    const price = Math.round(unitPrice * intent.quantity * 100) / 100;
    const deliveryDays = estimateDeliveryDays(vendor);

    const quote = await prisma.quote.create({
      data: {
        prId,
        vendorId: vendor.id,
        price,
        deliveryDays,
        notes: '🤖 Auto-estimated by Procura — please verify before finalizing',
        organizationId: orgId,
      },
      include: { vendor: true },
    });
    created.push(quote);
  }
  return created;
}

/**
 * Main pipeline: process a procurement request end-to-end
 */
async function processRequest(message, userId, orgId) {
  const steps = [];
  const markStep = (name, status, data = {}) => {
    steps.push({ name, status, data, timestamp: new Date().toISOString() });
  };

  try {
    markStep('intent_parsing', 'processing');

    // 1. Parse intent (coerce numbers — LLMs sometimes return strings)
    const intent = await parseIntent(message);
    intent.quantity = Math.max(1, parseInt(intent.quantity) || 1);
    const rawBudget = parseFloat(intent.budget);
    intent.budget = !isNaN(rawBudget) && rawBudget > 0 ? rawBudget : null;
    markStep('intent_parsing', 'completed', { intent });

    // Create/save pipeline record
    const pipeline = await prisma.procurementPipeline.create({
      data: {
        organizationId: orgId,
        userId,
        status: 'PROCESSING',
        intent,
        currentStep: 'intent_parsing',
        stepsCompleted: JSON.stringify(steps),
      }
    });

    markStep('inventory_check', 'processing');

    // 2. Check inventory
    const inventoryCheck = await inventoryService.checkStock(intent.itemName, orgId);
    let needsPurchase = true;
    let inventoryFulfillment = null;

    if (inventoryCheck.inStock && inventoryCheck.available >= intent.quantity) {
      needsPurchase = false;
      inventoryFulfillment = {
        source: 'inventory',
        available: inventoryCheck.available,
        sufficient: true,
        message: `✅ ${inventoryCheck.available} units of "${intent.itemName}" available in stock. Can fulfill from inventory.`,
      };
    } else if (inventoryCheck.inStock) {
      inventoryFulfillment = {
        source: 'partial',
        available: inventoryCheck.available,
        needed: intent.quantity,
        shortfall: intent.quantity - inventoryCheck.available,
        message: `⚠️ Only ${inventoryCheck.available} units in stock. Need to purchase ${intent.quantity - inventoryCheck.available} more.`,
      };
    } else {
      inventoryFulfillment = {
        source: 'purchase',
        available: 0,
        needed: intent.quantity,
        message: `📦 No stock found for "${intent.itemName}". Will proceed with vendor search.`,
      };
    }

    markStep('inventory_check', 'completed', inventoryFulfillment);

    if (needsPurchase || !inventoryCheck.inStock) {
      markStep('vendor_search', 'processing');

      // 3. Search vendors — try the intent category first, then fall back to all
      let vendors = await prisma.vendor.findMany({
        where: { organizationId: orgId, category: intent.category },
        orderBy: { rating: 'desc' },
      });

      const categoryFallbackUsed = vendors.length === 0;
      if (categoryFallbackUsed) {
        vendors = await prisma.vendor.findMany({
          where: { organizationId: orgId },
          orderBy: { rating: 'desc' },
          take: 10,
        });
      }

      markStep('vendor_search', 'completed', { vendorsFound: vendors.length, categoryFallbackUsed, vendors });

      if (vendors.length === 0) {
        // No vendors at all
        await prisma.procurementPipeline.update({
          where: { id: pipeline.id },
          data: {
            status: 'FAILED',
            currentStep: 'vendor_search',
            stepsCompleted: JSON.stringify(steps),
          }
        });

        return {
          success: false,
          pipelineId: pipeline.id,
          steps,
          message: `No vendors found in the "${intent.category}" category. Please add vendors first.`,
          needsApproval: false,
        };
      }

      markStep('creating_pr', 'processing');

      // 4. Create a purchase request
      const pr = await prisma.purchaseRequest.create({
        data: {
          itemName: intent.itemName,
          category: intent.category,
          quantity: intent.quantity,
          budget: intent.budget || Math.max(1, intent.quantity * DEFAULT_UNIT_PRICE),
          urgency: intent.urgency || 'medium',
          justification: `Auto-generated by Procura: ${message}`,
          userId,
          organizationId: orgId,
          status: 'pending',
        }
      });

      markStep('creating_pr', 'completed', { prId: pr.id });

      // 5. Create estimated quotes from the found vendors so the pipeline
      //    can be scored, recommended, and approved without manual input.
      markStep('generating_quotes', 'processing');
      const quotes = await createEstimatedQuotes(vendors, intent, orgId, pr.id);
      await prisma.purchaseRequest.update({
        where: { id: pr.id },
        data: { status: 'quoted' }
      });
      markStep('generating_quotes', 'completed', { quotesCreated: quotes.length });

      // 6. Score vendors + generate AI recommendation
      markStep('scoring', 'processing');
      const scoredVendors = scoreVendors(quotes);
      const recommendation = await generateRecommendation(pr, scoredVendors);
      markStep('scoring', 'completed', { scoredVendors });

      const storedRecommendation = recommendation ? {
        ...recommendation,
        scoredVendors: scoredVendors.map(v => ({
          vendorId: v.vendorId,
          vendorName: v.vendorName,
          price: v.price,
          deliveryDays: v.deliveryDays,
          total: v.scores?.total,
        })),
      } : null;

      // 7. Present recommendation for approval
      await prisma.procurementPipeline.update({
        where: { id: pipeline.id },
        data: {
          status: 'AWAITING_APPROVAL',
          currentStep: 'awaiting_approval',
          recommendation: storedRecommendation,
          stepsCompleted: JSON.stringify(steps),
          purchaseRequestId: pr.id,
        }
      });

      // Notify officers/admins
      await createNotificationForRole({
        organizationId: orgId,
        role: 'officer',
        type: 'status_change',
        title: `🤖 Agent: ${intent.itemName} — Awaiting Approval`,
        message: `Procura processed: "${message}". Review and approve to generate PO.`,
        link: `/pr/${pr.id}`,
      });

      return {
        success: true,
        pipelineId: pipeline.id,
        prId: pr.id,
        intent,
        inventoryCheck: inventoryFulfillment,
        vendors,
        scoredVendors,
        recommendation,
        message: buildRecommendationMessage(intent, inventoryFulfillment, vendors, scoredVendors, recommendation),
        needsApproval: true,
        steps,
      };
    }

    // In-stock fulfillment
    await prisma.procurementPipeline.update({
      where: { id: pipeline.id },
      data: {
        status: 'COMPLETED',
        currentStep: 'fulfilled_from_inventory',
        stepsCompleted: JSON.stringify(steps),
      }
    });

    return {
      success: true,
      pipelineId: pipeline.id,
      message: inventoryFulfillment.message + ' No purchase needed!',
      needsApproval: false,
      inventoryFulfillment,
      steps,
    };

  } catch (err) {
    logger.error('autonomousAgent.processRequest', err.message);

    return {
      success: false,
      message: `I encountered an error while processing your request: ${err.message}`,
      needsApproval: false,
      error: err.message,
      steps,
    };
  }
}

/**
 * Handle human approval of a pipeline recommendation
 */
async function approveRecommendation(pipelineId, userId, orgId) {
  const pipeline = await prisma.procurementPipeline.findUnique({
    where: { id: pipelineId },
    include: {
      purchaseRequest: {
        include: {
          quotes: { include: { vendor: true } },
          user: true,
        }
      }
    }
  });

  if (!pipeline || pipeline.organizationId !== orgId) {
    throw new Error('Pipeline not found');
  }

  if (pipeline.status !== 'AWAITING_APPROVAL') {
    throw new Error(`Pipeline is in "${pipeline.status}" status, not awaiting approval`);
  }

  const steps = JSON.parse(pipeline.stepsCompleted || '[]');
  steps.push({ name: 'human_approval', status: 'approved', timestamp: new Date().toISOString() });

  const pr = pipeline.purchaseRequest;
  if (!pr) {
    throw new Error('No purchase request associated with this pipeline');
  }

  // Find the best quote (agent-estimated quotes are created during processing)
  let bestQuote = null;
  if (pr.quotes.length > 0) {
    const scored = scoreVendors(pr.quotes);
    const best = scored[0];
    if (best) {
      bestQuote = pr.quotes.find(q => q.vendorId === best.vendorId);
    }
  }

  // Safety net: if for some reason no quotes exist, create estimated ones
  if (!bestQuote) {
    let vendors = await prisma.vendor.findMany({
      where: { organizationId: orgId, category: pr.category },
      orderBy: { rating: 'desc' },
    });
    if (vendors.length === 0) {
      vendors = await prisma.vendor.findMany({
        where: { organizationId: orgId },
        orderBy: { rating: 'desc' },
        take: 10,
      });
    }
    if (vendors.length === 0) {
      throw new Error('No vendors available. Please add vendors before approving.');
    }

    const newQuotes = await createEstimatedQuotes(vendors, {
      itemName: pr.itemName,
      quantity: pr.quantity,
      budget: pr.budget,
    }, orgId, pr.id);

    const scored = scoreVendors(newQuotes);
    const best = scored[0];
    if (best) {
      bestQuote = newQuotes.find(q => q.vendorId === best.vendorId);
    }
  }

  if (!bestQuote) {
    throw new Error('Unable to determine a recommended vendor. Please add quotes manually and try again.');
  }

  // Generate the PO
  const po = await poGeneratorService.createPO(pr.id, bestQuote.vendorId, userId, orgId);

  steps.push({ name: 'po_generated', status: 'completed', data: { poNumber: po.poNumber }, timestamp: new Date().toISOString() });

  await prisma.procurementPipeline.update({
    where: { id: pipelineId },
    data: {
      status: 'COMPLETED',
      currentStep: 'completed',
      stepsCompleted: JSON.stringify(steps),
    }
  });

  logActivity(userId, 'agent_approved', 'ProcurementPipeline', pipelineId,
    `Approved agent recommendation → generated PO ${po.poNumber}`, orgId);

  return {
    success: true,
    po,
    message: `✅ Approved! Purchase Order ${po.poNumber} has been generated and sent to ${po.vendor.name}.`,
  };
}

/**
 * Handle human rejection of a pipeline recommendation
 */
async function rejectRecommendation(pipelineId, userId, orgId, reason) {
  const pipeline = await prisma.procurementPipeline.findUnique({
    where: { id: pipelineId }
  });

  if (!pipeline || pipeline.organizationId !== orgId) {
    throw new Error('Pipeline not found');
  }

  const steps = JSON.parse(pipeline.stepsCompleted || '[]');
  steps.push({ name: 'human_rejection', status: 'rejected', reason: reason || 'No reason provided', timestamp: new Date().toISOString() });

  await prisma.procurementPipeline.update({
    where: { id: pipelineId },
    data: {
      status: 'REJECTED',
      currentStep: 'rejected',
      stepsCompleted: JSON.stringify(steps),
    }
  });

  logActivity(userId, 'agent_rejected', 'ProcurementPipeline', pipelineId,
    `Rejected agent recommendation: ${reason || 'No reason'}`, orgId);

  return {
    success: true,
    message: 'Recommendation rejected. You can modify the purchase request and try again.',
  };
}

/**
 * Get pipeline status
 */
async function getPipelineStatus(pipelineId, orgId) {
  const pipeline = await prisma.procurementPipeline.findUnique({
    where: { id: pipelineId },
    include: {
      purchaseRequest: {
        include: {
          quotes: { include: { vendor: true } },
          attachments: true,
        }
      },
      user: { select: { name: true, email: true } },
    }
  });

  if (!pipeline || pipeline.organizationId !== orgId) {
    throw new Error('Pipeline not found');
  }

  return pipeline;
}

/**
 * Get pipeline history for an organization
 */
async function getPipelineHistory(orgId, limit = 20) {
  const pipelines = await prisma.procurementPipeline.findMany({
    where: { organizationId: orgId },
    include: {
      purchaseRequest: { select: { itemName: true, status: true } },
      user: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 50),
  });

  return pipelines;
}

/**
 * Build a human-readable recommendation message
 */
function buildRecommendationMessage(intent, inventory, vendors, scoredVendors, recommendation) {
  let msg = `## 📋 Procurement Analysis\n\n`;
  msg += `**Item:** ${intent.itemName}\n`;
  msg += `**Quantity:** ${intent.quantity}\n`;
  if (intent.budget) msg += `**Budget:** ${intent.budget.toLocaleString()}\n`;
  if (intent.department) msg += `**Department:** ${intent.department}\n`;
  msg += `**Urgency:** ${intent.urgency}\n\n`;

  // Inventory
  msg += `### 📦 Inventory Check\n`;
  msg += `${inventory.message}\n\n`;

  if (vendors && vendors.length > 0) {
    msg += `### 🏢 Vendors Found\n`;
    msg += `${vendors.length} vendor(s) in the "${intent.category}" category.\n\n`;

    if (scoredVendors && scoredVendors.length > 0) {
      msg += `### 🏆 Recommended Vendor\n`;
      const top = scoredVendors[0];
      msg += `**${top.vendorName}** — Score: ${top.scores.total}/100\n`;
      msg += `- Price: $${top.price} (${top.scores.price}/35)\n`;
      msg += `- Delivery: ${top.deliveryDays} days (${top.scores.delivery}/20)\n`;
      msg += `- Reliability: ${top.onTimeDelivery}% on-time (${top.scores.reliability}/30)\n`;
      msg += `- Rating: ${top.rating}/5 (${top.scores.rating}/15)\n\n`;
    }

    if (recommendation?.explanation) {
      msg += `### 🤖 AI Reasoning\n${recommendation.explanation}\n\n`;
    }
  }

  msg += `### ⏳ Next Steps\n`;
  msg += `Please review and approve this recommendation to generate a Purchase Order.`;

  return msg;
}

module.exports = {
  parseIntent,
  processRequest,
  approveRecommendation,
  rejectRecommendation,
  getPipelineStatus,
  getPipelineHistory,
};
