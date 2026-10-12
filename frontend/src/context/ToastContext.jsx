import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Snackbar, Alert, Button, Box, Typography } from '@mui/material';
import { CheckCircle, Info, Warning, Error, Close } from '@mui/icons-material';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

const ICONS = {
  success: <CheckCircle fontSize="small" />,
  info: <Info fontSize="small" />,
  warning: <Warning fontSize="small" />,
  error: <Error fontSize="small" />,
};

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success', action: null });
  const [progress, setProgress] = useState(100);
  const hideTimerRef = useRef(null);
  const progressTimerRef = useRef(null);

  const DURATION = 4000;

  const clearTimers = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    hideTimerRef.current = null;
    progressTimerRef.current = null;
  }, []);

  const closeToast = useCallback(() => {
    clearTimers();
    setToast(p => ({ ...p, open: false }));
    setProgress(100);
  }, [clearTimers]);

  const showToast = useCallback((message, severity = 'success', action = null) => {
    clearTimers();
    setToast({ open: true, message, severity, action });
    setProgress(100);

    // Auto-dismiss with a smooth progress bar
    const start = Date.now();
    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(remaining);
    }, 50);

    hideTimerRef.current = setTimeout(() => {
      closeToast();
    }, DURATION);
  }, [clearTimers, closeToast]);

  // Cleanup on unmount
  useEffect(() => clearTimers, [clearTimers]);

  const handleClose = useCallback((_, reason) => {
    if (reason === 'clickaway') return;
    closeToast();
  }, [closeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Snackbar
        open={toast.open}
        autoHideDuration={null}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ '& .MuiSnackbarContent-root': { animation: 'slideUp 0.35s ease' } }}
      >
        <Alert
          onClose={handleClose}
          severity={toast.severity}
          variant="filled"
          icon={ICONS[toast.severity] || ICONS.info}
          role="status"
          aria-live="polite"
          sx={{
            borderRadius: 2,
            minWidth: 320,
            maxWidth: 480,
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
            '& .MuiAlert-icon': { animation: toast.severity === 'success' ? 'scaleIn 0.3s ease' : 'none' },
          }}
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 1 }}>
              {toast.action?.label && (
                <Button
                  size="small"
                  color="inherit"
                  variant="outlined"
                  sx={{
                    borderColor: 'rgba(255,255,255,0.5)',
                    color: 'inherit',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    '&:hover': { borderColor: 'rgba(255,255,255,0.85)', bgcolor: 'rgba(255,255,255,0.12)' },
                  }}
                  onClick={() => {
                    toast.action.onClick();
                    closeToast();
                  }}
                >
                  {toast.action.label}
                </Button>
              )}
            </Box>
          }
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.45 }}>
              {toast.message}
            </Typography>
          </Box>
          {/* Auto-dismiss progress bar */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              height: 3,
              width: `${progress}%`,
              bgcolor: 'rgba(255,255,255,0.6)',
              transition: 'width 0.1s linear',
              borderBottomLeftRadius: 8,
            }}
          />
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}
