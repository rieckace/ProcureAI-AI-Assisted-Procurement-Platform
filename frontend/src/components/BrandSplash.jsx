import { Box, Typography } from '@mui/material';
import Logo from './Logo';

/**
 * BrandSplash — branded boot/loading screen with an animated logo shimmer.
 * Used as the Suspense fallback and route transition loader.
 */
export default function BrandSplash({ message = 'Loading…' }) {
  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2.5,
        px: 3,
      }}
    >
      <Box sx={{ position: 'relative', animation: 'fadeInUp 0.4s ease both' }}>
        <Logo size={64} />
        {/* pulsing halo behind the mark */}
        <Box
          sx={{
            position: 'absolute',
            inset: -14,
            borderRadius: '50%',
            border: '2px solid',
            borderColor: 'primary.main',
            opacity: 0.35,
            animation: 'pulse 1.6s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
      </Box>
      <Box sx={{ width: 160, maxWidth: '70%', height: 3, borderRadius: 2, overflow: 'hidden', bgcolor: 'action.hover' }}>
        <Box
          sx={{
            width: '40%',
            height: '100%',
            borderRadius: 2,
            background: (theme) => `linear-gradient(90deg, transparent, ${theme.palette.mode === 'dark' ? '#8ab4f8' : '#1a73e8'}, transparent)`,
            animation: 'shimmer 1.3s ease-in-out infinite',
            backgroundSize: '200% 100%',
          }}
        />
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ animation: 'pulse 2s ease-in-out infinite' }}>
        {message}
      </Typography>
    </Box>
  );
}
