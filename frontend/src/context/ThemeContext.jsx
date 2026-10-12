import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import api from '../api';

const ThemeContext = createContext(null);

const lightPalette = {
  primary: { main: '#4f46e5', light: '#818cf8', dark: '#4338ca', contrastText: '#ffffff' },
  secondary: { main: '#10b981', light: '#34d399', dark: '#059669' },
  error: { main: '#ef4444', light: '#fee2e2', dark: '#dc2626' },
  warning: { main: '#f59e0b', light: '#fef3c7', dark: '#d97706' },
  info: { main: '#6366f1', light: '#e0e7ff', dark: '#4338ca' },
  success: { main: '#10b981', light: '#d1fae5', dark: '#059669' },
  background: { default: '#f6f7fb', paper: '#ffffff' },
  text: { primary: '#0f172a', secondary: '#64748b', disabled: '#94a3b8' },
  divider: '#e2e8f0',
  action: {
    active: '#64748b',
    hover: 'rgba(15,23,42,0.045)',
    selected: 'rgba(15,23,42,0.08)',
    disabled: 'rgba(15,23,42,0.26)',
    disabledBackground: 'rgba(15,23,42,0.12)',
  },
};

const darkPalette = {
  primary: { main: '#818cf8', light: '#a5b4fc', dark: '#6366f1', contrastText: '#0b0f19' },
  secondary: { main: '#34d399', light: '#6ee7b7', dark: '#10b981' },
  error: { main: '#f87171', light: 'rgba(248,113,113,0.14)', dark: '#ef4444' },
  warning: { main: '#fbbf24', light: 'rgba(251,191,36,0.14)', dark: '#f59e0b' },
  info: { main: '#a5b4fc', light: 'rgba(165,180,252,0.14)', dark: '#6366f1' },
  success: { main: '#34d399', light: 'rgba(52,211,153,0.14)', dark: '#10b981' },
  background: { default: '#0b0f19', paper: '#111827' },
  text: { primary: '#e5e7eb', secondary: '#94a3b8', disabled: '#475569' },
  divider: 'rgba(255,255,255,0.08)',
  action: {
    active: '#94a3b8',
    hover: 'rgba(255,255,255,0.05)',
    selected: 'rgba(255,255,255,0.1)',
    disabled: 'rgba(255,255,255,0.3)',
    disabledBackground: 'rgba(255,255,255,0.12)',
  },
};

function buildTheme(mode) {
  return createTheme({
    palette: { mode, ...(mode === 'dark' ? darkPalette : lightPalette) },
    typography: {
      fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontFamily: '"Sora", "Inter", sans-serif',
        fontWeight: 800,
        fontSize: '2.5rem',
        letterSpacing: '-0.03em',
        lineHeight: 1.12,
      },
      h2: {
        fontFamily: '"Sora", "Inter", sans-serif',
        fontWeight: 800,
        fontSize: '2.1rem',
        letterSpacing: '-0.025em',
        lineHeight: 1.15,
      },
      h3: {
        fontFamily: '"Sora", "Inter", sans-serif',
        fontWeight: 700,
        fontSize: '1.7rem',
        letterSpacing: '-0.02em',
        lineHeight: 1.2,
      },
      h4: { fontWeight: 700, fontSize: '1.55rem', letterSpacing: '-0.015em', lineHeight: 1.25 },
      h5: { fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.01em' },
      h6: { fontWeight: 600, fontSize: '1.05rem', letterSpacing: '-0.005em' },
      subtitle1: { fontWeight: 500 },
      subtitle2: { fontWeight: 500, fontSize: '0.8125rem' },
      body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
      body2: { fontSize: '0.875rem', lineHeight: 1.55 },
      caption: { fontSize: '0.75rem', fontWeight: 400 },
      overline: { letterSpacing: '0.08em' },
      button: { textTransform: 'none', fontWeight: 600, fontSize: '0.875rem', letterSpacing: '0.005em' },
    },
    shape: { borderRadius: 10 },
    transitions: {
      duration: {
        shortest: 100,
        shorter: 150,
        short: 200,
        standard: 250,
        complex: 300,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            transition: 'background-color 0.2s ease, color 0.2s ease',
            scrollBehavior: 'smooth',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            fontVariantNumeric: 'tabular-nums',
          },
          // Themed scrollbars (WebKit + Firefox) that match the active palette
          '*::-webkit-scrollbar': { width: 10, height: 10 },
          '*::-webkit-scrollbar-track': { background: 'transparent' },
          '*::-webkit-scrollbar-thumb': {
            background: mode === 'dark' ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.3)',
            borderRadius: 8,
            border: `2px solid ${mode === 'dark' ? '#0b0f19' : '#f6f7fb'}`,
            '&:hover': {
              background: mode === 'dark' ? 'rgba(148,163,184,0.5)' : 'rgba(100,116,139,0.5)',
            },
          },
          '*': {
            scrollbarWidth: 'thin',
            scrollbarColor: mode === 'dark' ? 'rgba(148,163,184,0.3) transparent' : 'rgba(100,116,139,0.3) transparent',
          },
          // Brand-tinted text selection
          '::selection': {
            background: mode === 'dark' ? 'rgba(129,140,248,0.35)' : 'rgba(99,102,241,0.22)',
            color: mode === 'dark' ? '#e5e7eb' : '#0f172a',
          },
          // Visible focus rings for keyboard users (accessibility)
          '*:focus-visible': {
            outline: '2px solid #6366f1',
            outlineOffset: 2,
            borderRadius: 4,
          },
          // Respect users who prefer reduced motion (accessibility)
          '@media (prefers-reduced-motion: reduce)': {
            '*, *::before, *::after': {
              animationDuration: '0.01ms !important',
              animationIterationCount: '1 !important',
              transitionDuration: '0.01ms !important',
              scrollBehavior: 'auto !important',
            },
          },
          // Clean app-wide printing: hide chrome, keep content
          '@media print': {
            'header, nav, .MuiDrawer-root, .MuiFab-root, .MuiAppBar-root': {
              display: 'none !important',
            },
            'main': {
              padding: '0 !important',
              width: '100% !important',
              maxWidth: '100% !important',
              margin: '0 !important',
            },
            'body': {
              backgroundColor: '#ffffff !important',
            },
            '@page': {
              margin: '14mm 12mm',
            },
          },
          '@keyframes fadeInUp': {
            from: { opacity: 0, transform: 'translateY(12px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
          '@keyframes fadeIn': {
            from: { opacity: 0 },
            to: { opacity: 1 },
          },
          '@keyframes slideInLeft': {
            from: { opacity: 0, transform: 'translateX(-16px)' },
            to: { opacity: 1, transform: 'translateX(0)' },
          },
          '@keyframes pulse': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.5 },
          },
          '@keyframes spin': {
            from: { transform: 'rotate(0deg)' },
            to: { transform: 'rotate(360deg)' },
          },
          '@keyframes shimmer': {
            '0%': { backgroundPosition: '-200% 0' },
            '100%': { backgroundPosition: '200% 0' },
          },
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0px)' },
            '50%': { transform: 'translateY(-6px)' },
          },
          '@keyframes glow': {
            '0%, 100%': { boxShadow: '0 0 8px rgba(99,102,241,0.3)' },
            '50%': { boxShadow: '0 0 20px rgba(99,102,241,0.6)' },
          },
          '@keyframes scaleIn': {
            from: { opacity: 0, transform: 'scale(0.95)' },
            to: { opacity: 1, transform: 'scale(1)' },
          },
          '@keyframes slideUp': {
            from: { opacity: 0, transform: 'translateY(20px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
          '@keyframes gradientShift': {
            '0%': { backgroundPosition: '0% 50%' },
            '50%': { backgroundPosition: '100% 50%' },
            '100%': { backgroundPosition: '0% 50%' },
          },
          '@keyframes countUp': {
            from: { opacity: 0, transform: 'translateY(8px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
          '@keyframes pageEnter': {
            from: { opacity: 0, transform: 'translateY(14px) scale(0.995)' },
            to: { opacity: 1, transform: 'translateY(0) scale(1)' },
          },
          '@keyframes floatSlow': {
            '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
            '50%': { transform: 'translateY(-22px) translateX(10px)' },
          },
          '@keyframes blob': {
            '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
            '33%': { transform: 'translate(30px, -20px) scale(1.1)' },
            '66%': { transform: 'translate(-20px, 20px) scale(0.95)' },
          },
          '@keyframes ripple': {
            '0%': { transform: 'scale(0)', opacity: 0.5 },
            '100%': { transform: 'scale(4)', opacity: 0 },
          },
          '@keyframes shake': {
            '0%, 100%': { transform: 'translateX(0)' },
            '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
            '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: '8px',
            padding: '7px 20px',
            fontSize: '0.875rem',
            fontWeight: 600,
            boxShadow: 'none',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              boxShadow: 'none',
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(0px)',
            },
          },
          contained: ({ theme }) => ({
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)'
              : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            '&:hover': {
              background: theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #a5b4fc 0%, #818cf8 100%)'
                : 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
              boxShadow: theme.palette.mode === 'dark'
                ? '0 4px 12px rgba(129,140,248,0.35)'
                : '0 4px 12px rgba(79,70,229,0.35)',
            },
          }),
          outlined: {
            '&:hover': {
              backgroundColor: 'rgba(79,70,229,0.05)',
              borderColor: 'primary.main',
            },
          },
          sizeSmall: { padding: '4px 12px', fontSize: '0.8125rem' },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 12,
            boxShadow: theme.palette.mode === 'dark'
              ? '0 1px 3px rgba(0,0,0,0.35)'
              : '0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.06)',
            border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'}`,
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              boxShadow: theme.palette.mode === 'dark'
                ? '0 8px 30px rgba(0,0,0,0.5)'
                : '0 12px 32px rgba(15,23,42,0.1)',
              transform: 'translateY(-2px)',
            },
          }),
        },
      },
      MuiPaper: {
        styleOverrides: { root: { borderRadius: 12 } },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 10,
              backgroundColor: 'transparent',
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 999, fontWeight: 500, fontSize: '0.75rem', height: 24 },
          sizeSmall: { height: 20, fontSize: '0.6875rem' },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              fontWeight: 600,
              fontSize: '0.6875rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'text.secondary',
              paddingBottom: 8,
              borderBottom: '2px solid',
              borderColor: 'divider',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: { root: { padding: '8px 16px', fontSize: '0.875rem' } },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: 'background-color 0.12s ease',
            '&:last-child td': { borderBottom: 'none' },
            '&:nth-of-type(even)': { backgroundColor: 'action.hover' },
            '&:hover': { backgroundColor: 'action.selected' },
            '&.MuiTableRow-hover:hover': { backgroundColor: 'action.selected' },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: { paper: { borderRadius: 0 } },
      },
      MuiAppBar: {
        styleOverrides: { root: { borderRadius: 0 } },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: 14 } },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            borderColor: 'divider',
            '&.Mui-selected': {
              backgroundColor: 'action.selected',
            },
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
            minHeight: 40,
            padding: '8px 16px',
          },
        },
      },
      MuiBadge: {
        styleOverrides: {
          badge: {
            fontWeight: 600,
            fontSize: '0.625rem',
            minWidth: 16,
            height: 16,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 8,
            padding: '4px 10px',
            fontSize: '0.75rem',
            fontWeight: 400,
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 4, height: 4 },
          bar: { borderRadius: 4 },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 10,
            animation: 'slideUp 0.3s ease',
          }),
          standardError: ({ theme }) => ({
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(248,113,113,0.12)' : '#fee2e2',
            color: theme.palette.mode === 'dark' ? '#f87171' : '#dc2626',
          }),
          standardSuccess: ({ theme }) => ({
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(52,211,153,0.12)' : '#d1fae5',
            color: theme.palette.mode === 'dark' ? '#34d399' : '#059669',
          }),
          standardWarning: ({ theme }) => ({
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(251,191,36,0.12)' : '#fef3c7',
            color: theme.palette.mode === 'dark' ? '#fbbf24' : '#d97706',
          }),
          standardInfo: ({ theme }) => ({
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(165,180,252,0.12)' : '#e0e7ff',
            color: theme.palette.mode === 'dark' ? '#a5b4fc' : '#4338ca',
          }),
        },
      },
      MuiSnackbar: {
        styleOverrides: {
          root: {
            '& .MuiSnackbarContent-root': {
              animation: 'slideUp 0.35s ease',
            },
          },
        },
      },
      MuiPagination: {
        styleOverrides: {
          root: {
            '& .MuiPaginationItem-root': {
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'translateY(-1px)',
              },
              '&.Mui-selected': {
                animation: 'scaleIn 0.2s ease',
              },
            },
          },
        },
      },
    },
  });
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('themeMode') || 'light');

  const toggleTheme = () => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', next);
      return next;
    });
  };

  // Sync theme preference to backend when it changes
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.patch('/auth/profile', { theme: mode }).catch(() => {});
    }
  }, [mode]);

  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useThemeMode must be used within a ThemeProvider');
  return context;
}
