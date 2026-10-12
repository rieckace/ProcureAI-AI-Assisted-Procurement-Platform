import { Box, Card, CardContent, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AnimatedCounter from './AnimatedCounter';
import Sparkline from './Sparkline';
import ProgressRing from './ProgressRing';

/**
 * DashboardHero — premium stat cards with gradient icon tiles,
 * animated counters, mini sparklines, and optional progress rings.
 *
 * Usage:
 *   <DashboardHero stats={[
 *     { label: 'Total Requests', value: 42, icon: <Inbox />, hex: '#6366f1',
 *       sparkline: [2,4,3,6,5,8,7] },
 *     { label: 'Completed', value: 60, icon: <CheckCircle />, hex: '#10b981',
 *       ring: true, suffix: '%' },
 *   ]} onStatClick={(stat) => setStatusFilter(stat.filterKey)} />
 *
 * Cards become clickable when a stat has a `to` route or `onStatClick` is passed.
 */
export default function DashboardHero({ stats = [], onStatClick }) {
  const navigate = useNavigate();

  const handleActivate = (s) => {
    if (s.to) {
      navigate(s.to);
    } else if (onStatClick) {
      onStatClick(s);
    }
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      {stats.map((s) => {
        const clickable = Boolean(s.to || onStatClick);
        return (
        <Card
          key={s.label}
          onClick={clickable ? () => handleActivate(s) : undefined}
          onKeyDown={clickable ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleActivate(s);
            }
          } : undefined}
          tabIndex={clickable ? 0 : undefined}
          role={clickable ? 'button' : undefined}
          aria-label={clickable ? `${s.label} — open` : undefined}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            animation: 'fadeInUp 0.4s ease both',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            cursor: clickable ? 'pointer' : 'default',
            '&:hover': {
              transform: 'translateY(-3px)',
              boxShadow: '0 12px 28px rgba(15,23,42,0.12)',
              ...(clickable ? { outline: '2px solid', outlineColor: 'primary.main' } : {}),
            },
            '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
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
        );
      })}
    </Box>
  );
}
