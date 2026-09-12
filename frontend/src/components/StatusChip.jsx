import { memo } from 'react';
import { Box } from '@mui/material';

const STATUS_THEME = {
  // PR statuses
  pending: { label: 'Pending', color: '#f59e0b', pulse: true },
  quoted: { label: 'Quoted', color: '#6366f1' },
  ordered: { label: 'Ordered', color: '#0ea5e9' },
  delivered: { label: 'Delivered', color: '#10b981' },
  rejected: { label: 'Cancelled', color: '#ef4444' },
  // PO statuses
  PENDING_APPROVAL: { label: 'Pending Approval', color: '#f59e0b', pulse: true },
  APPROVED: { label: 'Approved', color: '#6366f1' },
  SENT_TO_VENDOR: { label: 'Sent to Vendor', color: '#0ea5e9' },
  CONFIRMED: { label: 'Confirmed', color: '#10b981' },
  IN_TRANSIT: { label: 'In Transit', color: '#0ea5e9', pulse: true },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: '#6366f1', pulse: true },
  DELIVERED: { label: 'Delivered', color: '#10b981' },
  CANCELLED: { label: 'Cancelled', color: '#ef4444' },
  // Delivery statuses
  PREPARING: { label: 'Preparing', color: '#64748b' },
  PROCESSING: { label: 'Processing', color: '#f59e0b', pulse: true },
  SHIPPED: { label: 'Shipped', color: '#0ea5e9' },
  FAILED: { label: 'Failed', color: '#ef4444' },
  // Agent pipeline statuses
  PROCESSING_PIPELINE: { label: 'Processing', color: '#6366f1', pulse: true },
  AWAITING_APPROVAL: { label: 'Awaiting Approval', color: '#f59e0b', pulse: true },
  APPROVED_PIPELINE: { label: 'Approved', color: '#10b981' },
  REJECTED: { label: 'Rejected', color: '#ef4444' },
  COMPLETED: { label: 'Completed', color: '#10b981' },
  FAILED_PIPELINE: { label: 'Failed', color: '#ef4444' },
};

export default memo(function StatusChip({ status, pulse = false, size = 'small' }) {
  const config = STATUS_THEME[status] || {
    label: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown',
    color: '#64748b',
  };
  const live = pulse || config.pulse;
  const isSmall = size !== 'large';

  return (
    <Box
      component="span"
      title={config.label}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? 0.55 : 0.75,
        px: isSmall ? 1 : 1.25,
        py: isSmall ? 0.3 : 0.45,
        borderRadius: 999,
        backgroundColor: `${config.color}1a`,
        color: config.color,
        fontWeight: 600,
        fontSize: isSmall ? '0.7rem' : '0.78rem',
        letterSpacing: '0.01em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        userSelect: 'none',
        border: '1px solid',
        borderColor: `${config.color}33`,
      }}
    >
      <Box
        component="span"
        sx={{
          width: isSmall ? 6 : 8,
          height: isSmall ? 6 : 8,
          borderRadius: '50%',
          flexShrink: 0,
          backgroundColor: config.color,
          boxShadow: `0 0 0 3px ${config.color}1f`,
          animation: live ? 'pulse 1.6s ease-in-out infinite' : 'none',
        }}
      />
      {config.label}
    </Box>
  );
});