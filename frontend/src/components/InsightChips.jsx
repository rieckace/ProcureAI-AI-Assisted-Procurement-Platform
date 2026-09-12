import { useMemo } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { Lightbulb } from '@mui/icons-material';

/**
 * InsightChips — writes one-sentence insights about analytics data.
 * Pass the dashboard analytics payload; it derives a few human-readable
 * observations. Falls back gracefully when data is missing.
 */
export default function InsightChips({ data }) {
  const insights = useMemo(() => {
    const out = [];
    if (!data) return out;

    const overview = data.overview || {};

    // Category insight: top category by budget
    if (Array.isArray(data.categoryData) && data.categoryData.length > 0) {
      const top = data.categoryData[0];
      if (top && top.budget > 0) {
        out.push(`“${top.name}” is your largest budget category at ₹${top.budget.toLocaleString('en-IN')}.`);
      } else if (top && top.count > 0) {
        out.push(`“${top.name}” is your most-requested category (${top.count} requests).`);
      }
    }

    // Pending bottleneck
    if (overview.pending > 0) {
      out.push(`${overview.pending} request(s) are waiting on action — consider reviewing them today.`);
    } else if (overview.totalPRs > 0) {
      out.push('No pending requests — everything is moving along. 👍');
    }

    // Budget utilization vs. delivered
    if (overview.totalPRs > 0 && overview.totalBudget > 0) {
      const delivered = overview.delivered || 0;
      const pct = Math.round((delivered / overview.totalPRs) * 100);
      if (pct >= 60) {
        out.push(`You've completed ${pct}% of requests — great momentum!`);
      } else if (pct > 0) {
        out.push(`${pct}% of requests are delivered so far.`);
      }
    }

    // Monthly trend: compare last two months
    const trend = data.monthlyTrend;
    if (Array.isArray(trend) && trend.length >= 2) {
      const last = trend[trend.length - 1];
      const prev = trend[trend.length - 2];
      if (last && prev && prev.requests > 0) {
        const delta = Math.round(((last.requests - prev.requests) / prev.requests) * 100);
        if (delta > 0) {
          out.push(`Request volume is up ${delta}% vs. last month (${prev.month} → ${last.month}).`);
        } else if (delta < 0) {
          out.push(`Request volume is down ${Math.abs(delta)}% vs. last month (${prev.month} → ${last.month}).`);
        } else {
          out.push('Request volume is steady month-over-month.');
        }
      }
    }

    return out.slice(0, 4);
  }, [data]);

  if (insights.length === 0) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Lightbulb sx={{ fontSize: 18, color: 'warning.main' }} />
        <Typography variant="subtitle2" fontWeight={600}>
          Insights
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {insights.map((text, i) => (
          <Chip
            key={i}
            label={text}
            size="small"
            sx={{
              justifyContent: 'flex-start',
              height: 'auto',
              py: 0.75,
              px: 1,
              borderRadius: 2,
              fontSize: '0.78rem',
              fontWeight: 500,
              bgcolor: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(165,180,252,0.08)'
                  : 'rgba(99,102,241,0.06)',
              color: 'text.primary',
              border: '1px solid',
              borderColor: 'divider',
              '& .MuiChip-label': { whiteSpace: 'normal', lineHeight: 1.4 },
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
