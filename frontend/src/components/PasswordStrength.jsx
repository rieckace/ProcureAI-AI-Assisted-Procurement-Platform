import { Box, Typography, LinearProgress } from '@mui/material';

const STRENGTH_LEVELS = [
  { label: 'Very Weak', color: '#f44336', min: 0 },
  { label: 'Weak', color: '#ff7043', min: 2 },
  { label: 'Fair', color: '#ffa726', min: 3 },
  { label: 'Strong', color: '#4caf50', min: 4 },
];

export default function PasswordStrength({ password }) {
  if (!password) return null;

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const level = [...STRENGTH_LEVELS].reverse().find(l => score >= l.min) || STRENGTH_LEVELS[0];
  const percent = Math.min((score / 6) * 100, 100);

  return (
    <Box sx={{ mt: 0.5 }}>
      <LinearProgress
        variant="determinate"
        value={percent}
        sx={{
          height: 4,
          borderRadius: 2,
          backgroundColor: 'action.hover',
          '& .MuiLinearProgress-bar': { backgroundColor: level.color, borderRadius: 2 },
        }}
      />
      <Typography variant="caption" sx={{ color: level.color, fontWeight: 500, mt: 0.25, display: 'block' }}>
        {level.label}
      </Typography>
    </Box>
  );
}
