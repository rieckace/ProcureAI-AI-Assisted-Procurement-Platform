import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Typography, Button, Paper, IconButton } from '@mui/material';
import { Close, NavigateNext, NavigateBefore } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const STORAGE_KEY = 'procura_tour_done';

const STEPS = [
  {
    title: 'Welcome to ProcureAI 🎉',
    description: 'Here\'s a quick 4-step tour to get you oriented. You can skip anytime.',
    target: '[data-tour="logo"]',
    placement: 'right',
  },
  {
    title: 'Create requests fast',
    description: 'Hit the "New Request" button to submit a purchase request — or just press N on your keyboard.',
    target: '[data-tour="new-request"]',
    placement: 'right',
  },
  {
    title: 'Meet Procura 🤖',
    description: 'Click the chat bubble (or press Cmd/Ctrl+K) to ask the AI assistant anything about procurement.',
    target: '[data-tour="chat"]',
    placement: 'left',
  },
  {
    title: 'Dark & light mode',
    description: 'Toggle between dark and light themes right from the header. Enjoy!',
    target: '[data-tour="theme"]',
    placement: 'bottom',
  },
];

export default function OnboardingTour() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  // Never re-open on subsequent navigations within the same page session
  const sessionShownRef = useRef(false);

  const dismiss = useCallback(() => {
    setOpen(false);
    localStorage.setItem(STORAGE_KEY, '1');
  }, []);

  // Show only once per session, on the first app page (inside Layout)
  useEffect(() => {
    if (!user) return;
    const isAppPage = !['/login', '/'].includes(location.pathname);
    if (!isAppPage) return;
    if (sessionShownRef.current) {
      // Already shown this session — navigating between pages must close
      // any open tour so the card never gets stuck on a stale target.
      setOpen(false);
      return;
    }
    sessionShownRef.current = true;
    if (localStorage.getItem(STORAGE_KEY)) return;
    const timer = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(timer);
  }, [user, location.pathname]);

  const measure = useCallback(() => {
    const step = STEPS[stepIndex];
    const el = document.querySelector(step.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    } else {
      setTargetRect(null);
    }
  }, [stepIndex]);

  useEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, measure]);

  if (!open) return null;

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const cardSx = {
    position: 'fixed',
    zIndex: 99999,
    width: 300,
    maxWidth: 'calc(100vw - 32px)',
    ...(targetRect
      ? step.placement === 'right'
        ? { top: targetRect.top + targetRect.height / 2 - 60, left: targetRect.left + targetRect.width + 16 }
        : step.placement === 'left'
          ? { top: targetRect.top + targetRect.height / 2 - 60, right: window.innerWidth - targetRect.left + 16 }
          : { top: targetRect.top + targetRect.height + 16, left: Math.max(16, targetRect.left + targetRect.width / 2 - 150) }
      : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }),
  };

  return (
    <Box sx={{ position: 'fixed', inset: 0, zIndex: 99990, pointerEvents: 'none' }}>
      {/* Dim + spotlight — all layers are click-through so the app stays usable */}
      {targetRect ? (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            boxShadow: `0 0 0 9999px rgba(0,0,0,0.55)`,
            pointerEvents: 'none',
          }}
        />
      ) : (
        <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.55)', pointerEvents: 'none' }} />
      )}

      {/* Highlight box */}
      {targetRect && (
        <Box
          sx={{
            position: 'fixed',
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            borderRadius: 2,
            border: '2px solid',
            borderColor: 'primary.main',
            animation: 'pulse 1.6s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Card — interactive only */}
      <Paper elevation={16} sx={{ ...cardSx, p: 2.5, borderRadius: 3, pointerEvents: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="caption" color="primary.main" fontWeight={700} sx={{ letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '0.65rem' }}>
            Step {stepIndex + 1} of {STEPS.length}
          </Typography>
          <IconButton size="small" onClick={dismiss} sx={{ color: 'text.secondary' }}>
            <Close fontSize="small" />
          </IconButton>
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, fontSize: '1rem' }}>
          {step.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
          {step.description}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button size="small" onClick={dismiss} sx={{ color: 'text.secondary', textTransform: 'none', fontSize: '0.75rem' }}>
            Skip tour
          </Button>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <IconButton size="small" disabled={stepIndex === 0} onClick={() => setStepIndex((i) => Math.max(0, i - 1))} sx={{ color: 'text.secondary' }}>
              <NavigateBefore fontSize="small" />
            </IconButton>
            <Button
              size="small"
              variant="contained"
              endIcon={<NavigateNext fontSize="small" />}
              onClick={() => (isLast ? dismiss() : setStepIndex((i) => i + 1))}
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              {isLast ? 'Finish' : 'Next'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
