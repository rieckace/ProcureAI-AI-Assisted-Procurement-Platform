import { memo } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import {
  Assignment, FormatQuote, AssignmentTurnedIn, LocalShipping,
  Check, Close
} from '@mui/icons-material';

const STEPS = [
  { key: 'pending', label: 'Request', caption: 'Submitted', icon: Assignment },
  { key: 'quoted', label: 'Quotes', caption: 'Vendor pricing', icon: FormatQuote },
  { key: 'ordered', label: 'Order', caption: 'PO issued', icon: AssignmentTurnedIn },
  { key: 'delivered', label: 'Delivered', caption: 'Items received', icon: LocalShipping },
];

const STATUS_INDEX = { pending: 0, quoted: 1, ordered: 2, delivered: 3 };

export default memo(function ProcurementLifecycleStepper({ status, quoteCount = 0, compact = false }) {
  const isCancelled = status === 'rejected' || status === 'cancelled';
  const isComplete = status === 'delivered';
  const activeIndex = STATUS_INDEX[status] ?? -1;

  const failIndex = isCancelled ? (activeIndex >= 0 ? activeIndex : 0) : -1;

  const lineColor = (i) => {
    if (isCancelled) return 'divider';
    if (isComplete || i < activeIndex) return '#10b981';
    return 'divider';
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        position: 'relative',
        width: '100%',
        px: compact ? 0 : 1,
        py: compact ? 1 : 1.5,
        pb: isCancelled ? (compact ? 2.5 : 2) : undefined,
      }}
    >
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        let state;
        if (isCancelled) {
          state = i < failIndex ? 'done' : i === failIndex ? 'fail' : 'todo';
        } else if (isComplete) {
          state = 'done';
        } else if (i < activeIndex) {
          state = 'done';
        } else if (i === activeIndex) {
          state = 'active';
        } else {
          state = 'todo';
        }

        const isDone = state === 'done';
        const isActive = state === 'active';
        const isFail = state === 'fail';

        const dotSize = compact ? 26 : 32;

        return (
          <Box key={step.key} sx={{ display: 'flex', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
            {/* Step node */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: dotSize,
                flexShrink: 0,
              }}
            >
              <Tooltip title={isFail ? `Cancelled at "${step.label}" stage` : step.caption}>
                <Box
                  component="span"
                  sx={{
                    width: dotSize,
                    height: dotSize,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: compact ? '0.9rem' : '1rem',
                    color: isDone ? '#ffffff' : isActive ? '#ffffff' : isFail ? '#ffffff' : 'text.disabled',
                    backgroundColor: isDone
                      ? '#10b981'
                      : isActive
                        ? '#6366f1'
                        : isFail
                          ? '#ef4444'
                          : 'action.selected',
                    boxShadow: isActive
                      ? '0 0 0 5px rgba(99,102,241,0.18)'
                      : isDone
                        ? '0 0 0 4px rgba(16,185,129,0.14)'
                        : isFail
                          ? '0 0 0 4px rgba(239,68,68,0.14)'
                          : 'none',
                    animation: isActive ? 'pulse 1.6s ease-in-out infinite' : 'none',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {isDone ? (
                    <Check fontSize="small" sx={{ fontSize: compact ? '0.8rem' : '0.95rem' }} />
                  ) : isFail ? (
                    <Close fontSize="small" sx={{ fontSize: compact ? '0.8rem' : '0.95rem' }} />
                  ) : (
                    <Icon />
                  )}
                </Box>
              </Tooltip>
              <Typography
                variant="caption"
                sx={{
                  mt: 0.6,
                  fontWeight: isActive || isDone ? 700 : 500,
                  fontSize: compact ? '0.58rem' : '0.65rem',
                  color: isDone ? 'success.main' : isActive ? 'primary.main' : isFail ? 'error.main' : 'text.secondary',
                  textAlign: 'center',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                }}
              >
                {step.label}
              </Typography>
              {i === 1 && !compact && quoteCount > 0 && (
                <Typography
                  variant="caption"
                  sx={{
                    mt: 0.2,
                    fontSize: '0.58rem',
                    color: 'primary.main',
                    fontWeight: 600,
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {quoteCount} quote{quoteCount > 1 ? 's' : ''}
                </Typography>
              )}
            </Box>

            {/* Connector */}
            {i < STEPS.length - 1 && (
              <Box
                sx={{
                  flex: 1,
                  height: 2,
                  mt: dotSize / 2 - 1,
                  mx: 1,
                  minWidth: 12,
                  borderRadius: 1,
                  backgroundColor: lineColor(i),
                  transition: 'background-color 0.4s ease',
                }}
              />
            )}
          </Box>
        );
      })}

      {isCancelled && (
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            ...(compact ? { bottom: -16 } : { bottom: -4 }),
            left: 0,
            color: 'error.main',
            fontWeight: 600,
            fontSize: '0.62rem',
          }}
        >
          This request was cancelled before completion
        </Typography>
      )}
    </Box>
  );
});