import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import api from '../api';

const ThemeContext = createContext(null);

const lightPalette = {
  primary: { main: '#1a73e8', light: '#4b8ff0', dark: '#1557b0', contrastText: '#ffffff' },
  secondary: { main: '#1e8e3e', light: '#34a853', dark: '#188038' },
  error: { main: '#d93025', light: '#fce8e6', dark: '#c5221f' },
  warning: { main: '#f9ab00', light: '#fef7e0', dark: '#e37400' },
  info: { main: '#1a73e8', light: '#e8f0fe', dark: '#1557b0' },
  success: { main: '#1e8e3e', light: '#e6f4ea', dark: '#188038' },
  background: { default: '#f1f3f4', paper: '#ffffff' },
  text: { primary: '#202124', secondary: '#5f6368', disabled: '#9aa0a6' },
  divider: '#dadce0',
  action: {
    active: '#5f6368',
    hover: 'rgba(60,64,67,0.04)',
    selected: 'rgba(60,64,67,0.08)',
    disabled: 'rgba(60,64,67,0.26)',
    disabledBackground: 'rgba(60,64,67,0.12)',
  },
};

const darkPalette = {
  primary: { main: '#8ab4f8', light: '#aecbfa', dark: '#669df6', contrastText: '#202124' },
  secondary: { main: '#81c995', light: '#a8dab5', dark: '#5bb974' },
  error: { main: '#f28b82', light: '#3c2121', dark: '#d93025' },
  warning: { main: '#fdd663', light: '#352f1c', dark: '#e37400' },
  info: { main: '#8ab4f8', light: '#1a2433', dark: '#669df6' },
  success: { main: '#81c995', light: '#1d3525', dark: '#5bb974' },
  background: { default: '#171717', paper: '#202124' },
  text: { primary: '#e8eaed', secondary: '#9aa0a6', disabled: '#5f6368' },
  divider: '#3c4043',
  action: {
    active: '#9aa0a6',
    hover: 'rgba(232,234,237,0.04)',
    selected: 'rgba(232,234,237,0.08)',
    disabled: 'rgba(232,234,237,0.3)',
    disabledBackground: 'rgba(232,234,237,0.12)',
  },
};

function buildTheme(mode) {
  return createTheme({
    palette: { mode, ...(mode === 'dark' ? darkPalette : lightPalette) },
    typography: {
      fontFamily: '"Google Sans", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: { fontWeight: 600, fontSize: '1.75rem', letterSpacing: '-0.01em' },
      h5: { fontWeight: 600, fontSize: '1.35rem', letterSpacing: '-0.01em' },
      h6: { fontWeight: 600, fontSize: '1.05rem' },
      subtitle1: { fontWeight: 500 },
      subtitle2: { fontWeight: 500, fontSize: '0.8125rem' },
      body2: { fontSize: '0.875rem' },
      caption: { fontSize: '0.75rem', fontWeight: 400 },
      button: { textTransform: 'none', fontWeight: 500, fontSize: '0.875rem' },
    },
    shape: { borderRadius: 6 },
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
            '0%, 100%': { boxShadow: '0 0 8px rgba(26,115,232,0.3)' },
            '50%': { boxShadow: '0 0 20px rgba(26,115,232,0.6)' },
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
          '@keyframes ripple': {
            '0%': { transform: 'scale(0)', opacity: 0.5 },
            '100%': { transform: 'scale(4)', opacity: 0 },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            padding: '7px 20px',
            fontSize: '0.875rem',
            fontWeight: 500,
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
              ? 'linear-gradient(135deg, #8ab4f8 0%, #669df6 100%)'
              : 'linear-gradient(135deg, #1a73e8 0%, #1557b0 100%)',
            '&:hover': {
              background: theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #aecbfa 0%, #8ab4f8 100%)'
                : 'linear-gradient(135deg, #1557b0 0%, #124896 100%)',
              boxShadow: theme.palette.mode === 'dark'
                ? '0 4px 12px rgba(138,180,248,0.3)'
                : '0 4px 12px rgba(26,115,232,0.35)',
            },
          }),
          outlined: {
            '&:hover': {
              backgroundColor: 'rgba(26,115,232,0.04)',
              borderColor: 'primary.main',
            },
          },
          sizeSmall: { padding: '4px 12px', fontSize: '0.8125rem' },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 8,
            boxShadow: theme.palette.mode === 'dark'
              ? '0 1px 3px rgba(0,0,0,0.3)'
              : '0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.1)',
            border: 'none',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              boxShadow: theme.palette.mode === 'dark'
                ? '0 8px 25px rgba(0,0,0,0.4)'
                : '0 8px 25px rgba(0,0,0,0.1)',
              transform: 'translateY(-2px)',
            },
          }),
        },
      },
      MuiPaper: {
        styleOverrides: { root: { borderRadius: 8 } },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 4,
              backgroundColor: 'transparent',
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 4, fontWeight: 500, fontSize: '0.75rem', height: 24 },
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
        styleOverrides: { paper: { borderRadius: 8 } },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            borderRadius: 4,
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
            borderRadius: 4,
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
          root: {
            borderRadius: 6,
            animation: 'slideUp 0.3s ease',
          },
          standardError: { backgroundColor: '#fce8e6', color: '#c5221f' },
          standardSuccess: { backgroundColor: '#e6f4ea', color: '#1e8e3e' },
          standardWarning: { backgroundColor: '#fef7e0', color: '#e37400' },
          standardInfo: { backgroundColor: '#e8f0fe', color: '#1a73e8' },
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
