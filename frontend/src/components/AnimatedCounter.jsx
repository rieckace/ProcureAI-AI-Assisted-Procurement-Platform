import { useState, useEffect, useRef } from 'react';
import { Typography } from '@mui/material';

/**
 * AnimatedCounter — counts up from 0 to `value` with a smooth easing animation.
 * Triggers when the element scrolls into view.
 *
 * Usage:
 *   <AnimatedCounter value={15000} format="currency" />
 *   <AnimatedCounter value={42} />
 *   <AnimatedCounter value={95} suffix="%" />
 */
export default function AnimatedCounter({
  value,
  format,
  suffix = '',
  duration = 1200,
  variant = 'h4',
  sx = {},
  color = 'text.primary',
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef(null);
  const observerRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observerRef.current.observe(ref.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [hasAnimated]);

  useEffect(() => {
    if (!hasAnimated) {
      setDisplayValue(0);
      return;
    }

    const startTime = performance.now();
    const startValue = 0;
    const endValue = value || 0;

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);
      const current = Math.round(startValue + (endValue - startValue) * easedProgress);

      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    }

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [hasAnimated, value, duration]);

  const formattedValue = format === 'currency'
    ? `₹${displayValue.toLocaleString('en-IN')}`
    : displayValue.toLocaleString('en-IN');

  return (
    <Typography
      ref={ref}
      variant={variant}
      sx={{
        fontWeight: 800,
        color,
        letterSpacing: '-0.02em',
        transition: 'color 0.3s ease',
        ...sx,
      }}
    >
      {formattedValue}{suffix}
    </Typography>
  );
}
