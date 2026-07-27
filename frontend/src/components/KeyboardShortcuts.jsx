import { useState, useEffect } from 'react';
import {
  Box, Typography, Dialog, DialogContent, IconButton, Divider, Chip
} from '@mui/material';
import { Close } from '@mui/icons-material';

const SHORTCUT_GROUPS = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['?'], desc: 'Show this help overlay' },
      { keys: ['⌘K / Ctrl+K'], desc: 'Toggle AI Chat' },
      { keys: ['⌘⇧K / Ctrl+⇧K'], desc: 'Open global search' },
      { keys: ['/'], desc: 'Quick search' },
      { keys: ['Esc'], desc: 'Close modals / dialogs' },
    ],
  },
  {
    title: 'Go To (press G, then...)',
    shortcuts: [
      { keys: ['g', 'd'], desc: 'Dashboard' },
      { keys: ['g', 'n'], desc: 'New Purchase Request' },
      { keys: ['g', 'o'], desc: 'Officer Dashboard' },
      { keys: ['g', 'v'], desc: 'Vendors' },
      { keys: ['g', 'l'], desc: 'Activity Log' },
      { keys: ['g', 'y'], desc: 'Analytics' },
      { keys: ['g', 'p'], desc: 'Profile' },
      { keys: ['g', 'a'], desc: 'Admin Panel' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: ['N'], desc: 'New Purchase Request' },
      { keys: ['R'], desc: 'Refresh page' },
      { keys: ['B'], desc: 'Toggle sidebar' },
      { keys: ['↑↓'], desc: 'Navigate list items' },
      { keys: ['⏎'], desc: 'Open selected item' },
    ],
  },
  {
    title: 'Tips',
    shortcuts: [
      { keys: ['Tab'], desc: 'Move to next field' },
      { keys: ['Shift+Tab'], desc: 'Move to previous field' },
    ],
  },
];

export default function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const target = e.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      // '?' toggles help overlay only
      if (e.key === '?') {
        e.preventDefault();
        setOpen(prev => !prev);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          animation: 'scaleIn 0.2s ease',
        },
      }}
    >
      {/* Header */}
      <Box sx={{
        px: 3, py: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            ⌨️ Keyboard Shortcuts
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
            Press <Chip label="?" size="small" sx={{ height: 18, fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 700 }} /> to toggle this overlay anytime
          </Typography>
        </Box>
        <IconButton size="small" onClick={() => setOpen(false)} aria-label="Close shortcuts">
          <Close fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 2.5, maxHeight: 420 }}>
        {SHORTCUT_GROUPS.map((group, gi) => (
          <Box key={gi} sx={{ mb: gi < SHORTCUT_GROUPS.length - 1 ? 2.5 : 0 }}>
            <Typography
              variant="subtitle2"
              fontWeight={600}
              sx={{
                mb: 1,
                color: 'primary.main',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {group.title}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {group.shortcuts.map((shortcut, si) => (
                <Box
                  key={si}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'action.hover' },
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                    {shortcut.desc}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    {shortcut.keys.map((key, ki) => (
                      <Box key={ki} sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                        {ki > 0 && (
                          <Typography variant="caption" color="text.disabled" sx={{ mx: 0.25, fontSize: '0.65rem' }}>
                            then
                          </Typography>
                        )}
                        <Box
                          sx={{
                            bgcolor: 'grey.900',
                            color: 'grey.100',
                            border: '1px solid',
                            borderColor: 'grey.700',
                            borderRadius: 0.5,
                            px: 0.75,
                            py: 0.25,
                            fontFamily: 'monospace',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {key}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
            {gi < SHORTCUT_GROUPS.length - 1 && <Divider sx={{ mt: 2 }} />}
          </Box>
        ))}
      </DialogContent>
    </Dialog>
  );
}
