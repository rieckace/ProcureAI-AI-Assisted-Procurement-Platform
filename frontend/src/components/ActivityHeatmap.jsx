import { useMemo } from 'react';
import { Box, Typography, Tooltip, useTheme } from '@mui/material';

/**
 * ActivityHeatmap — GitHub-style contribution grid.
 *
 * Props:
 *   dates: array of Date objects (or ISO strings) representing activity events.
 *   weeks?: number of weeks to show (default 17)
 */
const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(v) {
  if (v instanceof Date) return v;
  return new Date(v);
}

function dateKey(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function ActivityHeatmap({ dates = [], weeks = 17 }) {
  const theme = useTheme();

  const grid = useMemo(() => {
    const counts = new Map();
    dates.forEach((d) => {
      const date = toDate(d);
      const k = dateKey(date);
      counts.set(k, (counts.get(k) || 0) + 1);
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Align to week boundary (Sunday-start) so weekday labels line up
    const todayWeekday = today.getDay();
    const end = new Date(today.getTime() + (6 - todayWeekday) * DAY_MS); // end of this week
    const totalDays = weeks * 7;
    const start = new Date(end.getTime() - (totalDays - 1) * DAY_MS);

    const cells = [];
    for (let i = 0; i < totalDays; i++) {
      const day = new Date(start.getTime() + i * DAY_MS);
      cells.push({
        date: day,
        count: counts.get(dateKey(day)) || 0,
      });
    }
    return cells;
  }, [dates, weeks]);

  // Split into week columns (Sunday-start)
  const columns = [];
  for (let i = 0; i < grid.length; i += 7) {
    columns.push(grid.slice(i, i + 7));
  }

  const monthLabels = useMemo(() => {
    const labels = [];
    columns.forEach((col, ci) => {
      const first = col.find(Boolean);
      if (!first) return;
      const month = first.date.toLocaleDateString('en-US', { month: 'short' });
      const prev = columns[Math.max(0, ci - 1)]?.find(Boolean);
      const prevMonth = prev ? prev.date.getMonth() : null;
      if (prevMonth !== first.date.getMonth()) {
        labels.push({ index: ci, label: month });
      }
    });
    return labels;
  }, [columns]);

  const maxCount = Math.max(1, ...grid.map((c) => c.count));

  const cellColor = (count) => {
    if (count === 0) return theme.palette.action.hover;
    const intensity = Math.max(0.3, count / maxCount);
    const base = theme.palette.primary.main;
    // lighten/darken toward primary using rgba overlay
    return base;
  };

  const opacityFor = (count) => {
    if (count === 0) return 1;
    return 0.25 + 0.75 * (count / maxCount);
  };

  const totalActivity = grid.reduce((s, c) => s + c.count, 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="body2" fontWeight={600}>
          {totalActivity} actions in the last {weeks * 7} days
        </Typography>
      </Box>
      <Box sx={{ overflowX: 'auto', pb: 0.5 }}>
        <Box sx={{ minWidth: columns.length * 14 }}>
          {/* Month labels */}
          <Box sx={{ display: 'flex', ml: 0.5, mb: 0.5, height: 16 }}>
            {columns.map((col, ci) => {
              const label = monthLabels.find((m) => m.index === ci);
              return (
                <Typography
                  key={ci}
                  variant="caption"
                  sx={{ width: 14, fontSize: '0.55rem', color: 'text.disabled', whiteSpace: 'nowrap' }}
                >
                  {label ? label.label : ''}
                </Typography>
              );
            })}
          </Box>
          <Box sx={{ display: 'flex', gap: 3 }}>
            {/* Weekday labels */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d, i) => (
                <Typography
                  key={i}
                  variant="caption"
                  sx={{ height: 11, fontSize: '0.55rem', color: 'text.disabled', lineHeight: '11px' }}
                >
                  {d}
                </Typography>
              ))}
            </Box>
            {/* Grid */}
            <Box sx={{ display: 'flex', gap: 3 }}>
              {columns.map((col, ci) => (
                <Box key={ci} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {col.map((cell, ri) => (
                    <Tooltip
                      key={ri}
                      title={
                        cell.count > 0
                          ? `${cell.count} action(s) on ${cell.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                          : `No activity on ${cell.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                      }
                      arrow
                    >
                      <Box
                        sx={{
                          width: 11,
                          height: 11,
                          borderRadius: 0.6,
                          backgroundColor: cellColor(cell.count),
                          opacity: opacityFor(cell.count),
                          transition: 'transform 0.15s ease',
                          '&:hover': { transform: 'scale(1.35)' },
                          cursor: 'default',
                        }}
                      />
                    </Tooltip>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end', mt: 1 }}>
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>
          Less
        </Typography>
        {[0, 0.3, 0.55, 0.8, 1].map((o, i) => (
          <Box
            key={i}
            sx={{
              width: 9,
              height: 9,
              borderRadius: 0.5,
              backgroundColor: theme.palette.primary.main,
              opacity: o,
            }}
          />
        ))}
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>
          More
        </Typography>
      </Box>
    </Box>
  );
}
