import { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert, Button, Box } from '@mui/material';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success', action: null });

  const showToast = useCallback((message, severity = 'success', action = null) => {
    setToast({ open: true, message, severity, action });
  }, []);

  const handleClose = useCallback((_, reason) => {
    if (reason === 'clickaway') return;
    setToast(p => ({ ...p, open: false }));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleClose}
          severity={toast.severity}
          variant="filled"
          sx={{ borderRadius: 2, minWidth: 280, alignItems: 'center' }}
          action={
            toast.action ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {toast.action.label && (
                  <Button
                    size="small"
                    color="inherit"
                    variant="outlined"
                    sx={{
                      borderColor: 'rgba(255,255,255,0.5)',
                      color: 'inherit',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      '&:hover': { borderColor: 'rgba(255,255,255,0.8)', bgcolor: 'rgba(255,255,255,0.1)' },
                    }}
                    onClick={() => {
                      toast.action.onClick();
                      setToast(p => ({ ...p, open: false }));
                    }}
                  >
                    {toast.action.label}
                  </Button>
                )}
              </Box>
            ) : (
              undefined
            )
          }
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}
