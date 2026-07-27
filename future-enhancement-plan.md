# Future Enhancement Plan — Autonomous Procurement Agent

## Vision

Transform the existing reactive AI chatbot ("Procura") into a **fully autonomous procurement pipeline** that takes a simple natural language request like:

> "Need 15 Dell laptops for AI Team"

and automatically handles the entire procurement lifecycle — from understanding the request to tracking delivery — with human approval at the spending step.

---

## Current State (What We Already Have)

| Component | Status |
|---|---|
| AI Chatbot Agent ("Procura") with 12 tools | Built |
| Vendor scoring + AI recommendations | Built |
| Purchase Request creation via AI | Built |
| Vendor search + quote management | Built |
| Email notifications | Built |
| Multi-model LLM provider (Groq) | Built |
| PostgreSQL + Prisma ORM | Built |
| React frontend with MUI | Built |
| Kanban board for PR workflow | Built |
| Role-based access control | Built |
| Activity logging | Built |

---

## What's Missing for "Autonomous"

1. **No Inventory Model** — No `Inventory` table in the Prisma schema. The agent can't "check inventory" because none exists.
2. **No Autonomous Execution Pipeline** — Current chatbot is turn-based (user asks → AI responds → user confirms). Needs to chain multiple steps without waiting for human input at each step.
3. **No Background Job/Scheduler** — Delivery tracking reminders and proactive notifications need a scheduler (e.g., cron jobs or a job queue).
4. **No Purchase Order (PO) Model** — Have Purchase Requests and Quotes, but no formal Purchase Order entity that gets generated after vendor selection.
5. **No Delivery Tracking** — No model or logic for tracking shipment status.

---

## Architecture Overview

```
Employee: "Need 15 Dell laptops for AI Team"
        │
        ▼
┌─────────────────────────────┐
│   NATURAL LANGUAGE INPUT     │  ← ChatWidget or API endpoint
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│   ORCHESTRATOR AGENT         │  ← New: chains sub-agents together
│   (understands intent,       │     Uses existing modelProvider.js
│    decomposes into steps)    │
└──────────────┬──────────────┘
               ▼
    ┌──────────┼──────────────────────────────┐
    ▼          ▼          ▼         ▼         ▼
  Check      Search     Compare   Calculate  Predict
  Inventory  Vendors    Prices    Budget     Best Vendor
    │          │          │         │         │
    └──────────┼──────────┴─────────┴─────────┘
               ▼
┌─────────────────────────────┐
│   PAUSE FOR HUMAN APPROVAL   │  ← Human-in-the-loop
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│   GENERATE PURCHASE ORDER    │  ← New Prisma model
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│   SEND APPROVAL REQUEST      │  ← Extend existing emailService
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│   SCHEDULE TRACKING          │  ← New: node-cron or BullMQ
│   (reminders, follow-ups)    │
└─────────────────────────────┘
```

---

## Autonomous Agent Pipeline Flow

### Phase A — Request Processing (Automatic)

1. **Parse Intent** — LLM extracts: item name, quantity, team/department, urgency
2. **Check Inventory** — Query Inventory table for current stock
   - If sufficient stock → fulfill from stock, done
   - If insufficient → continue to vendor search
3. **Search Vendors** — Find approved vendors that supply this item
4. **Compare Prices** — Get existing quotes or request new ones
5. **Calculate Budget** — Total cost, cost per unit, budget impact
6. **Predict Best Vendor** — Use existing AI scoring (price 35%, reliability 30%, delivery 20%, rating 15%)
7. **Present Recommendation** — Show summary to human for approval

### Phase B — After Human Approval (Automatic)

8. **Generate Purchase Order** — Auto-create PO with unique number (e.g., PO-2026-001)
9. **Reserve Inventory** — Mark expected quantity as incoming
10. **Notify Procurement Officer** — Email + in-app notification
11. **Schedule Delivery Tracking** — Create Delivery record
12. **Schedule Reminders** — Daily check-ins, overdue alerts

---

## New Database Models

### Inventory

```prisma
model Inventory {
  id             String   @id @default(uuid())
  itemName       String
  category       String
  quantity       Int      @default(0)
  minStockLevel  Int      @default(5)
  unitPrice      Float?
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([itemName, organizationId])
}
```

### PurchaseOrder

```prisma
model PurchaseOrder {
  id                String   @id @default(uuid())
  poNumber          String   @unique
  purchaseRequestId String
  purchaseRequest   PurchaseRequest @relation(fields: [purchaseRequestId], references: [id])
  vendorId          String
  vendor            Vendor   @relation(fields: [vendorId], references: [id])
  totalAmount       Float
  status            String   @default("PENDING_APPROVAL")
  approvedBy        String?
  approvedAt        DateTime?
  sentAt            DateTime?
  expectedDelivery  DateTime?
  organizationId    String
  organization      Organization @relation(fields: [organizationId], references: [id])
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

**Status flow:**
`PENDING_APPROVAL` → `APPROVED` → `SENT_TO_VENDOR` → `CONFIRMED` → `IN_TRANSIT` → `DELIVERED`

### Delivery

```prisma
model Delivery {
  id               String   @id @default(uuid())
  purchaseOrderId  String
  purchaseOrder    PurchaseOrder @relation(fields: [purchaseOrderId], references: [id])
  status           String   @default("PREPARING")
  trackingNumber   String?
  estimatedArrival DateTime?
  actualArrival    DateTime?
  notes            String?
  reminders        Json?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

**Status flow:**
`PREPARING` → `SHIPPED` → `IN_TRANSIT` → `OUT_FOR_DELIVERY` → `DELIVERED`

---

## New Backend Services

### autonomousAgent.js — Orchestrator

- `processRequest(userMessage, userId, orgId)` — Main pipeline
- `parseIntent(message)` — LLM extracts structured intent
- `checkInventory(item, orgId)` — Query stock
- `searchVendors(item, orgId)` — Find suppliers
- `comparePrices(vendors, intent)` — Price comparison
- `calculateBudget(quotes, quantity)` — Budget calculation
- `predictBestVendor(quotes, intent)` — AI vendor scoring
- `onApproval(approvalData, userId)` — Post-approval actions
- `generatePO(approvalData)` — Create PurchaseOrder
- `reserveInventory(po)` — Hold stock for incoming order
- `scheduleDeliveryTracking(po)` — Create Delivery record
- `scheduleReminders(po)` — Set up follow-up reminders

### inventoryService.js — Stock Management

- `getInventory(orgId)` — List all items
- `addItem(orgId, data)` — Add inventory item
- `updateStock(itemId, quantity, type)` — Add/deduct stock
- `checkStock(itemName, orgId)` — Check availability
- `getLowStockAlerts(orgId)` — Items below minStockLevel
- `reserveStock(itemId, quantity)` — Hold for incoming order

### deliveryService.js — Tracking

- `createDelivery(poId)` — Initialize delivery record
- `updateStatus(deliveryId, status, trackingNumber)` — Update progress
- `getDeliveries(orgId, filters)` — List with filters
- `getOverdueDeliveries(orgId)` — Past expected date
- `sendReminder(deliveryId)` — Manual reminder

### schedulerService.js — Background Jobs

Using `node-cron`:

| Schedule | Job |
|---|---|
| Daily 9:00 AM | Check all in-transit deliveries, send status updates |
| Daily 9:00 AM | Alert on low inventory items |
| Daily 9:00 AM | Notify about pending approvals older than 24 hours |
| Every 4 hours | Check for overdue deliveries, send reminders |
| On PO approved | Schedule expected delivery check |

### poGeneratorService.js — PO Creation

- `generatePONumber(orgId)` — Auto-increment: PO-2026-001, PO-2026-002...
- `createPO(prId, vendorId, quotes, orgId)` — Build PO from PR data
- `sendPOToVendor(po, vendor)` — Email PO to vendor

---

## New API Endpoints

### Agent Pipeline

```
POST   /api/agent/process              ← Trigger autonomous pipeline
POST   /api/agent/approve/:pipelineId  ← Human approves recommendation
POST   /api/agent/reject/:pipelineId   ← Human rejects, provides reason
GET    /api/agent/status/:pipelineId   ← Check pipeline progress
GET    /api/agent/history              ← Past agent actions
```

### Inventory Management

```
GET    /api/inventory                  ← List inventory items
POST   /api/inventory                  ← Add new item
PUT    /api/inventory/:id              ← Update stock level
DELETE /api/inventory/:id              ← Remove item
GET    /api/inventory/alerts           ← Low stock items
POST   /api/inventory/reserve          ← Reserve stock for order
POST   /api/inventory/fulfill          ← Deduct on delivery
```

### Purchase Orders

```
POST   /api/purchase-orders            ← Create PO (from agent)
GET    /api/purchase-orders            ← List POs
GET    /api/purchase-orders/:id        ← PO details
PUT    /api/purchase-orders/:id        ← Update PO status
POST   /api/purchase-orders/:id/send   ← Send PO to vendor
```

### Delivery Tracking

```
GET    /api/deliveries                 ← List deliveries
GET    /api/deliveries/:id             ← Delivery details + timeline
PUT    /api/deliveries/:id             ← Update delivery status
POST   /api/deliveries/:id/remind      ← Send manual reminder
GET    /api/deliveries/overdue         ← Overdue deliveries
```

---

## New Chatbot Tools (Extend chatService.js)

| Tool Name | Description |
|---|---|
| `check_inventory` | Check stock levels for an item |
| `create_purchase_order` | Generate PO from approved PR |
| `get_delivery_status` | Track delivery progress |
| `get_inventory_alerts` | Low stock notifications |
| `reserve_inventory` | Hold stock for upcoming order |
| `get_purchase_orders` | List recent POs |
| `update_delivery_status` | Update delivery with tracking info |

---

## Frontend Additions

### New Pages

| Page | Purpose |
|---|---|
| `InventoryPage.jsx` | View stock levels, set min thresholds, add/edit items |
| `DeliveryTracking.jsx` | Timeline view of delivery status per PO |
| `AgentDashboard.jsx` | See agent activity log, pending approvals, pipeline status |
| `PurchaseOrders.jsx` | List and manage all POs |

### New Components

| Component | Purpose |
|---|---|
| `AgentStatusBadge` | Real-time agent status in the chat widget |
| `InventoryAlert.jsx` | Low-stock warning banner |
| `DeliveryTimeline.jsx` | Visual delivery progress tracker |
| `ApprovalCard.jsx` | Agent's recommendation card with approve/reject buttons |
| `POGenerator.jsx` | Auto-filled PO preview before approval |

### Modified Pages

| Page | Changes |
|---|---|
| `PRDetail.jsx` | Show linked PO + delivery status |
| `OfficerDashboard.jsx` | Add inventory alerts section, pending POs |
| `ManagerDashboard.jsx` | Add delivery overview, agent activity |
| `ChatWidget.jsx` | Add pipeline progress visualization |

---

## Real-Time Updates

Use **Server-Sent Events (SSE)** for live status:

```
GET /api/agent/stream/:pipelineId  ← SSE endpoint for pipeline progress
```

Events:
- `pipeline:step` — Each step completion
- `pipeline:approval_needed` — Waiting for human
- `pipeline:complete` — PO generated
- `delivery:status_update` — Delivery status changed
- `inventory:low_stock` — Alert triggered

---

## Technology Stack (Additions)

| Technology | Purpose | Why |
|---|---|---|
| `node-cron` | Background job scheduling | Lightweight, no extra infrastructure needed |
| Server-Sent Events | Real-time frontend updates | Already have Express, no WebSocket complexity |
| Extend OpenAI SDK (Groq) | Multi-step reasoning | Already integrated via modelProvider.js |
| Extend Prisma schema | New data models | Already using Prisma |
| Extend Nodemailer | New email templates | Already using for notifications |

---

## Phased Implementation Plan

### Phase 1 — Database + Inventory (3-4 days)

- [ ] Extend Prisma schema with Inventory, PurchaseOrder, Delivery models
- [ ] Create database migration
- [ ] Build InventoryService (CRUD + stock checks)
- [ ] Build Inventory API routes
- [ ] Create Inventory management page (frontend)
- [ ] Add seed data for inventory items

### Phase 2 — Autonomous Pipeline (4-5 days)

- [ ] Build AutonomousAgent orchestrator service
- [ ] Implement intent parsing (LLM extraction)
- [ ] Chain existing tools: vendor search → quote comparison → scoring
- [ ] Add approval workflow (present recommendation → wait for human)
- [ ] Create agent pipeline API routes
- [ ] Build AgentDashboard page
- [ ] Add new tools to chatService.js
- [ ] Build ApprovalCard component

### Phase 3 — PO Generation + Delivery (3-4 days)

- [ ] Build POGeneratorService
- [ ] Auto-generate PO numbers
- [ ] Create PO API routes
- [ ] Build DeliveryService
- [ ] Create delivery tracking API routes
- [ ] Build DeliveryTimeline component
- [ ] Extend email templates for PO and delivery notifications

### Phase 4 — Scheduling + Real-Time (2-3 days)

- [ ] Integrate node-cron for background jobs
- [ ] Implement daily checks: low stock, overdue deliveries, pending approvals
- [ ] Add SSE endpoint for real-time pipeline updates
- [ ] Update ChatWidget with pipeline progress visualization
- [ ] Add InventoryAlert banner to dashboards

### Phase 5 — Frontend Polish + Testing (2-3 days)

- [ ] Build InventoryPage
- [ ] Build PurchaseOrders page
- [ ] Build DeliveryTracking page
- [ ] Update PRDetail with PO + delivery links
- [ ] Update dashboards with new sections
- [ ] Write Playwright E2E tests for new flows
- [ ] Write Vitest unit tests for new services
- [ ] Edge case handling (partial deliveries, vendor delays, stock conflicts)

---

## Estimated Total Effort

| Phase | Description | Time |
|---|---|---|
| Phase 1 | Database + Inventory | 3-4 days |
| Phase 2 | Autonomous Pipeline | 4-5 days |
| Phase 3 | PO + Delivery | 3-4 days |
| Phase 4 | Scheduling + Real-Time | 2-3 days |
| Phase 5 | Frontend + Testing | 2-3 days |
| **Total** | | **~2-3 weeks** |

---

## Example End-to-End Flow

```
1. Employee types: "Need 15 Dell laptops for AI Team"

2. Agent responds:
   "I've analyzed your request:
    - Item: Dell Latitude 5540 (15 laptops)
    - Team: AI Team
    - Checking inventory... ✅ Only 3 in stock (need 15)
    - Searching approved vendors... Found 3 vendors
    - Comparing prices...
    - Recommended: TechCorp Inc. — $12,750 ($850/unit)
    - Delivery: 5-7 business days
    - Budget impact: $12,750

    Do you approve this purchase?"

3. Manager clicks ✅ Approve

4. Agent automatically:
    - Generates PO-2026-001
    - Emails PO to TechCorp Inc.
    - Reserves 15 slots in inventory (incoming)
    - Sends confirmation to employee
    - Schedules delivery tracking for Day 5
    - Sets reminder for Day 7 if not delivered

5. Day 3: Vendor ships → Agent updates status to IN_TRANSIT
6. Day 5: Delivery arrives → Agent updates status, deducts inventory
7. Day 5: Agent sends email to employee: "Your 15 Dell laptops have arrived!"
```

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| LLM hallucination (wrong vendor/price) | Always cross-reference with actual DB data, show confidence scores |
| Budget overspend | Hard limit check before PO generation, require manager approval for amounts > threshold |
| Duplicate purchases | Check recent PRs for same item within 30 days before processing |
| Vendor doesn't respond | Auto-follow-up after 48 hours, escalate to procurement officer |
| Delivery delays | Proactive monitoring, automatic notifications to stakeholders |
| Inventory sync issues | Use database transactions for stock deduction, optimistic locking |

---

## Future Enhancements (Beyond v1)

- **RAG over past orders** — Use historical data for smarter vendor predictions
- **Proactive alerts** — "Laptop prices dropped 12% — want to reorder?"
- **Multi-vendor splitting** — Auto-split large orders across vendors for better pricing
- **Contract management** — Track vendor contracts, pricing agreements, SLAs
- **Budget forecasting** — Predict monthly/quarterly spend based on patterns
- **Mobile notifications** — Push notifications via Firebase
- **Integration with ERP** — Sync with SAP, Oracle, etc.
- **Voice input** — "Hey Procura, we need 20 monitors for the design team"
