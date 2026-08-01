import { useState, useEffect, useRef } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';

/**
 * ProgressRing — animated circular progress ring.
 * Counts up to `value` when it scrolls into view.
 *
 * Usage:
 *   <ProgressRing value={72} size={100} thickness={6} color="success.main" />
 */
export default function ProgressRing({
  value = 0,
  size = 100,
  thickness = 6,
  color = 'primary.main',
  showLabel = true,
  label,
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const animatedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animatedRef.current) {
          animatedRef.current = true;
          const start = performance.now();
          const duration = 1000;
          const tick = (t) => {
            const p = Math.min((t - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setDisplay(Math.round(eased * value));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          obs.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);

  return (
    <Box
      ref={ref}
      sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 1.5 }}
    >
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress
          variant="determinate"
          value={display}
          size={size}
          thickness={thickness}
          sx={{
            color,
            '& .MuiCircularProgress-circle': { strokeLinecap: 'round' },
            transition: 'color 0.3s ease',
          }}
        />
        {showLabel && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="body2" fontWeight={800} sx={{ color, fontSize: size > 80 ? '0.95rem' : '0.75rem' }}>
              {display}%
            </Typography>
          </Box>
        )}
      </Box>
      {label && (
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {label}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
