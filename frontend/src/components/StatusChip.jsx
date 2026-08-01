import { memo } from 'react';
import { Chip } from '@mui/material';
import {
  CheckCircle, HourglassEmpty, FormatQuote, Cancel,
  LocalShipping, Schedule, AssignmentTurnedIn, Block
} from '@mui/icons-material';

const statusConfig = {
  // PR statuses
  pending: { icon: <HourglassEmpty sx={{ fontSize: 16 }} />, label: 'Pending', color: 'warning' },
  quoted: { icon: <FormatQuote sx={{ fontSize: 16 }} />, label: 'Quoted', color: 'info' },
  ordered: { icon: <AssignmentTurnedIn sx={{ fontSize: 16 }} />, label: 'Ordered', color: 'primary' },
  delivered: { icon: <CheckCircle sx={{ fontSize: 16 }} />, label: 'Delivered', color: 'success' },
  rejected: { icon: <Cancel sx={{ fontSize: 16 }} />, label: 'Cancelled', color: 'error' },
  // PO statuses
  PENDING_APPROVAL: { icon: <HourglassEmpty sx={{ fontSize: 16 }} />, label: 'Pending Approval', color: 'warning' },
  APPROVED: { icon: <CheckCircle sx={{ fontSize: 16 }} />, label: 'Approved', color: 'info' },
  SENT_TO_VENDOR: { icon: <LocalShipping sx={{ fontSize: 16 }} />, label: 'Sent to Vendor', color: 'primary' },
  CONFIRMED: { icon: <AssignmentTurnedIn sx={{ fontSize: 16 }} />, label: 'Confirmed', color: 'secondary' },
  IN_TRANSIT: { icon: <LocalShipping sx={{ fontSize: 16 }} />, label: 'In Transit', color: 'info' },
  OUT_FOR_DELIVERY: { icon: <LocalShipping sx={{ fontSize: 16 }} />, label: 'Out for Delivery', color: 'primary' },
  DELIVERED: { icon: <CheckCircle sx={{ fontSize: 16 }} />, label: 'Delivered', color: 'success' },
  CANCELLED: { icon: <Block sx={{ fontSize: 16 }} />, label: 'Cancelled', color: 'error' },
  // Delivery statuses
  PREPARING: { icon: <Schedule sx={{ fontSize: 16 }} />, label: 'Preparing', color: 'default' },
  PROCESSING: { icon: <HourglassEmpty sx={{ fontSize: 16 }} />, label: 'Processing', color: 'warning' },
  SHIPPED: { icon: <LocalShipping sx={{ fontSize: 16 }} />, label: 'Shipped', color: 'primary' },
  FAILED: { icon: <ErrorCircle sx={{ fontSize: 16 }} />, label: 'Failed', color: 'error' },
  // Agent pipeline statuses
  PROCESSING_PIPELINE: { icon: <HourglassEmpty sx={{ fontSize: 16 }} />, label: 'Processing', color: 'info' },
  AWAITING_APPROVAL: { icon: <HourglassEmpty sx={{ fontSize: 16 }} />, label: 'Awaiting Approval', color: 'warning' },
  APPROVED_PIPELINE: { icon: <CheckCircle sx={{ fontSize: 16 }} />, label: 'Approved', color: 'success' },
  REJECTED: { icon: <Cancel sx={{ fontSize: 16 }} />, label: 'Rejected', color: 'error' },
  COMPLETED: { icon: <CheckCircle sx={{ fontSize: 16 }} />, label: 'Completed', color: 'success' },
  FAILED_PIPELINE: { icon: <ErrorCircle sx={{ fontSize: 16 }} />, label: 'Failed', color: 'error' },
};

function ErrorCircle(props) {
  return <Cancel {...props} />;
}

export default memo(function StatusChip({ status, pulse = false, size = 'small' }) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <Chip
      icon={config.icon}
      label={config.label}
      size={size}
      color={config.color === 'default' ? undefined : config.color}
      variant={config.color === 'default' ? 'outlined' : 'filled'}
      sx={{
        fontWeight: 600,
        fontSize: size === 'small' ? '0.75rem' : '0.8rem',
        ...(pulse
          ? { animation: 'pulse 1.8s ease-in-out infinite', border: '1.5px solid', borderColor: 'currentColor' }
          : {}),
      }}
    />
  );
});
