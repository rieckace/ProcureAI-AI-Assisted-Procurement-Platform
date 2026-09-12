const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../lib/logger');

// ─── Helpers ───

function buildWhereClause(req) {
  return req.user.role === 'manager'
    ? { userId: req.user.id, organizationId: req.user.organizationId }
    : { organizationId: req.user.organizationId };
}

function buildMonthlyTrend(records, monthsBack = 5) {
  const now = new Date();
  const trend = [];
  for (let i = monthsBack; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const monthRecords = records.filter(m => {
      const created = new Date(m.createdAt);
      return created >= d && created < new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    });
    trend.push({
      month: label,
      count: monthRecords.length,
      value: monthRecords.reduce((sum, m) => sum + (m.value || 0), 0),
    });
  }
  return trend;
}

// ─── GET /api/analytics/dashboard — Existing combined overview ───

router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const whereClause = buildWhereClause(req);

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
        take: 500,
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
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      const monthPRs = monthlyData.filter(m => {
        const created = new Date(m.createdAt);
        return created >= d && created < new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
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

// ─── GET /api/analytics/requests — Deeper PR-specific analytics ───

router.get('/requests', authenticate, async (req, res) => {
  try {
    const whereClause = buildWhereClause(req);

    const [
      prsByDepartment,
      topRequesters,
      budgetUtilization,
      monthlyData,
      totalPRs,
    ] = await Promise.all([
      // PRs grouped by user department
      prisma.purchaseRequest.groupBy({
        by: ['userId'],
        where: whereClause,
        _count: { id: true },
        _sum: { budget: true },
        orderBy: { _count: { id: 'desc' } },
      }),

      // Top requesters
      prisma.purchaseRequest.groupBy({
        by: ['userId'],
        where: whereClause,
        _count: { id: true },
        _sum: { budget: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),

      // Budget utilization — PRs that have quotes
      prisma.purchaseRequest.findMany({
        where: {
          ...whereClause,
          quotes: { some: {} },
        },
        select: {
          budget: true,
          quotes: {
            select: { price: true },
          },
        },
        take: 200,
      }),

      // Monthly trend data
      prisma.purchaseRequest.findMany({
        where: whereClause,
        select: { createdAt: true, budget: true },
        orderBy: { createdAt: 'asc' },
        take: 500,
      }),

      // Total PR count again (for status distribution)
      prisma.purchaseRequest.groupBy({
        by: ['status'],
        where: whereClause,
        _count: { id: true },
      }),
    ]);

    // Resolve user names for departments/top requesters
    const userIds = [...new Set([...prsByDepartment.map(d => d.userId), ...topRequesters.map(r => r.userId)])];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, department: true },
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    // Department breakdown
    const deptMap = {};
    for (const row of prsByDepartment) {
      const dept = userMap[row.userId]?.department || 'Unassigned';
      if (!deptMap[dept]) deptMap[dept] = { department: dept, requests: 0, budget: 0 };
      deptMap[dept].requests += row._count.id;
      deptMap[dept].budget += row._sum.budget || 0;
    }
    const prsByDepartmentData = Object.values(deptMap).sort((a, b) => b.requests - a.requests);

    // Top requesters
    const topRequestersData = topRequesters.map(r => ({
      name: userMap[r.userId]?.name || 'Unknown',
      department: userMap[r.userId]?.department || 'Unassigned',
      requests: r._count.id,
      budget: r._sum.budget || 0,
    }));

    // Budget utilization
    let avgUtilization = null;
    let utilizationCount = 0;
    let totalUtilPct = 0;
    if (budgetUtilization.length > 0) {
      for (const pr of budgetUtilization) {
        if (pr.quotes.length > 0 && pr.budget > 0) {
          const avgQuotePrice = pr.quotes.reduce((s, q) => s + q.price, 0) / pr.quotes.length;
          totalUtilPct += avgQuotePrice / pr.budget;
          utilizationCount++;
        }
      }
      if (utilizationCount > 0) {
        avgUtilization = Math.round((totalUtilPct / utilizationCount) * 100);
      }
    }

    // Status distribution
    const statusDistribution = totalPRs.map(s => ({
      status: s.status,
      count: s._count.id,
    }));

    // Monthly trend
    const monthlyTrend = buildMonthlyTrend(
      monthlyData.map(m => ({ createdAt: m.createdAt, value: m.budget }))
    );

    res.json({
      prsByDepartment: prsByDepartmentData,
      topRequesters: topRequestersData,
      budgetUtilization: {
        average: avgUtilization,
        quotedCount: utilizationCount,
        totalQuotedPRs: budgetUtilization.length,
      },
      statusDistribution,
      monthlyTrend,
    });
  } catch (err) {
    logger.error('analytics.requests', err);
    res.status(500).json({ error: 'Failed to load request analytics' });
  }
});

// ─── GET /api/analytics/vendors — Vendor-specific analytics ───

router.get('/vendors', authenticate, async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    const [
      vendors,
      vendorQuoteCounts,
      quotedVendors,
    ] = await Promise.all([
      // All vendors in org (limit to 200 for performance)
      prisma.vendor.findMany({
        where: { organizationId: orgId },
        orderBy: { rating: 'desc' },
        take: 200,
      }),

      // Quote counts per vendor
      prisma.quote.groupBy({
        by: ['vendorId'],
        where: {
          vendor: { organizationId: orgId },
        },
        _count: { id: true },
        _avg: { price: true },
      }),

      // Vendors that have at least one quote, with avg price
      prisma.vendor.findMany({
        where: {
          organizationId: orgId,
          quotes: { some: {} },
        },
        include: {
          quotes: {
            select: { price: true, deliveryDays: true, createdAt: true },
          },
        },
      }),
    ]);

    const quoteMap = Object.fromEntries(
      vendorQuoteCounts.map(q => [q.vendorId, { count: q._count.id, avgPrice: q._avg.price }])
    );

    // Category breakdown
    const categoryMap = {};
    for (const v of vendors) {
      if (!categoryMap[v.category]) {
        categoryMap[v.category] = {
          category: v.category,
          count: 0,
          totalRating: 0,
          totalOtd: 0,
          totalDefect: 0,
          totalQuotes: 0,
        };
      }
      categoryMap[v.category].count++;
      categoryMap[v.category].totalRating += v.rating;
      categoryMap[v.category].totalOtd += v.onTimeDelivery;
      categoryMap[v.category].totalDefect += v.defectRate;
      categoryMap[v.category].totalQuotes += quoteMap[v.id]?.count || 0;
    }

    const vendorCountByCategory = Object.values(categoryMap).map(c => ({
      category: c.category,
      count: c.count,
      avgRating: Math.round((c.totalRating / c.count) * 10) / 10,
      avgOnTimeDelivery: Math.round((c.totalOtd / c.count) * 10) / 10,
      avgDefectRate: Math.round((c.totalDefect / c.count) * 10) / 10,
      totalQuotes: c.totalQuotes,
    })).sort((a, b) => b.count - a.count);

    // Top vendors
    const topVendors = vendors.slice(0, 5).map(v => ({
      id: v.id,
      name: v.name,
      category: v.category,
      rating: v.rating,
      onTimeDelivery: v.onTimeDelivery,
      defectRate: v.defectRate,
      quotesCount: quoteMap[v.id]?.count || 0,
      avgQuotePrice: quoteMap[v.id]?.avgPrice || null,
    }));

    // Performance summary
    const perfSummary = {
      avgRating: vendors.length > 0
        ? Math.round((vendors.reduce((s, v) => s + v.rating, 0) / vendors.length) * 10) / 10
        : 0,
      avgOnTimeDelivery: vendors.length > 0
        ? Math.round((vendors.reduce((s, v) => s + v.onTimeDelivery, 0) / vendors.length) * 10) / 10
        : 0,
      avgDefectRate: vendors.length > 0
        ? Math.round((vendors.reduce((s, v) => s + v.defectRate, 0) / vendors.length) * 10) / 10
        : 0,
      totalVendors: vendors.length,
      activeVendors: vendorQuoteCounts.length,
    };

    // Vendor quote activity (which vendors actually have quotes)
    const vendorQuoteActivity = quotedVendors.map(v => ({
      id: v.id,
      name: v.name,
      category: v.category,
      rating: v.rating,
      quotesCount: v.quotes.length,
      avgPrice: v.quotes.length > 0
        ? Math.round(v.quotes.reduce((s, q) => s + q.price, 0) / v.quotes.length)
        : 0,
      avgDeliveryDays: v.quotes.length > 0
        ? Math.round(v.quotes.reduce((s, q) => s + q.deliveryDays, 0) / v.quotes.length)
        : 0,
      lastQuoteDate: v.quotes.length > 0
        ? v.quotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0].createdAt
        : null,
    })).sort((a, b) => b.quotesCount - a.quotesCount);

    res.json({
      vendorCountByCategory,
      topVendors,
      performanceSummary: perfSummary,
      vendorQuoteActivity,
    });
  } catch (err) {
    logger.error('analytics.vendors', err);
    res.status(500).json({ error: 'Failed to load vendor analytics' });
  }
});

module.exports = router;
