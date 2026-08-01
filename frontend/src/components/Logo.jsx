import { Box } from '@mui/material';

/**
 * Logo — the ProcureAI brand mark. A gradient rounded square with a stylized
 * "shopping → check" glyph. Reusable anywhere (login, layout, landing, loader).
 *
 * Usage:
 *   <Logo size={36} />
 *   <Logo size={32} withWordmark />
 */
export default function Logo({ size = 36, withWordmark = false, wordmarkSize = '1.05rem' }) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: size * 0.26,
          background: 'linear-gradient(135deg, #1a73e8 0%, #1557b0 55%, #0d47a1 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 4px ${size * 0.4}px rgba(26,115,232,0.35)`,
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
          '&::after': {
            content: '""',
            position: 'absolute',
            top: '-40%',
            right: '-30%',
            width: '85%',
            height: '85%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 65%)',
          },
        }}
      >
        {/* Cart glyph */}
        <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3 3h2l2.6 12.2a1.5 1.5 0 0 0 1.47 1.2h8.9a1.5 1.5 0 0 0 1.46-1.16L20.5 8H6.5"
            stroke="#ffffff"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="9.5" cy="20" r="1.4" fill="#aecbfa" />
          <circle cx="17" cy="20" r="1.4" fill="#aecbfa" />
        </svg>
      </Box>
      {withWordmark && (
        <Box sx={{ minWidth: 0 }}>
          <Box
            component="span"
            sx={{
              fontWeight: 800,
              fontSize: wordmarkSize,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              background: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, #aecbfa, #8ab4f8)'
                  : 'linear-gradient(135deg, #1a73e8, #0d47a1)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              display: 'block',
              whiteSpace: 'nowrap',
            }}
          >
            ProcureAI
          </Box>
          <Box
            component="span"
            sx={{
              fontSize: '0.6rem',
              color: 'text.disabled',
              lineHeight: 1.1,
              letterSpacing: '0.02em',
              display: 'block',
              whiteSpace: 'nowrap',
            }}
          >
            AI Procurement System
          </Box>
        </Box>
      )}
    </Box>
  );
}
