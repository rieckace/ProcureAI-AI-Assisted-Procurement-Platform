const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding ProcureAI database...');
  console.log('');

  // ─── Clean existing data (order matters — child tables first) ───
  await prisma.quoteRequest.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.purchaseRequest.deleteMany();
  await prisma.inviteToken.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
  console.log('  ✓ Database cleaned');

  const password = await bcrypt.hash('password123', 10);
  const ORG_SLUG = 'shivnath-mill';

  // ─── Create Organization ───
  const org = await prisma.organization.create({
    data: {
      name: 'Shiv Nath Rice, flour and Oil Mill',
      slug: ORG_SLUG,
      email: 'pashupati@shivnathmill.com',
    },
  });
  console.log(`  ✓ Organization created: ${org.name} (${org.slug})`);

  // ─── Create Users ───
  // Admin: Pashupati Agrahari
  const admin = await prisma.user.create({
    data: {
      name: 'Pashupati Agrahari',
      email: 'pashupati@shivnathmill.com',
      password,
      role: 'admin',
      department: 'Management',
      organizationId: org.id,
    },
  });
  console.log(`  ✓ Admin: Pashupati Agrahari (pashupati@shivnathmill.com)`);

  // Procurement Officer 1: Ravi Agrahari
  const officerRavi = await prisma.user.create({
    data: {
      name: 'Ravi Agrahari',
      email: 'ravi@shivnathmill.com',
      password,
      role: 'officer',
      department: 'Procurement',
      organizationId: org.id,
    },
  });
  console.log(`  ✓ Procurement Officer: Ravi Agrahari (ravi@shivnathmill.com)`);

  // Procurement Officer 2: Rithiga S
  const officerRithiga = await prisma.user.create({
    data: {
      name: 'Rithiga S',
      email: 'rithiga@shivnathmill.com',
      password,
      role: 'officer',
      department: 'Procurement',
      organizationId: org.id,
    },
  });
  console.log(`  ✓ Procurement Officer: Rithiga S (rithiga@shivnathmill.com)`);

  // Department Manager: Rikesh Yadav
  const mgrRikesh = await prisma.user.create({
    data: {
      name: 'Rikesh Yadav',
      email: 'rikesh@shivnathmill.com',
      password,
      role: 'manager',
      department: 'Rice Mill',
      organizationId: org.id,
    },
  });
  console.log(`  ✓ Dept Manager: Rikesh Yadav (rikesh@shivnathmill.com)`);

  // Department Manager: Kritika Sapkota
  const mgrKritika = await prisma.user.create({
    data: {
      name: 'Kritika Sapkota',
      email: 'kritika@shivnathmill.com',
      password,
      role: 'manager',
      department: 'Flour Mill',
      organizationId: org.id,
    },
  });
  console.log(`  ✓ Dept Manager: Kritika Sapkota (kritika@shivnathmill.com)`);

  // Department Manager: Bishal Agrahari
  const mgrBishal = await prisma.user.create({
    data: {
      name: 'Bishal Agrahari',
      email: 'bishal@shivnathmill.com',
      password,
      role: 'manager',
      department: 'Oil Mill',
      organizationId: org.id,
    },
  });
  console.log(`  ✓ Dept Manager: Bishal Agrahari (bishal@shivnathmill.com)`);

  // ─── Create Vendors (Rice, Flour, Oil Mill related) ───
  const vendors = await Promise.all([
    prisma.vendor.create({
      data: {
        name: 'Bihar Grain Suppliers',
        email: 'info@bihargrain.com',
        category: 'Rice',
        phone: '+91-9876543210',
        onTimeDelivery: 96, defectRate: 0.8, rating: 4.5,
        organizationId: org.id,
      },
    }),
    prisma.vendor.create({
      data: {
        name: 'Premium Basmati Exports',
        email: 'sales@premiumbasmati.com',
        category: 'Rice',
        phone: '+91-9876543211',
        onTimeDelivery: 98, defectRate: 0.3, rating: 4.8,
        organizationId: org.id,
      },
    }),
    prisma.vendor.create({
      data: {
        name: 'Wheat Fields Cooperative',
        email: 'orders@wheatfields.coop',
        category: 'Flour',
        phone: '+91-9876543212',
        onTimeDelivery: 94, defectRate: 1.0, rating: 4.3,
        organizationId: org.id,
      },
    }),
    prisma.vendor.create({
      data: {
        name: 'Golden Grain Mills',
        email: 'contact@goldengrain.in',
        category: 'Flour',
        phone: '+91-9876543213',
        onTimeDelivery: 92, defectRate: 1.2, rating: 4.1,
        organizationId: org.id,
      },
    }),
    prisma.vendor.create({
      data: {
        name: 'Pure Oil Refineries Ltd',
        email: 'info@pureoil.in',
        category: 'Oil',
        phone: '+91-9876543214',
        onTimeDelivery: 97, defectRate: 0.5, rating: 4.6,
        organizationId: org.id,
      },
    }),
    prisma.vendor.create({
      data: {
        name: 'Mustard Oil Express',
        email: 'sales@mustardoil.in',
        category: 'Oil',
        phone: '+91-9876543215',
        onTimeDelivery: 93, defectRate: 1.1, rating: 4.2,
        organizationId: org.id,
      },
    }),
    prisma.vendor.create({
      data: {
        name: 'Agro Packaging Solutions',
        email: 'hello@agropack.in',
        category: 'Packaging',
        phone: '+91-9876543216',
        onTimeDelivery: 95, defectRate: 0.6, rating: 4.4,
        organizationId: org.id,
      },
    }),
    prisma.vendor.create({
      data: {
        name: 'MillTech Industries',
        email: 'sales@milltech.in',
        category: 'Equipment',
        phone: '+91-9876543217',
        onTimeDelivery: 90, defectRate: 1.5, rating: 3.9,
        organizationId: org.id,
      },
    }),
    prisma.vendor.create({
      data: {
        name: 'TransportHaul Logistics',
        email: 'dispatch@transporthaul.in',
        category: 'Logistics',
        phone: '+91-9876543218',
        onTimeDelivery: 88, defectRate: 2.0, rating: 3.7,
        organizationId: org.id,
      },
    }),
    prisma.vendor.create({
      data: {
        name: 'Quality Assurance Labs',
        email: 'testing@qalabs.in',
        category: 'Services',
        phone: '+91-9876543219',
        onTimeDelivery: 99, defectRate: 0.1, rating: 4.9,
        organizationId: org.id,
      },
    }),
  ]);
  console.log(`  ✓ ${vendors.length} vendors created for ${org.name}`);

  // ─── Create Purchase Requests ───

  // Rikesh (Rice Mill) creates requests
  const pr1 = await prisma.purchaseRequest.create({
    data: {
      itemName: 'Premium Basmati Rice (50kg bags)',
      category: 'Rice',
      quantity: 500,
      budget: 750000,
      urgency: 'high',
      justification: 'Monthly production requirement for basmati rice export orders',
      status: 'quoted',
      userId: mgrRikesh.id,
      organizationId: org.id,
    },
  });

  const pr2 = await prisma.purchaseRequest.create({
    data: {
      itemName: 'Rice Milling Roller Replacement',
      category: 'Equipment',
      quantity: 10,
      budget: 120000,
      urgency: 'critical',
      justification: 'Current rollers worn out — production capacity down by 30%',
      status: 'pending',
      userId: mgrRikesh.id,
      organizationId: org.id,
    },
  });

  const pr3 = await prisma.purchaseRequest.create({
    data: {
      itemName: 'Rice Packaging Bags (5kg, 10kg, 25kg)',
      category: 'Packaging',
      quantity: 10000,
      budget: 85000,
      urgency: 'medium',
      justification: 'Quarterly packaging stock for rice dispatch',
      status: 'pending',
      userId: mgrRikesh.id,
      organizationId: org.id,
    },
  });

  // Kritika (Flour Mill) creates requests
  const pr4 = await prisma.purchaseRequest.create({
    data: {
      itemName: 'Whole Wheat Flour (25kg bags)',
      category: 'Flour',
      quantity: 300,
      budget: 360000,
      urgency: 'high',
      justification: 'Bulk flour order for institutional clients',
      status: 'quoted',
      userId: mgrKritika.id,
      organizationId: org.id,
    },
  });

  const pr5 = await prisma.purchaseRequest.create({
    data: {
      itemName: 'Flour Sifting Machine Filter Screens',
      category: 'Equipment',
      quantity: 20,
      budget: 45000,
      urgency: 'medium',
      justification: 'Routine replacement of worn filter screens in flour mill',
      status: 'pending',
      userId: mgrKritika.id,
      organizationId: org.id,
    },
  });

  const pr6 = await prisma.purchaseRequest.create({
    data: {
      itemName: 'Industrial Weighing Scale (500kg capacity)',
      category: 'Equipment',
      quantity: 2,
      budget: 32000,
      urgency: 'low',
      justification: 'New scales needed for flour packing section',
      status: 'pending',
      userId: mgrKritika.id,
      organizationId: org.id,
    },
  });

  // Bishal (Oil Mill) creates requests
  const pr7 = await prisma.purchaseRequest.create({
    data: {
      itemName: 'Refined Cooking Oil (15L cans)',
      category: 'Oil',
      quantity: 200,
      budget: 240000,
      urgency: 'high',
      justification: 'Monthly production run for cooking oil brand',
      status: 'pending',
      userId: mgrBishal.id,
      organizationId: org.id,
    },
  });

  const pr8 = await prisma.purchaseRequest.create({
    data: {
      itemName: 'Mustard Seeds for Oil Extraction',
      category: 'Oil',
      quantity: 1000,
      budget: 500000,
      urgency: 'critical',
      justification: 'Peak season procurement — mustard seed prices expected to rise',
      status: 'pending',
      userId: mgrBishal.id,
      organizationId: org.id,
    },
  });

  const pr9 = await prisma.purchaseRequest.create({
    data: {
      itemName: 'Oil Filtration System Upgrade',
      category: 'Equipment',
      quantity: 1,
      budget: 180000,
      urgency: 'medium',
      justification: 'Upgrade to automated filtration for higher oil purity',
      status: 'pending',
      userId: mgrBishal.id,
      organizationId: org.id,
    },
  });

  console.log(`  ✓ 9 purchase requests created`);

  // ─── Create Quotes for Quoted PRs ───

  // Quotes for PR1 (Basmati Rice)
  await Promise.all([
    prisma.quote.create({
      data: {
        prId: pr1.id, vendorId: vendors[0].id,
        price: 712500, deliveryDays: 5,
        notes: 'Includes free delivery to mill premises',
        organizationId: org.id,
      },
    }),
    prisma.quote.create({
      data: {
        prId: pr1.id, vendorId: vendors[1].id,
        price: 738000, deliveryDays: 3,
        notes: 'Premium long-grain basmati, export quality',
        organizationId: org.id,
      },
    }),
    prisma.quote.create({
      data: {
        prId: pr1.id, vendorId: vendors[8].id,
        price: 725000, deliveryDays: 7,
        notes: 'Includes transit insurance',
        organizationId: org.id,
      },
    }),
  ]);
  console.log(`  ✓ 3 quotes created for Basmati Rice PR`);

  // Quotes for PR4 (Wheat Flour)
  await Promise.all([
    prisma.quote.create({
      data: {
        prId: pr4.id, vendorId: vendors[2].id,
        price: 348000, deliveryDays: 4,
        notes: 'Organic certified wheat flour',
        organizationId: org.id,
      },
    }),
    prisma.quote.create({
      data: {
        prId: pr4.id, vendorId: vendors[3].id,
        price: 355000, deliveryDays: 6,
        notes: 'High gluten content, suitable for bread',
        organizationId: org.id,
      },
    }),
  ]);
  console.log(`  ✓ 2 quotes created for Wheat Flour PR`);

  // ─── Activity Logs ───
  await Promise.all([
    prisma.activityLog.create({
      data: {
        userId: mgrRikesh.id, organizationId: org.id,
        action: 'created', entity: 'PurchaseRequest',
        entityId: pr1.id,
        details: 'Created PR: Premium Basmati Rice (50kg bags)',
      },
    }),
    prisma.activityLog.create({
      data: {
        userId: mgrRikesh.id, organizationId: org.id,
        action: 'created', entity: 'PurchaseRequest',
        entityId: pr2.id,
        details: 'Created PR: Rice Milling Roller Replacement',
      },
    }),
    prisma.activityLog.create({
      data: {
        userId: mgrKritika.id, organizationId: org.id,
        action: 'created', entity: 'PurchaseRequest',
        entityId: pr4.id,
        details: 'Created PR: Whole Wheat Flour (25kg bags)',
      },
    }),
    prisma.activityLog.create({
      data: {
        userId: mgrBishal.id, organizationId: org.id,
        action: 'created', entity: 'PurchaseRequest',
        entityId: pr8.id,
        details: 'Created PR: Mustard Seeds for Oil Extraction',
      },
    }),
    prisma.activityLog.create({
      data: {
        userId: officerRavi.id, organizationId: org.id,
        action: 'added_quote', entity: 'PurchaseRequest',
        entityId: pr1.id,
        details: 'Added quote from Bihar Grain Suppliers: ₹7,12,500',
      },
    }),
    prisma.activityLog.create({
      data: {
        userId: officerRithiga.id, organizationId: org.id,
        action: 'added_quote', entity: 'PurchaseRequest',
        entityId: pr4.id,
        details: 'Added quote from Wheat Fields Cooperative: ₹3,48,000',
      },
    }),
  ]);
  console.log(`  ✓ 6 activity logs created`);
  console.log('');

  // ─── Summary ───
  console.log('✅ Seeding complete!');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Shiv Nath Rice, flour and Oil Mill');
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
  console.log(`  🏪 Vendors: ${vendors.length}`);
  console.log(`  📦 Purchase Requests: 9`);
  console.log(`  💰 Quotes: 5`);
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
