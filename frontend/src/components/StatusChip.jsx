import { memo } from 'react';
import { Chip } from '@mui/material';
import { CheckCircle, HourglassEmpty, FormatQuote, Cancel } from '@mui/icons-material';

const statusConfig = {
  pending: {
    icon: <HourglassEmpty sx={{ fontSize: 16 }} />,
    label: 'Pending',
    color: 'warning',
  },
  quoted: {
    icon: <FormatQuote sx={{ fontSize: 16 }} />,
    label: 'Quoted',
    color: 'info',
  },
  ordered: {
    icon: <CheckCircle sx={{ fontSize: 16 }} />,
    label: 'Ordered',
    color: 'primary',
  },
  delivered: {
    icon: <CheckCircle sx={{ fontSize: 16 }} />,
    label: 'Delivered',
    color: 'success',
  },
  rejected: {
    icon: <Cancel sx={{ fontSize: 16 }} />,
    label: 'Cancelled',
    color: 'error',
  },
};

export default memo(function StatusChip({ status }) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <Chip
      icon={config.icon}
      label={config.label}
      size="small"
      color={config.color}
      variant="filled"
      sx={{
        fontWeight: 600,
        fontSize: '0.75rem',
      }}
    />
  );
});
