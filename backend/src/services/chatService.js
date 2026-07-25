const Groq = require('groq-sdk');
const prisma = require('../lib/prisma');
const { v4: uuidv4 } = require('uuid');
const { logActivity } = require('../routes/activityLogs');
const { sendInvitationEmail, sendQuoteRequestEmail } = require('./emailService');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'gsk_placeholder'
});

/**
 * SYSTEM PROMPT — Tells Procura everything about the application
 */
const SYSTEM_PROMPT = `You are Procura, the friendly and knowledgeable AI assistant for ProcureAI — an AI-powered procurement management system.

## YOUR PERSONALITY
- Warm, helpful, and professional. You love helping people get things done.
- Use a conversational tone with occasional emojis to keep things friendly.
- Be concise but thorough. When explaining complex topics, break them down simply.
- You work at a procurement software company and are passionate about making procurement easy.

## THE APPLICATION

ProcureAI helps organizations manage their entire procurement lifecycle:
1. **Managers** create Purchase Requests (PRs) for items they need
2. **Procurement Officers** collect quotes from vendors
3. **AI scores vendors** and recommends the best option
4. **Purchase Orders (POs)** are issued to the chosen vendor
5. Items are tracked through delivery

### USER ROLES
- **Admin**: Full access — can manage everything, invite users, view all data
- **Officer**: Handles vendor management, collecting quotes, issuing POs, and moving requests through the pipeline
- **Manager**: Creates purchase requests, tracks their progress, edits/cancels pending requests

### PR STATUSES (the lifecycle)
1. **pending** — Created by manager, waiting for quotes
2. **quoted** — At least one quote received from a vendor
3. **ordered** — Purchase Order issued to a vendor
4. **delivered** — Items received (final status)

### URGENCY LEVELS
- **low** → **medium** → **high** → **critical**

### KEY PAGES
- **Manager Dashboard** (/manager-dashboard) — Managers see their own PRs
- **Officer Dashboard** (/officer-dashboard) — Officers see all organization PRs
- **New Request** (/new-request) — Create a new purchase request
- **PR Detail** (/pr/:id) — View full PR details, quotes, AI recommendations
- **Vendor Management** (/manage-vendors) — CRUD vendors
- **Vendor Comparison** (/pr/:id/compare) — Side-by-side vendor comparison
- **Analytics** (/analytics) — Charts and insights
- **Activity Log** (/activity-log) — Audit trail
- **Admin Panel** (/admin) — User management

### VENDOR SCORING (AI-powered)
When comparing vendors, ProcureAI scores them on:
- **Price (35%)** — Lower is better
- **Delivery Time (20%)** — Faster is better
- **Reliability (30%)** — Based on on-time delivery rate and defect rate
- **Rating (15%)** — Historical vendor rating

### FEATURES
- Kanban board view for PRs
- Drag-and-drop PR status updates
- File attachments on PRs
- Email notifications via MailDev
- Dark/Light theme toggle
- Multi-organization support with user invites

## YOUR CAPABILITIES

You can:
1. **Answer questions** about how the system works, what each feature does, and guide users through workflows
2. **Look up data** using the tools available to you (PRs, vendors, quotes, analytics, activity logs)
3. **Perform actions** on behalf of the user — but you MUST ALWAYS ask for explicit confirmation first!

## ACTION CONFIRMATION WORKFLOW
When a user asks you to perform an action (like creating a PR or updating status), follow this TWO-STEP process:

**Step 1 — Describe & Confirm**
- Describe exactly what you're going to do, including all key details (item name, quantity, budget, status change, etc.)
- Ask: "Shall I proceed?" or "Would you like me to go ahead?"
- DO NOT call the action tool yet

**Step 2 — Execute**
- ONLY after the user says yes, confirms, or gives explicit approval, call the appropriate action tool
- If the user says no or changes details, update your description and ask for confirmation again

## RESPONSE GUIDELINES
- When showing data, format it nicely with bullet points or short summaries
- When the user asks "what should I do next?" or similar, consider their role and the current page context
- Suggest specific actions the user can take
- If you're unsure about something, be honest about it
- Keep responses under 200 words unless displaying data`

/**
 * Tool definitions for Groq function calling
 */
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_purchase_requests',
      description: 'Get purchase requests for the current organization. Can filter by status, urgency, or user.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['pending', 'quoted', 'ordered', 'delivered'],
            description: 'Filter by status'
          },
          urgency: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'Filter by urgency level'
          },
          myRequests: {
            type: 'boolean',
            description: 'If true, only return requests created by the current user'
          },
          search: {
            type: 'string',
            description: 'Search by item name or category'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return (default 10, max 20)'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_purchase_request',
      description: 'Get detailed information about a specific purchase request by its ID.',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The purchase request ID'
          }
        },
        required: ['id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_vendors',
      description: 'Get vendors for the current organization. Can filter by category.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Filter by vendor category (IT, Office Supplies, Furniture, Software, Services, Equipment)'
          },
          search: {
            type: 'string',
            description: 'Search by vendor name'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results (default 10, max 20)'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_analytics',
      description: 'Get dashboard analytics and statistics for the current user/organization.',
      parameters: {
        type: 'object',
        properties: {
          scope: {
            type: 'string',
            enum: ['overview', 'detailed'],
            description: 'How much detail to return'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_activity_logs',
      description: 'Get recent activity logs for the organization.',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Number of recent activities to return (default 5, max 15)'
          },
          entity: {
            type: 'string',
            description: 'Filter by entity type (e.g., PurchaseRequest, User, Vendor)'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_pending_requests_summary',
      description: 'Get a summary of pending requests — useful for officers to know what needs attention.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'navigate_to',
      description: 'Suggest navigating to a specific page in the application.',
      parameters: {
        type: 'object',
        properties: {
          page: {
            type: 'string',
            enum: [
              'manager-dashboard',
              'officer-dashboard',
              'new-request',
              'manage-vendors',
              'add-vendor',
              'analytics',
              'activity-log',
              'admin'
            ],
            description: 'The page to navigate to'
          },
          params: {
            type: 'object',
            description: 'Optional URL parameters (e.g., { id: "pr-id" } for PR detail)',
            properties: {
              id: { type: 'string' }
            }
          }
        },
        required: ['page']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_purchase_request',
      description: 'Create a new purchase request. ONLY call this AFTER the user has explicitly confirmed they want to proceed.',
      parameters: {
        type: 'object',
        properties: {
          itemName: {
            type: 'string',
            description: 'Name of the item to purchase (required)'
          },
          category: {
            type: 'string',
            enum: ['IT', 'Office Supplies', 'Furniture', 'Software', 'Services', 'Equipment'],
            description: 'Category of the item (required)'
          },
          quantity: {
            type: 'number',
            description: 'Number of units to purchase (required, minimum 1)'
          },
          budget: {
            type: 'number',
            description: 'Total budget in dollars (required, minimum $1)'
          },
          urgency: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'Urgency level (required)'
          },
          justification: {
            type: 'string',
            description: 'Reason for the purchase (optional)'
          }
        },
        required: ['itemName', 'category', 'quantity', 'budget', 'urgency']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_pr_status',
      description: 'Update the status of a purchase request. ONLY call this AFTER the user has explicitly confirmed.',
      parameters: {
        type: 'object',
        properties: {
          prId: {
            type: 'string',
            description: 'The ID of the purchase request to update'
          },
          status: {
            type: 'string',
            enum: ['pending', 'quoted', 'ordered', 'delivered'],
            description: 'The new status'
          }
        },
        required: ['prId', 'status']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'invite_user',
      description: 'Invite a new user to the organization. ONLY call this AFTER the user has explicitly confirmed. Only admins can invite.',
      parameters: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            description: 'Email address of the person to invite (required)'
          },
          role: {
            type: 'string',
            enum: ['manager', 'officer', 'admin'],
            description: 'Role to assign (required)'
          }
        },
        required: ['email', 'role']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_quote',
      description: 'Add a vendor quote to a purchase request. ONLY call this AFTER the user has explicitly confirmed. Only officers and admins can add quotes.',
      parameters: {
        type: 'object',
        properties: {
          prId: {
            type: 'string',
            description: 'The ID of the purchase request (required)'
          },
          vendorId: {
            type: 'string',
            description: 'The ID of the vendor (required)'
          },
          price: {
            type: 'number',
            description: 'Quote price in dollars (required, must be greater than 0)'
          },
          deliveryDays: {
            type: 'number',
            description: 'Estimated delivery days (required, minimum 1)'
          }
        },
        required: ['prId', 'vendorId', 'price', 'deliveryDays']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_org_report',
      description: 'Get a comprehensive procurement report for the organization — total PRs, budget spent, vendor stats, and recent activity. No user confirmation needed.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  }
];

/**
 * Execute a tool/function call against the database
 */
async function executeToolCall(toolCall, userId, organizationId, userRole) {
  const { name, arguments: args } = toolCall.function;
  const parsed = JSON.parse(args);

  switch (name) {
    case 'get_purchase_requests': {
      const where = { organizationId };
      
      if (parsed.myRequests || userRole === 'manager') {
        where.userId = userId;
      }
      if (parsed.status) where.status = parsed.status;
      if (parsed.urgency) where.urgency = parsed.urgency;
      if (parsed.search) {
        where.OR = [
          { itemName: { contains: parsed.search, mode: 'insensitive' } },
          { category: { contains: parsed.search, mode: 'insensitive' } },
        ];
      }

      const limit = Math.min(parsed.limit || 10, 20);
      const prs = await prisma.purchaseRequest.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return JSON.stringify({
        count: prs.length,
        requests: prs.map(pr => ({
          id: pr.id,
          item: pr.itemName,
          category: pr.category,
          quantity: pr.quantity,
          budget: pr.budget,
          status: pr.status,
          urgency: pr.urgency,
          createdBy: pr.user.name,
          createdAt: pr.createdAt.toISOString().split('T')[0]
        }))
      });
    }

    case 'get_purchase_request': {
      const pr = await prisma.purchaseRequest.findUnique({
        where: { id: parsed.id },
        include: {
          user: { select: { name: true, email: true } },
          quotes: {
            include: { vendor: true },
            orderBy: { price: 'asc' }
          }
        }
      });

      if (!pr) return JSON.stringify({ error: 'Purchase request not found' });

      return JSON.stringify({
        id: pr.id,
        item: pr.itemName,
        category: pr.category,
        quantity: pr.quantity,
        budget: pr.budget,
        urgency: pr.urgency,
        status: pr.status,
        justification: pr.justification,
        createdBy: pr.user.name,
        createdAt: pr.createdAt.toISOString().split('T')[0],
        quotes: pr.quotes.map(q => ({
          vendor: q.vendor.name,
          price: q.price,
          deliveryDays: q.deliveryDays,
          vendorRating: q.vendor.rating
        }))
      });
    }

    case 'get_vendors': {
      const where = { organizationId };
      if (parsed.category) where.category = parsed.category;
      if (parsed.search) {
        where.OR = [
          { name: { contains: parsed.search, mode: 'insensitive' } },
          { category: { contains: parsed.search, mode: 'insensitive' } },
        ];
      }

      const limit = Math.min(parsed.limit || 10, 20);
      const vendors = await prisma.vendor.findMany({
        where,
        orderBy: { name: 'asc' },
        take: limit,
      });

      return JSON.stringify({
        count: vendors.length,
        vendors: vendors.map(v => ({
          id: v.id,
          name: v.name,
          category: v.category,
          email: v.email,
          phone: v.phone,
          rating: v.rating,
          onTimeDelivery: v.onTimeDelivery,
          defectRate: v.defectRate
        }))
      });
    }

    case 'get_analytics': {
      const whereClause = userRole === 'manager'
        ? { userId, organizationId }
        : { organizationId };

      const [
        totalPRs,
        statusCounts,
        categoryCounts,
        urgencyCounts,
        totalBudget,
        totalVendors,
      ] = await Promise.all([
        prisma.purchaseRequest.count({ where: whereClause }),
        prisma.purchaseRequest.groupBy({
          by: ['status'],
          where: whereClause,
          _count: { id: true },
        }),
        prisma.purchaseRequest.groupBy({
          by: ['category'],
          where: whereClause,
          _count: { id: true },
          _sum: { budget: true },
        }),
        prisma.purchaseRequest.groupBy({
          by: ['urgency'],
          where: whereClause,
          _count: { id: true },
        }),
        prisma.purchaseRequest.aggregate({
          where: whereClause,
          _sum: { budget: true },
        }),
        prisma.vendor.count({ where: { organizationId } }),
      ]);

      const statusMap = {};
      statusCounts.forEach(s => { statusMap[s.status] = s._count.id; });

      const urgencyMap = {};
      urgencyCounts.forEach(u => { urgencyMap[u.urgency] = u._count.id; });

      return JSON.stringify({
        totalPRs,
        totalBudget: totalBudget._sum.budget || 0,
        totalVendors,
        statusBreakdown: statusMap,
        urgencyBreakdown: urgencyMap,
        topCategories: categoryCounts
          .sort((a, b) => (b._sum.budget || 0) - (a._sum.budget || 0))
          .slice(0, 5)
          .map(c => ({
            category: c.category,
            count: c._count.id,
            budget: c._sum.budget || 0,
          })),
      });
    }

    case 'get_activity_logs': {
      const limit = Math.min(parsed.limit || 5, 15);
      const where = { organizationId };
      if (parsed.entity) where.entity = parsed.entity;

      const logs = await prisma.activityLog.findMany({
        where,
        include: {
          user: { select: { name: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return JSON.stringify({
        count: logs.length,
        activities: logs.map(log => ({
          action: log.action,
          entity: log.entity,
          details: log.details,
          user: log.user.name,
          role: log.user.role,
          timestamp: log.createdAt.toISOString()
        }))
      });
    }

    case 'get_pending_requests_summary': {
      const [pending, quoted, total] = await Promise.all([
        prisma.purchaseRequest.count({ where: { organizationId, status: 'pending' } }),
        prisma.purchaseRequest.count({ where: { organizationId, status: 'quoted' } }),
        prisma.purchaseRequest.count({ where: { organizationId } }),
      ]);

      const urgentPending = await prisma.purchaseRequest.findMany({
        where: { organizationId, status: 'pending', urgency: { in: ['high', 'critical'] } },
        select: { id: true, itemName: true, urgency: true, user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      const byOfficer = userRole === 'manager'
        ? { userId, organizationId }
        : { organizationId };

      const withoutQuotes = await prisma.purchaseRequest.count({
        where: {
          ...byOfficer,
          status: 'pending',
          quotes: { none: {} }
        }
      });

      return JSON.stringify({
        totalRequests: total,
        pending,
        quoted,
        ordered: await prisma.purchaseRequest.count({ where: { organizationId, status: 'ordered' } }),
        delivered: await prisma.purchaseRequest.count({ where: { organizationId, status: 'delivered' } }),
        withoutQuotes,
        urgentPending: urgentPending.map(pr => ({
          id: pr.id,
          item: pr.itemName,
          urgency: pr.urgency,
          requester: pr.user.name
        }))
      });
    }

    case 'navigate_to': {
      let path = `/${parsed.page}`;
      if (parsed.params?.id) {
        path = `/pr/${parsed.params.id}`;
      }
      return JSON.stringify({ action: 'navigate', path, label: parsed.page });
    }

    case 'create_purchase_request': {
      // Only managers and admins can create PRs
      if (!['manager', 'admin'].includes(userRole)) {
        return JSON.stringify({ error: 'Only managers and admins can create purchase requests.' });
      }

      if (!parsed.itemName || !parsed.category || !parsed.quantity || !parsed.budget || !parsed.urgency) {
        return JSON.stringify({ error: 'Missing required fields: itemName, category, quantity, budget, urgency' });
      }

      const validCategories = ['IT', 'Office Supplies', 'Furniture', 'Software', 'Services', 'Equipment'];
      if (!validCategories.includes(parsed.category)) {
        return JSON.stringify({ error: `Category must be one of: ${validCategories.join(', ')}` });
      }

      const validUrgencies = ['low', 'medium', 'high', 'critical'];
      if (!validUrgencies.includes(parsed.urgency)) {
        return JSON.stringify({ error: `Urgency must be one of: ${validUrgencies.join(', ')}` });
      }

      const quantity = parseInt(parsed.quantity);
      if (quantity < 1) {
        return JSON.stringify({ error: 'Quantity must be at least 1' });
      }

      const budget = parseFloat(parsed.budget);
      if (budget <= 0) {
        return JSON.stringify({ error: 'Budget must be greater than 0' });
      }

      const pr = await prisma.purchaseRequest.create({
        data: {
          itemName: parsed.itemName,
          category: parsed.category,
          quantity,
          budget,
          urgency: parsed.urgency,
          justification: parsed.justification || '',
          userId,
          organizationId,
          status: 'pending'
        }
      });

      logActivity(userId, 'created', 'PurchaseRequest', pr.id, `Created PR via Procura: ${pr.itemName}`, organizationId);

      return JSON.stringify({
        success: true,
        action: 'created',
        message: `Purchase request created successfully!`,
        request: {
          id: pr.id,
          item: pr.itemName,
          category: pr.category,
          quantity: pr.quantity,
          budget: pr.budget,
          urgency: pr.urgency,
          status: pr.status,
          createdAt: pr.createdAt.toISOString().split('T')[0]
        }
      });
    }

    case 'update_pr_status': {
      // Only officers and admins can update status
      if (!['officer', 'admin'].includes(userRole)) {
        return JSON.stringify({ error: 'Only officers and admins can update request statuses.' });
      }

      if (!parsed.prId || !parsed.status) {
        return JSON.stringify({ error: 'Missing required fields: prId, status' });
      }

      const validStatuses = ['pending', 'quoted', 'ordered', 'delivered'];
      if (!validStatuses.includes(parsed.status)) {
        return JSON.stringify({ error: `Status must be one of: ${validStatuses.join(', ')}` });
      }

      const existingPr = await prisma.purchaseRequest.findUnique({
        where: { id: parsed.prId }
      });

      if (!existingPr) {
        return JSON.stringify({ error: 'Purchase request not found' });
      }

      const updated = await prisma.purchaseRequest.update({
        where: { id: parsed.prId },
        data: { status: parsed.status }
      });

      logActivity(userId, 'status_changed', 'PurchaseRequest', parsed.prId, `Status changed to ${parsed.status} via Procura`, organizationId);

      return JSON.stringify({
        success: true,
        action: 'status_updated',
        message: `Status updated successfully!`,
        request: {
          id: updated.id,
          item: updated.itemName,
          status: updated.status,
          previousStatus: existingPr.status
        }
      });
    }

    case 'invite_user': {
      // Only admins can invite
      if (userRole !== 'admin') {
        return JSON.stringify({ error: 'Only admins can invite users.' });
      }

      if (!parsed.email || !parsed.role) {
        return JSON.stringify({ error: 'Email and role are required.' });
      }

      if (!/\S+@\S+\.\S+/.test(parsed.email)) {
        return JSON.stringify({ error: 'Invalid email format.' });
      }

      const validRoles = ['manager', 'officer', 'admin'];
      if (!validRoles.includes(parsed.role)) {
        return JSON.stringify({ error: `Role must be one of: ${validRoles.join(', ')}` });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({ where: { email: parsed.email } });
      if (existingUser) {
        return JSON.stringify({ error: 'A user with this email already exists in the system.' });
      }

      // Create invite token
      const token = uuidv4();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await prisma.inviteToken.create({
        data: {
          token,
          email: parsed.email,
          role: parsed.role,
          expiresAt,
          organizationId
        }
      });

      // Try to send invitation email (non-blocking if email service isn't configured)
      let emailPreviewUrl = null;
      try {
        const orgName = await prisma.organization.findUnique({
          where: { id: organizationId },
          select: { name: true }
        });
        const result = await sendInvitationEmail(parsed.email, token, orgName?.name || 'Your Organization');
        emailPreviewUrl = result.previewUrl || null;
      } catch (emailErr) {
        console.error('Failed to send invitation email:', emailErr.message);
      }

      logActivity(userId, 'invited_user', 'User', null, `Invited ${parsed.email} as ${parsed.role} via Procura`, organizationId);

      return JSON.stringify({
        success: true,
        action: 'invited',
        message: `Invitation sent to ${parsed.email} as ${parsed.role}!`,
        emailPreviewUrl
      });
    }

    case 'add_quote': {
      // Only officers and admins can add quotes
      if (!['officer', 'admin'].includes(userRole)) {
        return JSON.stringify({ error: 'Only officers and admins can add quotes.' });
      }

      if (!parsed.prId || !parsed.vendorId || !parsed.price || !parsed.deliveryDays) {
        return JSON.stringify({ error: 'Missing required fields: prId, vendorId, price, deliveryDays' });
      }

      const price = parseFloat(parsed.price);
      if (price <= 0) {
        return JSON.stringify({ error: 'Price must be greater than 0.' });
      }

      const deliveryDays = parseInt(parsed.deliveryDays);
      if (deliveryDays < 1) {
        return JSON.stringify({ error: 'Delivery days must be at least 1.' });
      }

      // Validate PR exists and belongs to org
      const pr = await prisma.purchaseRequest.findUnique({
        where: { id: parsed.prId }
      });

      if (!pr || pr.organizationId !== organizationId) {
        return JSON.stringify({ error: 'Purchase request not found.' });
      }

      // Validate vendor exists
      const vendor = await prisma.vendor.findUnique({
        where: { id: parsed.vendorId }
      });

      if (!vendor) {
        return JSON.stringify({ error: 'Vendor not found.' });
      }

      // Check for duplicate quote
      const existingQuote = await prisma.quote.findFirst({
        where: { prId: parsed.prId, vendorId: parsed.vendorId }
      });

      if (existingQuote) {
        return JSON.stringify({ error: `${vendor.name} already has a quote for this request.` });
      }

      // Create the quote
      const quote = await prisma.quote.create({
        data: {
          prId: parsed.prId,
          vendorId: parsed.vendorId,
          price,
          deliveryDays,
          organizationId
        },
        include: { vendor: true }
      });

      // Update PR status to quoted if it was pending
      if (pr.status === 'pending') {
        await prisma.purchaseRequest.update({
          where: { id: parsed.prId },
          data: { status: 'quoted' }
        });
      }

      logActivity(userId, 'added_quote', 'PurchaseRequest', parsed.prId, `Added quote from ${vendor.name}: $${price} via Procura`, organizationId);

      // Try to send quote request email to vendor
      let emailPreviewUrl = null;
      try {
        const result = await sendQuoteRequestEmail(vendor.email, vendor.name, {
          itemName: pr.itemName,
          category: pr.category,
          quantity: pr.quantity,
          budget: pr.budget,
          urgency: pr.urgency,
          justification: pr.justification
        });
        emailPreviewUrl = result.previewUrl || null;
      } catch {}

      return JSON.stringify({
        success: true,
        action: 'quote_added',
        message: `Quote added from ${vendor.name} for $${price}!`,
        quote: {
          vendor: vendor.name,
          price,
          deliveryDays,
          emailSent: !!emailPreviewUrl
        }
      });
    }

    case 'get_org_report': {
      const [
        totalPRs,
        statusCounts,
        totalBudget,
        totalVendors,
        totalUsers,
        recentLogs,
        quoteCount
      ] = await Promise.all([
        prisma.purchaseRequest.count({ where: { organizationId } }),
        prisma.purchaseRequest.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: { id: true },
        }),
        prisma.purchaseRequest.aggregate({
          where: { organizationId },
          _sum: { budget: true },
        }),
        prisma.vendor.count({ where: { organizationId } }),
        prisma.user.count({ where: { organizationId } }),
        prisma.activityLog.findMany({
          where: { organizationId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { user: { select: { name: true } } }
        }),
        prisma.quote.count({ where: { organizationId } }),
      ]);

      const statusMap = {};
      statusCounts.forEach(s => { statusMap[s.status] = s._count.id; });

      return JSON.stringify({
        organizationId,
        report: {
          totalPurchaseRequests: totalPRs,
          totalBudget: totalBudget._sum.budget || 0,
          totalVendors,
          totalUsers,
          totalQuotes: quoteCount,
          statusBreakdown: statusMap
        },
        recentActivity: recentLogs.map(log => ({
          action: log.action,
          details: log.details,
          user: log.user.name,
          time: log.createdAt.toISOString()
        }))
      });
    }

    default:
      return JSON.stringify({ error: `Unknown function: ${name}` });
  }
}

/**
 * Process a chat message and return a response
 */
async function processMessage(message, context) {
  const { userId, organizationId, userRole, userName, currentPage } = context;

  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'gsk_placeholder') {
    return {
      message: "👋 Hi! I'm Procura, your AI procurement assistant. I'm currently running in **offline mode** because the Groq API key isn't configured yet.\n\nI can still help with general guidance about the system! Ask me things like:\n- *\"How do I create a purchase request?\"*\n- *\"What does each status mean?\"*\n- *\"Walk me through the procurement process\"*\n\nTo enable my full capabilities (live data lookup and actions), an admin needs to set the `GROQ_API_KEY` in the backend `.env` file. 🚀",
      fallback: true,
      suggestions: [
        { text: 'How do I create a request?', action: 'help' },
        { text: 'Explain the statuses', action: 'help' },
        { text: 'Walk me through procurement', action: 'help' },
      ]
    };
  }

  try {
    // Build messages array for Groq
    const messages = [
      {
        role: 'system',
        content: `${SYSTEM_PROMPT}\n\n## CURRENT USER\n- Name: ${userName}\n- Role: ${userRole}\n- Current Page: ${currentPage || 'unknown'}\n\nImportant: Always scope data queries to the user's organization. For managers, only show their own requests unless they ask for all.`
      },
      { role: 'user', content: message }
    ];

    // First API call — let Groq decide if it needs to use tools
    const initialResponse = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 800,
    });

    const choice = initialResponse.choices[0];
    const toolCalls = choice.finish_reason === 'tool_calls' ? choice.message.tool_calls : [];

    // If no tool calls, return the direct response
    if (!toolCalls || toolCalls.length === 0) {
      return {
        message: choice.message.content || 'I\'m not sure how to help with that. Could you rephrase your question?',
        fallback: false,
        suggestions: getDefaultSuggestions(userRole),
      };
    }

    // Execute tool calls and collect results
    let toolResults = [];
    for (const toolCall of toolCalls) {
      const result = await executeToolCall(toolCall, userId, organizationId, userRole);
      toolResults.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result,
      });
    }

    // Check if any tool returned a navigate action
    for (const tr of toolResults) {
      try {
        const parsed = JSON.parse(tr.content);
        if (parsed.action === 'navigate') {
          return {
            message: choice.message.content || `Let me take you to the ${parsed.label} page!`,
            fallback: false,
            navigate: { path: parsed.path, label: parsed.label },
            suggestions: getDefaultSuggestions(userRole),
          };
        }
      } catch {}
    }

    // Send tool results back to Groq for natural language formatting
    const finalMessages = [
      ...messages,
      choice.message,
      ...toolResults,
    ];

    const finalResponse = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: finalMessages,
      temperature: 0.7,
      max_tokens: 800,
    });

    const finalContent = finalResponse.choices[0]?.message?.content || 
      'Here\'s the information you requested. Is there anything else I can help with?';

    // Determine suggestions based on the context
    let suggestions = getSuggestionsForContext(userRole, currentPage);
    
    return {
      message: finalContent,
      fallback: false,
      suggestions,
    };

  } catch (err) {
    console.error('Chat service error:', err.message);
    return {
      message: `Sorry, I encountered an error while processing your request. ${err.message.includes('API key') ? 'The AI service needs to be configured.' : 'Please try again in a moment.'} 🙏`,
      fallback: true,
      suggestions: getDefaultSuggestions(userRole),
    };
  }
}

/**
 * Get default suggestions based on user role
 */
function getDefaultSuggestions(role) {
  const common = [
    { text: 'How can you help me?', action: 'help' },
  ];

  if (role === 'manager') {
    return [
      ...common,
      { text: 'Show my pending requests', action: 'query' },
      { text: 'Create a PR for laptops', action: 'action' },
      { text: 'How do I create a PR?', action: 'help' },
    ];
  }

  if (role === 'officer') {
    return [
      ...common,
      { text: 'Show pending requests', action: 'query' },
      { text: 'Which PRs need quotes?', action: 'query' },
      { text: 'Find IT vendors', action: 'query' },
      { text: 'Mark latest PR as delivered', action: 'action' },
    ];
  }

  if (role === 'admin') {
    return [
      ...common,
      { text: 'Show system overview', action: 'query' },
      { text: 'Invite a team member', action: 'action' },
      { text: 'Recent activity', action: 'query' },
      { text: 'Create a PR for office supplies', action: 'action' },
    ];
  }

  return common;
}

/**
 * Get contextual suggestions based on current page
 */
function getSuggestionsForContext(role, page) {
  const base = getDefaultSuggestions(role);
  
  if (page?.includes('manager-dashboard')) {
    return [
      { text: 'Show my pending requests', action: 'query' },
      { text: 'How to create a new request?', action: 'help' },
      { text: 'What is urgent?', action: 'query' },
    ];
  }
  
  if (page?.includes('officer-dashboard')) {
    return [
      { text: 'Which PRs need attention?', action: 'query' },
      { text: 'Show all pending requests', action: 'query' },
      { text: 'How to add a quote?', action: 'help' },
    ];
  }
  
  if (page?.includes('new-request')) {
    return [
      { text: 'What details do I need?', action: 'help' },
      { text: 'Tips for justification', action: 'help' },
    ];
  }
  
  if (page?.includes('analytics')) {
    return [
      { text: 'Explain these charts', action: 'help' },
      { text: 'Show my analytics summary', action: 'query' },
    ];
  }

  return base;
}

module.exports = { processMessage };
