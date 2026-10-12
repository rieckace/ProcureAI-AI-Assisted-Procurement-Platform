import { Alert } from '@mui/material';
import { Lock } from '@mui/icons-material';

export function getCapsLock(e) {
  return Boolean(e.getModifierState && e.getModifierState('CapsLock'));
}

export default function CapsLockHint({ active, sx }) {
  if (!active) return null;
  return (
    <Alert
      severity="warning"
      icon={<Lock fontSize="small" />}
      sx={{
        mt: 0.5,
        mb: 1,
        py: 0.25,
        px: 1.25,
        borderRadius: 1.5,
        fontSize: '0.7rem',
        animation: 'fadeInUp 0.2s ease',
        '& .MuiAlert-message': { py: 0.6 },
        '& .MuiAlert-icon': { py: 0.6 },
        ...sx,
      }}
    >
      Caps Lock is on — your password may not match
    </Alert>
  );
}