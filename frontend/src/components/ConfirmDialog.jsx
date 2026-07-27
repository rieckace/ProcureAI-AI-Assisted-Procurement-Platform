import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert, CircularProgress, Typography } from '@mui/material';
import { Warning } from '@mui/icons-material';

/**
 * Reusable confirmation dialog used for delete, cancel, rollback, and other confirm actions.
 * Props:
 *   open, onClose, onConfirm, title, message (supports JSX bold via **text** → <strong>text</strong>),
 *   confirmLabel, confirmColor, loading, severity
 */
function renderMessage(text) {
  if (!text || typeof text !== 'string') return text;
  // Convert **bold** to <strong>bold</strong> and newlines to <br/>
  const html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmLabel = 'Confirm',
  confirmColor = 'error',
  loading = false,
  severity = null,
}) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Warning color={confirmColor} />
        {title}
      </DialogTitle>
      <DialogContent sx={{ pb: 1 }}>
        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
          {renderMessage(message)}
        </Typography>
        {severity && (
          <Alert severity={severity} sx={{ mt: 2, borderRadius: 2 }}>
            {severity === 'error' ? 'This action cannot be undone.' : 'This action can be undone.'}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading} sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={confirmColor}
          onClick={onConfirm}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={18} /> : null}
          sx={{ borderRadius: 2 }}
        >
          {loading ? `${confirmLabel}...` : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
