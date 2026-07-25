const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding ProcureAI database...');

  // Clean existing data
  await prisma.quote.deleteMany();
  await prisma.purchaseRequest.deleteMany();
  await prisma.inviteToken.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  // ─── Organization 1: Acme Corporation ───
  const acme = await prisma.organization.create({
    data: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      email: 'admin@acme.com'
    }
  });
  console.log(`  ✓ Org created: Acme Corporation (${acme.slug})`);

  const acmeAdmin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@demo.com',
      password: hashedPassword,
      role: 'admin',
      organizationId: acme.id
    }
  });
  console.log(`  ✓ Acme Admin: admin@demo.com`);

  const acmeOfficer = await prisma.user.create({
    data: {
      name: 'Sarah Officer',
      email: 'officer@demo.com',
      password: hashedPassword,
      role: 'officer',
      organizationId: acme.id
    }
  });
  console.log(`  ✓ Acme Officer: officer@demo.com`);

  const acmeManager = await prisma.user.create({
    data: {
      name: 'Mike Manager',
      email: 'manager@demo.com',
      password: hashedPassword,
      role: 'manager',
      department: 'Engineering',
      organizationId: acme.id
    }
  });
  console.log(`  ✓ Acme Manager: manager@demo.com`);

  // ─── Organization 2: GlobalTech Industries ───
  const globaltech = await prisma.organization.create({
    data: {
      name: 'GlobalTech Industries',
      slug: 'globaltech',
      email: 'admin@globaltech.com'
    }
  });
  console.log(`  ✓ Org created: GlobalTech Industries (${globaltech.slug})`);

  const gtAdmin = await prisma.user.create({
    data: {
      name: 'Alice Admin',
      email: 'alice@globaltech.com',
      password: await bcrypt.hash('password456', 10),
      role: 'admin',
      organizationId: globaltech.id
    }
  });
  console.log(`  ✓ GlobalTech Admin: alice@globaltech.com`);

  const gtOfficer = await prisma.user.create({
    data: {
      name: 'Bob Buyer',
      email: 'bob@globaltech.com',
      password: await bcrypt.hash('password456', 10),
      role: 'officer',
      organizationId: globaltech.id
    }
  });
  console.log(`  ✓ GlobalTech Officer: bob@globaltech.com`);

  const gtManager = await prisma.user.create({
    data: {
      name: 'Carol Requester',
      email: 'carol@globaltech.com',
      password: await bcrypt.hash('password456', 10),
      role: 'manager',
      department: 'Marketing',
      organizationId: globaltech.id
    }
  });
  console.log(`  ✓ GlobalTech Manager: carol@globaltech.com`);

  // ─── Vendors for Acme ───
  const acmeVendors = await Promise.all([
    prisma.vendor.create({
      data: {
        name: 'TechSupply Pro', email: 'contact@techsupplypro.com',
        category: 'IT', phone: '+1-555-0101',
        onTimeDelivery: 97, defectRate: 0.5, rating: 4.8,
        organizationId: acme.id
      }
    }),
    prisma.vendor.create({
      data: {
        name: 'GlobalOffice Solutions', email: 'sales@globaloffice.com',
        category: 'Office Supplies', phone: '+1-555-0102',
        onTimeDelivery: 94, defectRate: 1.2, rating: 4.3,
        organizationId: acme.id
      }
    }),
    prisma.vendor.create({
      data: {
        name: 'FurnitureCraft Inc.', email: 'orders@furniturecraft.com',
        category: 'Furniture', phone: '+1-555-0103',
        onTimeDelivery: 92, defectRate: 1.8, rating: 4.1,
        organizationId: acme.id
      }
    }),
    prisma.vendor.create({
      data: {
        name: 'DigitalWare Systems', email: 'info@digitalware.com',
        category: 'IT', phone: '+1-555-0104',
        onTimeDelivery: 99, defectRate: 0.3, rating: 4.9,
        organizationId: acme.id
      }
    }),
    prisma.vendor.create({
      data: {
        name: 'Office Essentials Co.', email: 'hello@officeessentials.com',
        category: 'Office Supplies', phone: '+1-555-0105',
        onTimeDelivery: 88, defectRate: 2.5, rating: 3.8,
        organizationId: acme.id
      }
    })
  ]);
  console.log(`  ✓ ${acmeVendors.length} vendors created for Acme`);

  // ─── Vendors for GlobalTech ───
  const gtVendors = await Promise.all([
    prisma.vendor.create({
      data: {
        name: 'CloudBase Technologies', email: 'sales@cloudbase.io',
        category: 'IT', phone: '+1-555-0201',
        onTimeDelivery: 98, defectRate: 0.2, rating: 4.9,
        organizationId: globaltech.id
      }
    }),
    prisma.vendor.create({
      data: {
        name: 'PrintPlus Solutions', email: 'info@printplus.com',
        category: 'Office Supplies', phone: '+1-555-0202',
        onTimeDelivery: 90, defectRate: 1.5, rating: 4.0,
        organizationId: globaltech.id
      }
    }),
    prisma.vendor.create({
      data: {
        name: 'ErgoWorks Ltd.', email: 'hello@ergoworks.com',
        category: 'Furniture', phone: '+1-555-0203',
        onTimeDelivery: 95, defectRate: 0.8, rating: 4.6,
        organizationId: globaltech.id
      }
    })
  ]);
  console.log(`  ✓ ${gtVendors.length} vendors created for GlobalTech`);

  // ─── Purchase Requests for Acme ───
  const acmePR1 = await prisma.purchaseRequest.create({
    data: {
      itemName: 'Dell UltraSharp 27" 4K Monitors', category: 'IT',
      quantity: 15, budget: 22500, urgency: 'high',
      justification: 'Upgrade outdated monitors for the design team.',
      status: 'quoted', userId: acmeManager.id, organizationId: acme.id
    }
  });

  const acmePR2 = await prisma.purchaseRequest.create({
    data: {
      itemName: 'Ergonomic Office Chairs', category: 'Furniture',
      quantity: 25, budget: 37500, urgency: 'medium',
      justification: 'Replace old chairs in the open office area.',
      status: 'pending', userId: acmeManager.id, organizationId: acme.id
    }
  });

  const acmePR3 = await prisma.purchaseRequest.create({
    data: {
      itemName: 'Printer Paper Bulk Pack', category: 'Office Supplies',
      quantity: 100, budget: 500, urgency: 'low',
      justification: 'Quarterly office supply restock.',
      status: 'delivered', userId: acmeManager.id, organizationId: acme.id
    }
  });
  console.log(`  ✓ 3 purchase requests created for Acme`);

  // ─── Purchase Requests for GlobalTech ───
  const gtPR1 = await prisma.purchaseRequest.create({
    data: {
      itemName: 'Cloud Server Infrastructure', category: 'IT',
      quantity: 3, budget: 45000, urgency: 'critical',
      justification: 'Migration to cloud infrastructure needed ASAP.',
      status: 'quoted', userId: gtManager.id, organizationId: globaltech.id
    }
  });

  const gtPR2 = await prisma.purchaseRequest.create({
    data: {
      itemName: 'Standing Desk Converters', category: 'Furniture',
      quantity: 10, budget: 5000, urgency: 'medium',
      justification: 'Health initiative for employee wellness.',
      status: 'pending', userId: gtManager.id, organizationId: globaltech.id
    }
  });
  console.log(`  ✓ 2 purchase requests created for GlobalTech`);

  // ─── Quotes for Acme PR1 ───
  await Promise.all([
    prisma.quote.create({
      data: {
        prId: acmePR1.id, vendorId: acmeVendors[0].id,
        price: 18999, deliveryDays: 7, organizationId: acme.id
      }
    }),
    prisma.quote.create({
      data: {
        prId: acmePR1.id, vendorId: acmeVendors[3].id,
        price: 20999, deliveryDays: 5, organizationId: acme.id
      }
    }),
    prisma.quote.create({
      data: {
        prId: acmePR1.id, vendorId: acmeVendors[1].id,
        price: 17500, deliveryDays: 14, organizationId: acme.id
      }
    })
  ]);
  console.log(`  ✓ 3 quotes created for Acme monitor PR`);

  // ─── Quotes for GlobalTech PR1 ───
  await Promise.all([
    prisma.quote.create({
      data: {
        prId: gtPR1.id, vendorId: gtVendors[0].id,
        price: 42000, deliveryDays: 10, organizationId: globaltech.id
      }
    }),
    prisma.quote.create({
      data: {
        prId: gtPR1.id, vendorId: gtVendors[2].id,
        price: 39500, deliveryDays: 14, organizationId: globaltech.id
      }
    })
  ]);
  console.log(`  ✓ 2 quotes created for GlobalTech cloud PR`);

  // ─── Activity Logs ───
  await Promise.all([
    prisma.activityLog.create({
      data: {
        userId: acmeManager.id, organizationId: acme.id,
        action: 'created', entity: 'PurchaseRequest',
        entityId: acmePR1.id, details: 'Created PR: Dell UltraSharp 27" 4K Monitors'
      }
    }),
    prisma.activityLog.create({
      data: {
        userId: acmeOfficer.id, organizationId: acme.id,
        action: 'added_quote', entity: 'PurchaseRequest',
        entityId: acmePR1.id, details: 'Added quote from TechSupply Pro: $18999'
      }
    }),
    prisma.activityLog.create({
      data: {
        userId: gtManager.id, organizationId: globaltech.id,
        action: 'created', entity: 'PurchaseRequest',
        entityId: gtPR1.id, details: 'Created PR: Cloud Server Infrastructure'
      }
    })
  ]);
  console.log(`  ✓ Activity logs created`);

  console.log('\n✅ Seeding complete!');
  console.log('\n📋 Acme Corporation Credentials:');
  console.log('   Admin:   admin@demo.com / password123');
  console.log('   Officer: officer@demo.com / password123');
  console.log('   Manager: manager@demo.com / password123');
  console.log('\n📋 GlobalTech Industries Credentials:');
  console.log('   Admin:   alice@globaltech.com / password456');
  console.log('   Officer: bob@globaltech.com / password456');
  console.log('   Manager: carol@globaltech.com / password456');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
