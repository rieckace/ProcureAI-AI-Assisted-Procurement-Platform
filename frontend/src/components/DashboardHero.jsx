import { Box, Card, CardContent, Typography } from '@mui/material';
import AnimatedCounter from './AnimatedCounter';
import Sparkline from './Sparkline';
import ProgressRing from './ProgressRing';

/**
 * DashboardHero — premium stat cards with gradient icon tiles,
 * animated counters, mini sparklines, and optional progress rings.
 *
 * Usage:
 *   <DashboardHero stats={[
 *     { label: 'Total Requests', value: 42, icon: <Inbox />, hex: '#1a73e8',
 *       sparkline: [2,4,3,6,5,8,7] },
 *     { label: 'Completed', value: 60, icon: <CheckCircle />, hex: '#34a853',
 *       ring: true, suffix: '%' },
 *   ]} />
 */
export default function DashboardHero({ stats = [] }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      {stats.map((s) => (
        <Card
          key={s.label}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            animation: 'fadeInUp 0.4s ease both',
            ...(s.pulse
              ? {
                  animation: 'pulse 2s ease-in-out infinite',
                  border: '2px solid',
                  borderColor: s.hex,
                }
              : {}),
          }}
        >
          {/* decorative corner blob */}
          <Box
            sx={{
              position: 'absolute',
              top: -40,
              right: -40,
              width: 110,
              height: 110,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${s.hex}22, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: `linear-gradient(135deg, ${s.hex}33, ${s.hex}14)`,
                  color: s.hex,
                }}
              >
                {s.icon}
              </Box>
              <Typography
                variant="body2"
                color="text.secondary"
                fontWeight={500}
                sx={{ fontSize: '0.78rem', lineHeight: 1.3 }}
              >
                {s.label}
              </Typography>
            </Box>

            {s.ring ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
                <ProgressRing value={s.value} size={62} thickness={6} color={s.hex} showLabel />
                {s.subLabel && (
                  <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 90 }}>
                    {s.subLabel}
                  </Typography>
                )}
              </Box>
            ) : (
              <AnimatedCounter
                value={s.value}
                variant="h4"
                color={s.color || 'text.primary'}
                suffix={s.suffix || ''}
                sx={{ mb: s.sparkline ? 0.5 : 0 }}
              />
            )}

            {s.sparkline && (
              <Box sx={{ mt: 0.5, height: 38 }}>
                <Sparkline data={s.sparkline} color={s.hex} height={38} />
              </Box>
            )}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
