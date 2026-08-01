const prisma = require('../lib/prisma');
const { logActivity } = require('../routes/activityLogs');
const { createNotification } = require('./notificationService');
const logger = require('../lib/logger');

/**
 * Get all inventory items for an organization
 */
async function getInventory(orgId, filters = {}) {
  const where = { organizationId: orgId };
  
  if (filters.search) {
    where.OR = [
      { itemName: { contains: filters.search, mode: 'insensitive' } },
      { category: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.category) where.category = filters.category;
  // For lowStock filter, we'll fetch all and filter in memory since Prisma doesn't support
  // comparing one column against another in a WHERE clause with standard operators

  const items = await prisma.inventory.findMany({
    where,
    orderBy: { itemName: 'asc' },
    take: Math.min(filters.limit || 100, 200),
  });

  // lowStock filter is applied in-memory (Prisma can't compare columns in WHERE)
  if (filters.lowStock) {
    return items.filter(item => item.quantity <= item.minStockLevel);
  }

  return items;
}

/**
 * Add a new inventory item
 */
async function addItem(orgId, userId, data) {
  const { itemName, category, quantity, minStockLevel, unitPrice } = data;

  if (!itemName || !category) {
    throw new Error('Item name and category are required');
  }

  const existing = await prisma.inventory.findUnique({
    where: { itemName_organizationId: { itemName, organizationId: orgId } }
  });

  if (existing) {
    throw new Error(`Item "${itemName}" already exists in inventory`);
  }

  const item = await prisma.inventory.create({
    data: {
      itemName,
      category,
      quantity: parseInt(quantity) || 0,
      minStockLevel: parseInt(minStockLevel) || 5,
      unitPrice: unitPrice ? parseFloat(unitPrice) : null,
      organizationId: orgId,
    }
  });

  logActivity(userId, 'created', 'Inventory', item.id, `Added inventory item: ${itemName} (Qty: ${quantity})`, orgId);

  return item;
}

/**
 * Update stock level (add or deduct)
 */
async function updateStock(itemId, orgId, userId, quantity, type = 'set') {
  const item = await prisma.inventory.findUnique({ where: { id: itemId } });
  if (!item || item.organizationId !== orgId) {
    throw new Error('Inventory item not found');
  }

  let newQuantity;
  if (type === 'add') {
    newQuantity = item.quantity + parseInt(quantity);
  } else if (type === 'deduct') {
    newQuantity = Math.max(0, item.quantity - parseInt(quantity));
  } else {
    newQuantity = Math.max(0, parseInt(quantity));
  }

  const updated = await prisma.inventory.update({
    where: { id: itemId },
    data: { quantity: newQuantity }
  });

  const action = type === 'add' ? 'stock_added' : type === 'deduct' ? 'stock_deducted' : 'stock_set';
  logActivity(userId, action, 'Inventory', itemId, `Stock updated: ${item.itemName} → ${newQuantity} (${type}: ${quantity})`, orgId);

  // Check if stock is now below minimum and alert
  if (updated.quantity <= updated.minStockLevel) {
    await createNotification({
      userId,
      organizationId: orgId,
      type: 'status_change',
      title: `⚠️ Low Stock: ${updated.itemName}`,
      message: `Inventory item "${updated.itemName}" is at ${updated.quantity} units (min: ${updated.minStockLevel})`,
      link: '/inventory',
    });
  }

  return updated;
}

/**
 * Check stock availability for an item name.
 * Tries an exact match first, then a fuzzy keyword match so that
 * AI-parsed item names (e.g. "Premium Basmati Rice") can still find
 * seeded items (e.g. "Premium Basmati Rice (50kg bags)").
 */
async function checkStock(itemName, orgId) {
  // 1. Exact match (compound unique key)
  const exact = await prisma.inventory.findUnique({
    where: { itemName_organizationId: { itemName, organizationId: orgId } }
  });
  if (exact) {
    return {
      available: exact.quantity,
      inStock: exact.quantity > 0,
      lowStock: exact.quantity <= exact.minStockLevel,
      item: exact,
    };
  }

  // 2. Fuzzy match — extract meaningful keywords from the request
  const STOPWORDS = new Set([
    'need', 'want', 'please', 'for', 'the', 'and', 'of', 'to', 'buy',
    'purchase', 'order', 'get', 'us', 'we', 'some', 'urgent', 'asap',
    'a', 'an', 'our', 'this', 'from', 'procure', 'with', 'by', 'at', 'new', 'any'
  ]);
  const keywords = itemName.toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w))
    .slice(0, 4);

  if (keywords.length === 0) {
    return { available: 0, inStock: false, item: null };
  }

  const candidates = await prisma.inventory.findMany({
    where: {
      organizationId: orgId,
      OR: keywords.map(k => ({ itemName: { contains: k, mode: 'insensitive' } })),
    },
    take: 20,
  });

  // Pick the candidate with the most (and longest) keyword matches
  let best = null;
  let bestScore = 0;
  for (const c of candidates) {
    const name = c.itemName.toLowerCase();
    let score = 0;
    for (const k of keywords) {
      if (name.includes(k)) score += k.length;
    }
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  if (!best) {
    return { available: 0, inStock: false, item: null };
  }

  return {
    available: best.quantity,
    inStock: best.quantity > 0,
    lowStock: best.quantity <= best.minStockLevel,
    item: best,
  };
}

/**
 * Get items below minimum stock level
 */
async function getLowStockAlerts(orgId) {
  // Fetch all items and filter in memory since Prisma can't compare columns directly
  const allItems = await prisma.inventory.findMany({
    where: { organizationId: orgId },
    orderBy: { quantity: 'asc' },
  });

  return allItems.filter(item => item.quantity <= item.minStockLevel);
}

/**
 * Reserve stock for an incoming order (PO)
 */
async function reserveStock(itemId, orgId, quantity) {
  const item = await prisma.inventory.findUnique({ where: { id: itemId } });
  if (!item || item.organizationId !== orgId) {
    throw new Error('Inventory item not found');
  }

  // We don't deduct yet — just check availability
  if (item.quantity < parseInt(quantity)) {
    throw new Error(`Insufficient stock. Available: ${item.quantity}, Requested: ${quantity}`);
  }

  return item;
}

/**
 * Delete an inventory item
 */
async function deleteItem(itemId, orgId, userId) {
  const item = await prisma.inventory.findUnique({ where: { id: itemId } });
  if (!item || item.organizationId !== orgId) {
    throw new Error('Inventory item not found');
  }

  await prisma.inventory.delete({ where: { id: itemId } });
  logActivity(userId, 'deleted', 'Inventory', itemId, `Deleted inventory item: ${item.itemName}`, orgId);

  return { message: 'Item deleted successfully' };
}

module.exports = {
  getInventory,
  addItem,
  updateStock,
  checkStock,
  getLowStockAlerts,
  reserveStock,
  deleteItem,
};
