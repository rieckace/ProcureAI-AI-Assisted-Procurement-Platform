import { useId } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

/**
 * Sparkline — a tiny no-axis trend chart.
 *
 * Usage:
 *   <Sparkline data={[3, 5, 2, 8, 7, 9, 6]} color="#1a73e8" height={42} />
 */
export default function Sparkline({ data = [], color = '#1a73e8', height = 42 }) {
  const gid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const points = data.map((v, i) => ({ i, v }));
  if (points.length === 0) points.push({ i: 0, v: 0 });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.45} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          fill={`url(#spark-${gid})`}
          dot={false}
          isAnimationActive
          animationDuration={900}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
