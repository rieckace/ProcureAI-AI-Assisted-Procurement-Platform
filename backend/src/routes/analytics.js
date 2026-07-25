const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../lib/logger');

// GET /api/analytics/dashboard - Get dashboard analytics
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const whereClause = req.user.role === 'manager'
      ? { userId: req.user.id, organizationId: req.user.organizationId }
      : { organizationId: req.user.organizationId };

    const [
      totalPRs,
      statusCounts,
      categoryCounts,
      urgencyCounts,
      recentPRs,
      totalBudget,
      totalVendors,
      monthlyData,
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

      prisma.purchaseRequest.findMany({
        where: whereClause,
        include: {
          user: { select: { name: true } },
          quotes: { include: { vendor: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      prisma.purchaseRequest.aggregate({
        where: whereClause,
        _sum: { budget: true },
      }),

      prisma.vendor.count({ where: { organizationId: req.user.organizationId } }),

      prisma.purchaseRequest.findMany({
        where: whereClause,
        select: { createdAt: true, budget: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const statusMap = {};
    statusCounts.forEach(s => { statusMap[s.status] = s._count.id; });

    const categoryData = categoryCounts.map(c => ({
      name: c.category,
      count: c._count.id,
      budget: c._sum.budget || 0,
    })).sort((a, b) => b.budget - a.budget);

    const urgencyMap = {};
    urgencyCounts.forEach(u => { urgencyMap[u.urgency] = u._count.id; });

    // Build monthly trend (last 6 months)
    const now = new Date();
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      const monthPRs = monthlyData.filter(m => {
        const created = new Date(m.createdAt);
        return created >= d && created <= monthEnd;
      });

      monthlyTrend.push({
        month: label,
        requests: monthPRs.length,
        budget: monthPRs.reduce((sum, m) => sum + (m.budget || 0), 0),
      });
    }

    res.json({
      overview: {
        totalPRs,
        totalBudget: totalBudget._sum.budget || 0,
        totalVendors,
        pending: statusMap.pending || 0,
        quoted: statusMap.quoted || 0,
        ordered: statusMap.ordered || 0,
        delivered: statusMap.delivered || 0,
      },
      statusBreakdown: statusCounts.map(s => ({
        status: s.status,
        count: s._count.id,
      })),
      categoryData,
      urgencyBreakdown: Object.entries(urgencyMap).map(([urgency, count]) => ({
        urgency,
        count,
      })),
      monthlyTrend,
      recentPRs,
    });
  } catch (err) {
    logger.error('analytics.dashboard', err);
    res.status(500).json({ error: 'Failed to load analytics data' });
  }
});

module.exports = router;
