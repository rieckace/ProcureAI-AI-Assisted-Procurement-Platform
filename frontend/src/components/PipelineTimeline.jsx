import { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { CheckCircle, Cancel, HourglassEmpty, RadioButtonUnchecked } from '@mui/icons-material';

const STEP_LABELS = {
  intent_parsing: 'Parsing request intent',
  inventory_check: 'Checking inventory',
  vendor_search: 'Searching vendors',
  quote_estimation: 'Estimating quotes',
  scoring: 'Scoring vendors',
  recommendation: 'Building recommendation',
  approval: 'Awaiting approval',
  po_generation: 'Generating PO',
  completed: 'Completed',
};

function stepName(step) {
  const name = typeof step === 'string' ? step : step?.name || '';
  return STEP_LABELS[name] || String(name || '').replace(/_/g, ' ');
}

/**
 * PipelineTimeline — animated agent pipeline steps with blinking lights
 * and a typewriter-style log for the "current" step.
 */
export default function PipelineTimeline({ steps = [], status = 'PROCESSING' }) {
  const [revealed, setRevealed] = useState(0);
  const [typing, setTyping] = useState('');
  const stepsArr = useMemo(() => (Array.isArray(steps) ? steps : []), [steps]);
  const intervalRef = useRef(null);
  const typerRef = useRef(null);

  // Reveal steps one-by-one with a stagger
  useEffect(() => {
    setRevealed(0);
    setTyping('');
    if (stepsArr.length === 0) return;

    let i = 0;
    intervalRef.current = setInterval(() => {
      i += 1;
      setRevealed(i);
      if (i >= stepsArr.length) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        // Type out the final step text
        const last = stepsArr[stepsArr.length - 1];
        const full = `${stepName(last)} — ${last?.status || 'done'}`;
        let k = 0;
        typerRef.current = setInterval(() => {
          k += 1;
          setTyping(full.slice(0, k));
          if (k >= full.length) {
            clearInterval(typerRef.current);
            typerRef.current = null;
          }
        }, 28);
      }
    }, 420);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (typerRef.current) clearInterval(typerRef.current);
      intervalRef.current = null;
      typerRef.current = null;
    };
  }, [stepsArr]);

  const isPending = status === 'PROCESSING';

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {stepsArr.slice(0, revealed).map((step, i) => {
          const s = typeof step === 'string' ? { name: step, status: 'completed' } : step;
          const done = s.status === 'completed' || s.status === 'approved';
          const failed = s.status === 'failed' || s.status === 'rejected' || s.status === 'skipped';
          const isLast = i === stepsArr.length - 1;
          const active = isLast && isPending && !done && !failed;

          return (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.6, animation: 'slideInLeft 0.3s ease both' }}>
              <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                {done && <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />}
                {failed && <Cancel sx={{ color: 'error.main', fontSize: 20 }} />}
                {!done && !failed && active && (
                  <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <HourglassEmpty sx={{ color: 'warning.main', fontSize: 20 }} />
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: -4,
                        borderRadius: '50%',
                        border: '2px solid',
                        borderColor: 'warning.main',
                        animation: 'pulse 1.2s ease-in-out infinite',
                      }}
                    />
                  </Box>
                )}
                {!done && !failed && !active && <RadioButtonUnchecked sx={{ color: 'text.disabled', fontSize: 20 }} />}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={done || active ? 600 : 400}>
                  {stepName(step)}
                </Typography>
                {s.reason && (
                  <Typography variant="caption" color="text.secondary">
                    {s.reason}
                  </Typography>
                )}
              </Box>
              {done && <Chip label="done" size="small" color="success" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600 }} />}
              {failed && <Chip label="failed" size="small" color="error" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600 }} />}
              {active && (
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                  <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'warning.main', animation: 'pulse 1s ease-in-out infinite' }} />
                  <Typography variant="caption" color="warning.main" sx={{ fontWeight: 600 }}>working…</Typography>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Typewriter log */}
      {typing && (
        <Box
          sx={{
            mt: 1.5,
            p: 1.5,
            borderRadius: 2,
            bgcolor: 'action.hover',
            fontFamily: 'monospace',
            fontSize: '0.72rem',
            color: 'text.secondary',
            borderLeft: '3px solid',
            borderColor: 'primary.main',
          }}
        >
          <Box component="span" sx={{ color: 'success.main', mr: 0.5 }}>$</Box>
          {typing}
          <Box component="span" sx={{ display: 'inline-block', width: 7, height: 12, bgcolor: 'primary.main', ml: 0.5, verticalAlign: 'middle', animation: 'pulse 0.8s step-end infinite' }} />
        </Box>
      )}
    </Box>
  );
}
