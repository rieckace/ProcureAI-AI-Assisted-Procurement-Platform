import { Box, Typography, Button } from '@mui/material';

/**
 * EmptyState — consistent illustrated empty state across all pages.
 *
 * Usage:
 *   <EmptyState icon={<Inbox />} title="No requests yet"
 *     description="Create your first request to get started"
 *     action={<Button variant="contained" onClick={...}>Create</Button>} />
 */
export default function EmptyState({
  icon,
  title = 'Nothing here yet',
  description,
  action,
  compact = false,
}) {
  return (
    <Box
      sx={{
        textAlign: 'center',
        py: compact ? 4 : 8,
        px: 3,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* soft gradient halo behind the icon */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: compact ? 160 : 260,
          height: compact ? 160 : 260,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: compact ? 56 : 88,
          height: compact ? 56 : 88,
          borderRadius: '50%',
          mb: 1.5,
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(165,180,252,0.15), rgba(165,180,252,0.05))'
              : 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(99,102,241,0.04))',
          color: 'primary.main',
          animation: 'float 3s ease-in-out infinite',
        }}
      >
        {icon}
      </Box>
      <Typography variant={compact ? 'h6' : 'h5'} color="text.secondary" sx={{ mb: 0.75, fontWeight: 600, position: 'relative' }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: action ? 3 : 0, position: 'relative', maxWidth: 420, mx: 'auto' }}>
          {description}
        </Typography>
      )}
      {action && <Box sx={{ position: 'relative' }}>{action}</Box>}
    </Box>
  );
}
