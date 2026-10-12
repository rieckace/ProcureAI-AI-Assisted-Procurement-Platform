const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

// ─── Time helpers — everything is spread over the last ~4 months ───
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysAhead = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
const randToken = () => crypto.randomBytes(24).toString('hex');

async function main() {
  console.log('🌱 Seeding ProcureAI database...');
  console.log('');

  // ─── Clean existing data (order matters — child tables first) ───
  await prisma.notification.deleteMany();
  await prisma.procurementPipeline.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.quoteRequest.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.purchaseRequest.deleteMany();
  await prisma.inviteToken.deleteMany();
  await prisma.vendorProduct.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
  console.log('  ✓ Database cleaned');

  const password = await bcrypt.hash('password123', 10);
  const ORG_SLUG = 'shivnath-mill';

  // ─── Organization ───
  const org = await prisma.organization.create({
    data: {
      name: 'Shiv Nath Rice, Flour & Oil Mill',
      slug: ORG_SLUG,
      email: 'pashupati@shivnathmill.com',
    },
  });
  console.log(`  ✓ Organization: ${org.name} (${org.slug})`);

  // ─── Users (accounts below are required by the e2e test suite) ───
  const mkUser = (name, email, role, department, bio) =>
    prisma.user.create({
      data: { name, email, password, role, department, bio, organizationId: org.id },
    });

  const admin = await mkUser(
    'Pashupati Agrahari', 'pashupati@shivnathmill.com', 'admin', 'Management',
    'Owner and managing director of Shiv Nath Mill. Reviews major procurement decisions.'
  );
  const officerRavi = await mkUser(
    'Ravi Agrahari', 'ravi@shivnathmill.com', 'officer', 'Procurement',
    'Senior procurement officer handling vendor sourcing and purchase orders.'
  );
  const officerRithiga = await mkUser(
    'Rithiga S', 'rithiga@shivnathmill.com', 'officer', 'Procurement',
    'Procurement officer responsible for quote collection and vendor communication.'
  );
  const mgrRikesh = await mkUser(
    'Rikesh Yadav', 'rikesh@shivnathmill.com', 'manager', 'Rice Mill',
    'Manages the rice milling unit — raw material and spare part requirements.'
  );
  const mgrKritika = await mkUser(
    'Kritika Sapkota', 'kritika@shivnathmill.com', 'manager', 'Flour Mill',
    'Manages the flour milling unit — wheat, maida and packaging needs.'
  );
  const mgrBishal = await mkUser(
    'Bishal Agrahari', 'bishal@shivnathmill.com', 'manager', 'Oil Mill',
    'Manages the oil extraction unit — seeds, oil and filtration equipment.'
  );
  console.log('  ✓ 6 users created (pashupati / ravi / rikesh — password123)');

  // ─── Vendors + Product Catalogs (unit = price per 1 kg / litre / unit / bag) ───
  const vendorSpecs = [
    {
      name: 'Bihar Grain Suppliers', email: 'sales@bihargrain.com', category: 'Rice',
      phone: '+91-94310-22145', onTimeDelivery: 96, defectRate: 0.8, rating: 4.5,
      products: [
        { name: 'Sona Masoori Rice (50kg bag)', unit: 'bag', unitPrice: 2900, availableQty: 400, status: 'available' },
        { name: 'Paddy (Raw)', unit: 'kg', unitPrice: 32, availableQty: 20000, status: 'available' },
        { name: 'Premium Basmati Rice (1121)', unit: 'kg', unitPrice: 95, availableQty: 5000, status: 'available' },
        { name: 'Basmati Rice (1121)', unit: 'kg', unitPrice: 100, availableQty: 8000, status: 'available' },
        { name: 'Broken Rice', unit: 'kg', unitPrice: 40, availableQty: 1200, status: 'low_stock' },
      ],
    },
    {
      name: 'Premium Basmati Exports', email: 'sales@premiumbasmati.com', category: 'Rice',
      phone: '+91-98114-77890', onTimeDelivery: 98, defectRate: 0.3, rating: 4.8,
      products: [
        { name: 'Premium Basmati Rice (1121)', unit: 'kg', unitPrice: 108, availableQty: 4000, status: 'available' },
        { name: 'Basmati Rice (1121)', unit: 'kg', unitPrice: 112, availableQty: 6000, status: 'available' },
        { name: 'Organic Basmati Rice', unit: 'kg', unitPrice: 135, availableQty: 900, status: 'low_stock' },
        { name: 'Basmati Broken (Export)', unit: 'kg', unitPrice: 55, availableQty: 2500, status: 'available' },
      ],
    },
    {
      name: 'Shree Balaji Rice Traders', email: 'orders@shreebalajirice.in', category: 'Rice',
      phone: '+91-93344-90211', onTimeDelivery: 91, defectRate: 1.4, rating: 4.0,
      products: [
        { name: 'Sona Masoori Rice (50kg bag)', unit: 'bag', unitPrice: 2850, availableQty: 500, status: 'available' },
        { name: 'Premium Basmati Rice (1121)', unit: 'kg', unitPrice: 102, availableQty: 3500, status: 'available' },
        { name: 'Basmati Rice (1121)', unit: 'kg', unitPrice: 104, availableQty: 4500, status: 'available' },
        { name: 'Broken Rice', unit: 'kg', unitPrice: 38, availableQty: 1800, status: 'available' },
      ],
    },
    {
      name: 'Wheat Fields Cooperative', email: 'orders@wheatfields.coop', category: 'Flour',
      phone: '+91-94152-33018', onTimeDelivery: 94, defectRate: 1.0, rating: 4.3,
      products: [
        { name: 'Whole Wheat Flour (25kg bag)', unit: 'bag', unitPrice: 1150, availableQty: 800, status: 'available' },
        { name: 'Maida (Refined Flour)', unit: 'kg', unitPrice: 42, availableQty: 5000, status: 'available' },
        { name: 'Whole Wheat Grain', unit: 'kg', unitPrice: 30, availableQty: 15000, status: 'available' },
        { name: 'Semolina (Suji)', unit: 'kg', unitPrice: 50, availableQty: 1500, status: 'available' },
      ],
    },
    {
      name: 'Golden Grain Mills', email: 'contact@goldengrain.in', category: 'Flour',
      phone: '+91-98270-11563', onTimeDelivery: 92, defectRate: 1.2, rating: 4.1,
      products: [
        { name: 'Whole Wheat Flour (25kg bag)', unit: 'bag', unitPrice: 1180, availableQty: 600, status: 'available' },
        { name: 'Maida (Refined Flour)', unit: 'kg', unitPrice: 44, availableQty: 3000, status: 'available' },
        { name: 'Semolina (Suji)', unit: 'kg', unitPrice: 52, availableQty: 700, status: 'low_stock' },
        { name: 'Wheat Bran', unit: 'kg', unitPrice: 18, availableQty: 9000, status: 'available' },
      ],
    },
    {
      name: 'Pure Oil Refineries Ltd', email: 'info@pureoil.in', category: 'Oil',
      phone: '+91-98714-55230', onTimeDelivery: 97, defectRate: 0.5, rating: 4.6,
      products: [
        { name: 'Refined Sunflower Oil (15L can)', unit: 'can', unitPrice: 2100, availableQty: 300, status: 'available' },
        { name: 'Kachi Ghani Mustard Oil (15L can)', unit: 'can', unitPrice: 2350, availableQty: 200, status: 'available' },
        { name: 'Soybean Oil (15L can)', unit: 'can', unitPrice: 1950, availableQty: 250, status: 'available' },
        { name: 'Rice Bran Oil (15L can)', unit: 'can', unitPrice: 2200, availableQty: 90, status: 'low_stock' },
      ],
    },
    {
      name: 'Mustard Oil Express', email: 'sales@mustardoil.in', category: 'Oil',
      phone: '+91-98671-20448', onTimeDelivery: 93, defectRate: 1.1, rating: 4.2,
      products: [
        { name: 'Kachi Ghani Mustard Oil (15L can)', unit: 'can', unitPrice: 2250, availableQty: 250, status: 'available' },
        { name: 'Mustard Seeds (Sarson)', unit: 'kg', unitPrice: 58, availableQty: 10000, status: 'available' },
        { name: 'Groundnut Oil (15L can)', unit: 'can', unitPrice: 2400, availableQty: 60, status: 'out_of_stock' },
      ],
    },
    {
      name: 'Agro Packaging Solutions', email: 'hello@agropack.in', category: 'Packaging',
      phone: '+91-97090-88172', onTimeDelivery: 95, defectRate: 0.6, rating: 4.4,
      products: [
        { name: 'PP Woven Bags (25kg)', unit: 'unit', unitPrice: 14, availableQty: 20000, status: 'available' },
        { name: 'BOPP Laminated Pouches (1kg)', unit: 'unit', unitPrice: 4, availableQty: 50000, status: 'available' },
        { name: 'Jute Bags (50kg)', unit: 'unit', unitPrice: 38, availableQty: 8000, status: 'available' },
        { name: 'Laminated Rolls (printed)', unit: 'roll', unitPrice: 450, availableQty: 500, status: 'available' },
      ],
    },
    {
      name: 'Shivam Packaging House', email: 'sales@shivampackaging.in', category: 'Packaging',
      phone: '+91-96690-33425', onTimeDelivery: 93, defectRate: 0.9, rating: 4.2,
      products: [
        { name: 'PP Woven Bags (25kg)', unit: 'unit', unitPrice: 15, availableQty: 15000, status: 'available' },
        { name: 'BOPP Laminated Pouches (1kg)', unit: 'unit', unitPrice: 4.5, availableQty: 30000, status: 'available' },
        { name: 'Corrugated Cartons', unit: 'unit', unitPrice: 28, availableQty: 10000, status: 'available' },
      ],
    },
    {
      name: 'MillTech Industries', email: 'sales@milltech.in', category: 'Equipment',
      phone: '+91-99310-44871', onTimeDelivery: 90, defectRate: 1.5, rating: 3.9,
      products: [
        { name: 'Rice Milling Roller (Rubber)', unit: 'unit', unitPrice: 12500, availableQty: 25, status: 'available' },
        { name: 'Flour Sifting Screen', unit: 'unit', unitPrice: 2400, availableQty: 40, status: 'available' },
        { name: 'Industrial Weighing Scale (500kg)', unit: 'unit', unitPrice: 16500, availableQty: 8, status: 'available' },
        { name: 'Conveyor Belt (10m)', unit: 'roll', unitPrice: 9000, availableQty: 5, status: 'low_stock' },
      ],
    },
    {
      name: 'TransportHaul Logistics', email: 'dispatch@transporthaul.in', category: 'Logistics',
      phone: '+91-98970-66419', onTimeDelivery: 88, defectRate: 2.0, rating: 3.7,
      products: [
        { name: 'Freight Truck (Full Load)', unit: 'unit', unitPrice: 18500, availableQty: 50, status: 'available' },
        { name: 'Cold Storage Transport', unit: 'unit', unitPrice: 28000, availableQty: 15, status: 'available' },
        { name: 'Last Mile Delivery Run', unit: 'unit', unitPrice: 4500, availableQty: 100, status: 'available' },
      ],
    },
    {
      name: 'Quality Assurance Labs', email: 'testing@qalabs.in', category: 'Services',
      phone: '+91-98210-77890', onTimeDelivery: 99, defectRate: 0.1, rating: 4.9,
      products: [
        { name: 'Grain Moisture Testing', unit: 'unit', unitPrice: 800, availableQty: 200, status: 'available' },
        { name: 'Oil Purity Testing', unit: 'unit', unitPrice: 1500, availableQty: 150, status: 'available' },
        { name: 'FSSAI Documentation', unit: 'unit', unitPrice: 12000, availableQty: 20, status: 'available' },
      ],
    },
  ];

  const vendors = {};
  for (const spec of vendorSpecs) {
    const { products, ...vendorData } = spec;
    const vendor = await prisma.vendor.create({ data: { ...vendorData, organizationId: org.id } });
    await prisma.vendorProduct.createMany({
      data: products.map(p => ({ ...p, category: spec.category, vendorId: vendor.id, organizationId: org.id })),
    });
    vendors[vendor.name] = vendor;
  }
  console.log(`  ✓ ${vendorSpecs.length} vendors created with product catalogs`);

  const V = (name) => vendors[name].id;
  const BIHAR = 'Bihar Grain Suppliers';
  const PREMIUM = 'Premium Basmati Exports';
  const BALAJI = 'Shree Balaji Rice Traders';
  const WHEAT = 'Wheat Fields Cooperative';
  const GOLDEN = 'Golden Grain Mills';
  const PURE_OIL = 'Pure Oil Refineries Ltd';
  const MUSTARD = 'Mustard Oil Express';
  const AGRO = 'Agro Packaging Solutions';
  const SHIVAM = 'Shivam Packaging House';
  const QAL = 'Quality Assurance Labs';

  // ─── Purchase Requests (15, all statuses, quantities with units) ───
  const PR_SPECS = [
    // pending (3) — recent requests
    { ref: 'basmati-pending', itemName: 'Premium Basmati Rice (1121)', category: 'Rice', quantity: 2000, unit: 'kg', budget: 220000, urgency: 'high',
      justification: 'Monthly basmati requirement for export-grade packing line', status: 'pending', user: mgrRikesh, base: 2 },
    { ref: 'mustard-pending', itemName: 'Mustard Seeds (Sarson)', category: 'Oil', quantity: 3000, unit: 'kg', budget: 180000, urgency: 'critical',
      justification: 'Peak-season mustard seed procurement — prices expected to rise', status: 'pending', user: mgrBishal, base: 5 },
    { ref: 'suji-pending', itemName: 'Semolina (Suji)', category: 'Flour', quantity: 500, unit: 'kg', budget: 25000, urgency: 'medium',
      justification: 'Restock semolina for vermicelli production line', status: 'pending', user: mgrKritika, base: 8 },

    // quoted (5) — quotes collected, awaiting PO decision
    { ref: 'sona-quoted', itemName: 'Sona Masoori Rice (50kg bag)', category: 'Rice', quantity: 300, unit: 'bag', budget: 900000, urgency: 'high',
      justification: 'Quarterly rice requirement for domestic supply contracts', status: 'quoted', user: mgrRikesh, base: 20,
      quotes: [
        { vendor: BIHAR, unitPrice: 2900, deliveryDays: 5, notes: 'Includes delivery to mill premises' },
        { vendor: BALAJI, unitPrice: 2850, deliveryDays: 6, notes: 'Best price for bulk order' },
      ] },
    { ref: 'flour-quoted', itemName: 'Whole Wheat Flour (25kg bag)', category: 'Flour', quantity: 400, unit: 'bag', budget: 480000, urgency: 'high',
      justification: 'Bulk flour order for institutional bakery clients', status: 'quoted', user: mgrKritika, base: 22,
      quotes: [
        { vendor: WHEAT, unitPrice: 1150, deliveryDays: 4, notes: 'Milled fresh on order' },
        { vendor: GOLDEN, unitPrice: 1180, deliveryDays: 6, notes: 'High gluten content' },
      ] },
    { ref: 'mustard-oil-quoted', itemName: 'Kachi Ghani Mustard Oil (15L can)', category: 'Oil', quantity: 150, unit: 'can', budget: 345000, urgency: 'high',
      justification: 'Restock mustard oil for retail brand packing', status: 'quoted', user: mgrBishal, base: 25,
      quotes: [
        { vendor: MUSTARD, unitPrice: 2250, deliveryDays: 5, notes: 'Kachi ghani, cold pressed' },
        { vendor: PURE_OIL, unitPrice: 2350, deliveryDays: 7, notes: 'Bulk refinery rate' },
      ] },
    { ref: 'pp-bags-quoted', itemName: 'PP Woven Bags (25kg)', category: 'Packaging', quantity: 20000, unit: 'unit', budget: 300000, urgency: 'medium',
      justification: 'Quarterly packaging stock for rice and flour dispatch', status: 'quoted', user: mgrRikesh, base: 28,
      quotes: [
        { vendor: AGRO, unitPrice: 14, deliveryDays: 10, notes: 'Plain woven, no print' },
        { vendor: SHIVAM, unitPrice: 15, deliveryDays: 12, notes: 'With logo printing included' },
      ] },
    { ref: 'basmati-quoted', itemName: 'Basmati Rice (1121)', category: 'Rice', quantity: 1500, unit: 'kg', budget: 165000, urgency: 'medium',
      justification: 'Basmati blend for domestic loose-sale brand', status: 'quoted', user: mgrRikesh, base: 30,
      quotes: [
        { vendor: BIHAR, unitPrice: 95, deliveryDays: 6, notes: 'Aged 12 months' },
        { vendor: PREMIUM, unitPrice: 108, deliveryDays: 4, notes: 'Export grade, aged 18 months' },
        { vendor: BALAJI, unitPrice: 102, deliveryDays: 7, notes: 'Competitive bulk rate' },
      ] },

    // ordered (4) — PO issued, in various lifecycle stages
    { ref: 'basmati-ordered', itemName: 'Premium Basmati Rice (1121)', category: 'Rice', quantity: 2500, unit: 'kg', budget: 275000, urgency: 'critical',
      justification: 'Export order fulfilment — shipment due next month', status: 'ordered', user: mgrRikesh, base: 40,
      quotes: [
        { vendor: BIHAR, unitPrice: 100, deliveryDays: 6, notes: 'Aged 12 months, export grade' },
        { vendor: PREMIUM, unitPrice: 108, deliveryDays: 4, notes: 'Premium 1121, aged 18 months' },
        { vendor: BALAJI, unitPrice: 104, deliveryDays: 7, notes: 'Bulk rate' },
      ],
      po: { number: 'PO-2026-0001', status: 'PENDING_APPROVAL', winner: PREMIUM, createdDaysAgo: 10, expectedInDays: 12 } },
    { ref: 'maida-ordered', itemName: 'Maida (Refined Flour)', category: 'Flour', quantity: 1000, unit: 'kg', budget: 45000, urgency: 'high',
      justification: 'Monthly maida requirement for biscuit unit', status: 'ordered', user: mgrKritika, base: 55,
      quotes: [
        { vendor: WHEAT, unitPrice: 42, deliveryDays: 4, notes: 'Fine grind, 90% extraction' },
        { vendor: GOLDEN, unitPrice: 44, deliveryDays: 5, notes: 'Consistent gluten strength' },
      ],
      po: { number: 'PO-2026-0002', status: 'APPROVED', winner: WHEAT, createdDaysAgo: 30, approvedDaysAgo: 28, expectedInDays: 5 } },
    { ref: 'sunflower-ordered', itemName: 'Refined Sunflower Oil (15L can)', category: 'Oil', quantity: 120, unit: 'can', budget: 252000, urgency: 'high',
      justification: 'Sunflower oil for premium cooking oil brand', status: 'ordered', user: mgrBishal, base: 65,
      quotes: [
        { vendor: PURE_OIL, unitPrice: 2100, deliveryDays: 5, notes: 'Refined, packed fresh' },
      ],
      po: { number: 'PO-2026-0003', status: 'SENT_TO_VENDOR', winner: PURE_OIL, createdDaysAgo: 45, approvedDaysAgo: 43, sentDaysAgo: 40, expectedInDays: 7 } },
    { ref: 'sona-ordered', itemName: 'Sona Masoori Rice (50kg bag)', category: 'Rice', quantity: 200, unit: 'bag', budget: 580000, urgency: 'medium',
      justification: 'Replenish rice inventory for retail brand', status: 'ordered', user: mgrRikesh, base: 80,
      quotes: [
        { vendor: BIHAR, unitPrice: 2900, deliveryDays: 5, notes: 'Steam polished' },
        { vendor: BALAJI, unitPrice: 2850, deliveryDays: 6, notes: 'Bulk discount applied' },
      ],
      po: { number: 'PO-2026-0004', status: 'IN_TRANSIT', winner: BALAJI, createdDaysAgo: 60, approvedDaysAgo: 58, sentDaysAgo: 55, expectedInDays: 5 } },

    // delivered (2) — complete lifecycle
    { ref: 'flour-delivered', itemName: 'Whole Wheat Flour (25kg bag)', category: 'Flour', quantity: 250, unit: 'bag', budget: 300000, urgency: 'medium',
      justification: 'Bulk flour order for institutional clients', status: 'delivered', user: mgrKritika, base: 100,
      quotes: [
        { vendor: WHEAT, unitPrice: 1150, deliveryDays: 4, notes: 'Freshly milled' },
        { vendor: GOLDEN, unitPrice: 1180, deliveryDays: 6, notes: 'High gluten' },
      ],
      po: { number: 'PO-2026-0005', status: 'DELIVERED', winner: WHEAT, createdDaysAgo: 80, approvedDaysAgo: 78, sentDaysAgo: 75, expectedInDays: -4, deliveredDaysAgo: 70 } },
    { ref: 'sunflower-delivered', itemName: 'Refined Sunflower Oil (15L can)', category: 'Oil', quantity: 100, unit: 'can', budget: 210000, urgency: 'low',
      justification: 'Stock-up for upcoming festival season', status: 'delivered', user: mgrBishal, base: 110,
      quotes: [
        { vendor: PURE_OIL, unitPrice: 2100, deliveryDays: 5, notes: 'Refined, packed fresh' },
      ],
      po: { number: 'PO-2026-0006', status: 'DELIVERED', winner: PURE_OIL, createdDaysAgo: 90, approvedDaysAgo: 88, sentDaysAgo: 85, expectedInDays: -2, deliveredDaysAgo: 82 } },

    // rejected (1) — cancelled by management
    { ref: 'fssai-rejected', itemName: 'FSSAI Documentation Renewal', category: 'Services', quantity: 1, unit: 'unit', budget: 15000, urgency: 'low',
      justification: 'Annual FSSAI license renewal for the mill', status: 'rejected', user: mgrBishal, base: 45 },
  ];

  const prs = {};
  const allLogs = [];
  const log = (user, action, entity, entityId, details, at) =>
    allLogs.push({ userId: user.id, organizationId: org.id, action, entity, entityId, details, createdAt: at });

  for (const spec of PR_SPECS) {
    const createdAt = daysAgo(spec.base);
    const pr = await prisma.purchaseRequest.create({
      data: {
        itemName: spec.itemName,
        category: spec.category,
        quantity: spec.quantity,
        unit: spec.unit,
        budget: spec.budget,
        urgency: spec.urgency,
        justification: spec.justification,
        status: spec.status,
        userId: spec.user.id,
        organizationId: org.id,
        createdAt,
        updatedAt: daysAgo(Math.max(0, spec.base - 3)),
      },
    });
    prs[spec.ref] = pr;
    log(spec.user, 'created', 'PurchaseRequest', pr.id, `Created PR: ${spec.itemName} (${spec.quantity} ${spec.unit})`, createdAt);
  }
  console.log(`  ✓ ${PR_SPECS.length} purchase requests created (all statuses)`);

  // ─── Quotes (per-unit prices — total = unitPrice × quantity) ───
  let quoteCount = 0;
  for (const spec of PR_SPECS) {
    if (!spec.quotes) continue;
    const pr = prs[spec.ref];
    for (let i = 0; i < spec.quotes.length; i++) {
      const q = spec.quotes[i];
      const price = Math.round(q.unitPrice * spec.quantity * 100) / 100;
      await prisma.quote.create({
        data: {
          prId: pr.id,
          vendorId: V(q.vendor),
          price,
          unitPrice: q.unitPrice,
          deliveryDays: q.deliveryDays,
          notes: q.notes,
          organizationId: org.id,
          createdAt: daysAgo(spec.base - 3 - i),
        },
      });
      const officer = i % 2 === 0 ? officerRavi : officerRithiga;
      log(officer, 'added_quote', 'PurchaseRequest', pr.id,
        `Added quote from ${q.vendor}: ₹${price.toLocaleString('en-IN')} (₹${q.unitPrice}/${spec.unit})`, daysAgo(spec.base - 3 - i));
      quoteCount++;
    }
  }
  console.log(`  ✓ ${quoteCount} quotes created (unit price × quantity = total)`);

  // ─── Quote Requests (token workflow) — completed for quoted PRs, sent/expired for pending ───
  const mkQuoteRequest = (pr, vendorName, status, sentAgo, expiresAgo, completedAgo) =>
    prisma.quoteRequest.create({
      data: {
        prId: pr.id,
        vendorId: V(vendorName),
        token: randToken(),
        status,
        sentAt: daysAgo(sentAgo),
        expiresAt: daysAgo(expiresAgo),
        completedAt: completedAgo ? daysAgo(completedAgo) : null,
        organizationId: org.id,
        createdAt: daysAgo(sentAgo + 1),
      },
    });

  // Active (sent) quote requests on pending PRs — demo the live workflow
  await mkQuoteRequest(prs['basmati-pending'], PREMIUM, 'sent', 1, -5);
  await mkQuoteRequest(prs['basmati-pending'], BALAJI, 'sent', 1, -5);
  await mkQuoteRequest(prs['mustard-pending'], MUSTARD, 'sent', 2, -4);
  await mkQuoteRequest(prs['suji-pending'], GOLDEN, 'expired', 10, 2);

  // Completed requests for every quoted/ordered/delivered PR
  for (const spec of PR_SPECS) {
    if (!spec.quotes) continue;
    const pr = prs[spec.ref];
    for (let i = 0; i < spec.quotes.length; i++) {
      await mkQuoteRequest(pr, spec.quotes[i].vendor, 'completed', spec.base - 4 - i, spec.base - 5 - i, spec.base - 2 - i);
    }
  }
  console.log('  ✓ Quote requests seeded (sent / completed / expired)');

  // ─── Purchase Orders + Deliveries ───
  let poCount = 0;
  for (const spec of PR_SPECS) {
    if (!spec.po) continue;
    const pr = prs[spec.ref];
    const poSpec = spec.po;
    const winningQuote = spec.quotes.find(q => q.vendor === poSpec.winner);
    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber: poSpec.number,
        purchaseRequestId: pr.id,
        vendorId: V(poSpec.winner),
        totalAmount: Math.round(winningQuote.unitPrice * spec.quantity * 100) / 100,
        status: poSpec.status,
        approvedBy: poSpec.approvedDaysAgo ? officerRavi.id : null,
        approvedAt: poSpec.approvedDaysAgo ? daysAgo(poSpec.approvedDaysAgo) : null,
        sentAt: poSpec.sentDaysAgo ? daysAgo(poSpec.sentDaysAgo) : null,
        expectedDelivery: daysAhead(poSpec.expectedInDays),
        organizationId: org.id,
        createdAt: daysAgo(poSpec.createdDaysAgo),
        updatedAt: daysAgo(Math.max(0, poSpec.createdDaysAgo - 2)),
      },
    });
    poCount++;

    // Delivery record matching the PO lifecycle
    const deliveryStatus = poSpec.status === 'PENDING_APPROVAL' ? 'PREPARING'
      : poSpec.status === 'APPROVED' ? 'PROCESSING'
      : poSpec.status === 'SENT_TO_VENDOR' ? 'SHIPPED'
      : poSpec.status === 'IN_TRANSIT' ? 'IN_TRANSIT'
      : 'DELIVERED';

    await prisma.delivery.create({
      data: {
        purchaseOrderId: po.id,
        status: deliveryStatus,
        trackingNumber: deliveryStatus === 'PREPARING' || deliveryStatus === 'PROCESSING'
          ? null : `SNM-${poSpec.number.slice(-4)}-${String(Math.floor(Math.random() * 900) + 100)}`,
        estimatedArrival: po.expectedDelivery,
        actualArrival: poSpec.deliveredDaysAgo ? daysAgo(poSpec.deliveredDaysAgo) : null,
        notes: deliveryStatus === 'IN_TRANSIT' ? 'Truck dispatched — driver: Mohan (verified via GPS)'
          : deliveryStatus === 'DELIVERED' ? 'Delivered and quality-checked at mill gate'
          : deliveryStatus === 'SHIPPED' ? 'Handed over to carrier, awaiting first scan'
          : 'Order queued for packing at vendor warehouse',
        createdAt: daysAgo(poSpec.createdDaysAgo),
        updatedAt: daysAgo(Math.max(0, poSpec.createdDaysAgo - 2)),
      },
    });

    log(officerRavi, 'created', 'PurchaseOrder', po.id, `Generated PO ${poSpec.number} for ${spec.itemName}`, daysAgo(poSpec.createdDaysAgo));
    if (poSpec.approvedDaysAgo) {
      log(officerRavi, 'approved', 'PurchaseOrder', po.id, `Approved PO ${poSpec.number}`, daysAgo(poSpec.approvedDaysAgo));
    }
    if (poSpec.deliveredDaysAgo) {
      log(officerRavi, 'status_changed', 'PurchaseOrder', po.id, `PO ${poSpec.number} delivered`, daysAgo(poSpec.deliveredDaysAgo));
    }
  }
  console.log(`  ✓ ${poCount} purchase orders + matching deliveries created`);

  // ─── Inventory (aligned with catalog names + units) ───
  const inventorySpecs = [
    { itemName: 'Premium Basmati Rice (1121)', category: 'Rice', quantity: 800, unit: 'kg', minStockLevel: 300, unitPrice: 108 },
    { itemName: 'Sona Masoori Rice (50kg bag)', category: 'Rice', quantity: 120, unit: 'bag', minStockLevel: 60, unitPrice: 2900 },
    { itemName: 'Whole Wheat Flour (25kg bag)', category: 'Flour', quantity: 90, unit: 'bag', minStockLevel: 40, unitPrice: 1150 },
    { itemName: 'Maida (Refined Flour)', category: 'Flour', quantity: 350, unit: 'kg', minStockLevel: 500, unitPrice: 42 },
    { itemName: 'Refined Sunflower Oil (15L can)', category: 'Oil', quantity: 45, unit: 'can', minStockLevel: 25, unitPrice: 2100 },
    { itemName: 'Kachi Ghani Mustard Oil (15L can)', category: 'Oil', quantity: 18, unit: 'can', minStockLevel: 20, unitPrice: 2250 },
    { itemName: 'Mustard Seeds (Sarson)', category: 'Oil', quantity: 900, unit: 'kg', minStockLevel: 1000, unitPrice: 58 },
    { itemName: 'PP Woven Bags (25kg)', category: 'Packaging', quantity: 8000, unit: 'unit', minStockLevel: 5000, unitPrice: 14 },
    { itemName: 'Rice Milling Roller (Rubber)', category: 'Equipment', quantity: 4, unit: 'unit', minStockLevel: 6, unitPrice: 12500 },
    { itemName: 'Flour Sifting Screen', category: 'Equipment', quantity: 12, unit: 'unit', minStockLevel: 10, unitPrice: 2400 },
  ];
  for (let i = 0; i < inventorySpecs.length; i++) {
    const inv = inventorySpecs[i];
    await prisma.inventory.create({
      data: { ...inv, organizationId: org.id, createdAt: daysAgo(60 - i * 3), updatedAt: daysAgo(2) },
    });
  }
  console.log(`  ✓ ${inventorySpecs.length} inventory items created (some below min stock)`);

  // ─── Notifications ───
  const notifications = [
    { user: mgrRikesh, type: 'status_change', title: '📝 New quote received', message: 'Shree Balaji Rice Traders quoted ₹8,55,000 for Sona Masoori Rice (50kg bag)', link: `/pr/${prs['sona-quoted'].id}`, read: false, ago: 17 },
    { user: mgrRikesh, type: 'status_change', title: '🚚 Order in transit', message: 'PO-2026-0004 (Sona Masoori Rice) is on the way — expected in 5 days', link: '/purchase-orders', read: false, ago: 3 },
    { user: mgrRikesh, type: 'po_issued', title: '📦 PO Generated: PO-2026-0001', message: 'Purchase Order issued to Premium Basmati Exports for 2,500 kg basmati rice', link: `/pr/${prs['basmati-ordered'].id}`, read: false, ago: 10 },
    { user: mgrKritika, type: 'status_change', title: '📝 New quote received', message: 'Wheat Fields Cooperative quoted ₹4,60,000 for Whole Wheat Flour (25kg bag)', link: `/pr/${prs['flour-quoted'].id}`, read: false, ago: 19 },
    { user: mgrKritika, type: 'status_change', title: '✅ Delivery completed', message: 'Whole Wheat Flour (25kg bag) delivered and quality-checked', link: `/pr/${prs['flour-delivered'].id}`, read: true, ago: 70 },
    { user: mgrBishal, type: 'status_change', title: '📝 New quote received', message: 'Mustard Oil Express quoted ₹3,37,500 for Kachi Ghani Mustard Oil (15L can)', link: `/pr/${prs['mustard-oil-quoted'].id}`, read: false, ago: 22 },
    { user: mgrBishal, type: 'status_change', title: '⚠️ Low stock: Mustard Seeds', message: 'Mustard Seeds (Sarson) at 900 kg (minimum: 1000 kg). Consider reordering.', link: '/inventory', read: false, ago: 2 },
    { user: officerRavi, type: 'status_change', title: '📝 New PR: Mustard Seeds (Sarson)', message: 'Bishal Agrahari created a critical purchase request for 3,000 kg mustard seeds', link: `/pr/${prs['mustard-pending'].id}`, read: false, ago: 5 },
    { user: officerRavi, type: 'new_quote', title: '💬 Quote added by vendor', message: 'Premium Basmati Exports submitted a quote via the portal', link: `/pr/${prs['basmati-quoted'].id}`, read: true, ago: 30 },
    { user: officerRithiga, type: 'po_issued', title: '📦 PO Generated: PO-2026-0002', message: 'Purchase Order issued to Wheat Fields Cooperative for maida', link: '/purchase-orders', read: true, ago: 30 },
    { user: admin, type: 'vendor_added', title: '🏢 Vendor added', message: 'Shivam Packaging House was added to the vendor list', link: '/manage-vendors', read: true, ago: 40 },
    { user: admin, type: 'status_change', title: '✅ PO delivered', message: 'PO-2026-0006 (Refined Sunflower Oil) delivered', link: '/purchase-orders', read: true, ago: 82 },
  ];
  for (const n of notifications) {
    await prisma.notification.create({
      data: {
        userId: n.user.id,
        organizationId: org.id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        read: n.read,
        createdAt: daysAgo(n.ago),
      },
    });
  }
  console.log(`  ✓ ${notifications.length} notifications created`);

  // ─── Procurement Pipelines (AgentDashboard) ───
  const pipelineSpecs = [
    {
      status: 'COMPLETED', user: mgrRikesh, pr: prs['sona-ordered'], base: 18,
      intent: { itemName: 'Sona Masoori Rice (50kg bag)', category: 'Rice', quantity: 200, unit: 'bag', budget: 580000, department: 'Rice Mill', urgency: 'medium' },
      recommendation: {
        explanation: 'Shree Balaji Rice Traders offers the best value at ₹2,850/bag with strong bulk pricing. Recommended for this order.',
        fallback: true,
        scoredVendors: [
          { vendorId: V(BALAJI), vendorName: BALAJI, price: 570000, deliveryDays: 6, total: 88 },
          { vendorId: V(BIHAR), vendorName: BIHAR, price: 580000, deliveryDays: 5, total: 84 },
        ],
      },
      steps: ['intent_parsing', 'inventory_check', 'vendor_search', 'creating_pr', 'generating_quotes', 'scoring', 'human_approval', 'po_generated'],
    },
    {
      status: 'AWAITING_APPROVAL', user: mgrRikesh, pr: prs['basmati-pending'], base: 3,
      intent: { itemName: 'Premium Basmati Rice (1121)', category: 'Rice', quantity: 2000, unit: 'kg', budget: 220000, department: 'Rice Mill', urgency: 'high' },
      recommendation: {
        explanation: 'Premium Basmati Exports is the top-rated rice vendor (4.8★, 98% on-time) with competitive pricing. Awaiting final approval to generate PO.',
        fallback: true,
        scoredVendors: [
          { vendorId: V(PREMIUM), vendorName: PREMIUM, price: 216000, deliveryDays: 4, total: 91 },
          { vendorId: V(BALAJI), vendorName: BALAJI, price: 204000, deliveryDays: 7, total: 82 },
        ],
      },
      steps: ['intent_parsing', 'inventory_check', 'vendor_search', 'creating_pr', 'generating_quotes', 'scoring'],
    },
    {
      status: 'REJECTED', user: mgrBishal, pr: prs['fssai-rejected'], base: 42,
      intent: { itemName: 'FSSAI Documentation Renewal', category: 'Services', quantity: 1, unit: 'unit', budget: 15000, department: 'Oil Mill', urgency: 'low' },
      recommendation: {
        explanation: 'Quality Assurance Labs quoted ₹12,000 for documentation. Recommendation rejected — procurement deferred to next quarter.',
        fallback: true,
        scoredVendors: [
          { vendorId: V(QAL), vendorName: 'Quality Assurance Labs', price: 12000, deliveryDays: 21, total: 95 },
        ],
      },
      steps: ['intent_parsing', 'inventory_check', 'vendor_search', 'creating_pr', 'generating_quotes', 'scoring', 'human_rejection'],
    },
  ];
  for (const p of pipelineSpecs) {
    await prisma.procurementPipeline.create({
      data: {
        organizationId: org.id,
        purchaseRequestId: p.pr.id,
        status: p.status,
        intent: p.intent,
        recommendation: p.recommendation,
        currentStep: p.steps[p.steps.length - 1],
        stepsCompleted: p.steps,
        userId: p.user.id,
        createdAt: daysAgo(p.base),
        updatedAt: daysAgo(Math.max(0, p.base - 1)),
      },
    });
  }
  console.log(`  ✓ ${pipelineSpecs.length} agent pipelines created`);

  // ─── Remaining Activity Logs (status changes + rejections) ───
  for (const spec of PR_SPECS) {
    const pr = prs[spec.ref];
    if (spec.status === 'quoted') {
      log(officerRavi, 'status_changed', 'PurchaseRequest', pr.id, `Status changed from pending to quoted`, daysAgo(spec.base - 2));
    }
    if (spec.status === 'rejected') {
      log(mgrBishal, 'cancelled', 'PurchaseRequest', pr.id, `Cancelled PR: ${spec.itemName} — deferred to next quarter`, daysAgo(spec.base - 2));
    }
  }
  for (const entry of allLogs) {
    await prisma.activityLog.create({ data: entry });
  }
  console.log(`  ✓ ${allLogs.length} activity logs created`);
  console.log('');
  console.log('✅ Seeding complete!');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Shiv Nath Rice, Flour & Oil Mill');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   Org Slug: shivnath-mill');
  console.log('');
  console.log('  👑 Admin:');
  console.log('     pashupati@shivnathmill.com / password123');
  console.log('');
  console.log('  📋 Procurement Officers:');
  console.log('     ravi@shivnathmill.com / password123');
  console.log('     rithiga@shivnathmill.com / password123');
  console.log('');
  console.log('  📝 Department Managers:');
  console.log('     rikesh@shivnathmill.com / password123 (Rice Mill)');
  console.log('     kritika@shivnathmill.com / password123 (Flour Mill)');
  console.log('     bishal@shivnathmill.com / password123 (Oil Mill)');
  console.log('');
  console.log(`  🏪 Vendors: ${vendorSpecs.length} (with product catalogs)`);
  console.log(`  📦 Purchase Requests: ${PR_SPECS.length} (all statuses)`);
  console.log(`  💰 Quotes: ${quoteCount}`);
  console.log(`  🧾 Purchase Orders: ${poCount}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
