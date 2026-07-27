import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Typography, IconButton, Tooltip, Chip, Fade } from '@mui/material';
import { Lightbulb, Close } from '@mui/icons-material';

const TIPS = {
  '/manager-dashboard': [
    { text: '💡 Press **Cmd+K** to ask Procura AI assistant', action: 'shortcut' },
    { text: '💡 Press **⌘⇧K** to open the global search', action: 'shortcut' },
    { text: '💡 Click **New Request** to create a purchase request', action: 'navigate' },
  ],
  '/officer-dashboard': [
    { text: '💡 Press **Cmd+K** to ask Procura AI assistant', action: 'shortcut' },
    { text: '💡 Press **⌘⇧K** to open the global search', action: 'shortcut' },
    { text: '💡 Drag requests between Kanban columns to update status', action: 'drag' },
  ],
  '/new-request': [
    { text: '💡 Press **Cmd+K** to ask Procura AI assistant', action: 'shortcut' },
    { text: '💡 Include a clear justification to speed up approval', action: 'justify' },
    { text: '💡 Set urgency correctly — critical items get priority', action: 'urgency' },
  ],
  '/analytics': [
    { text: '💡 Press **Cmd+K** to ask Procura AI assistant', action: 'shortcut' },
    { text: '💡 Hover over charts for detailed data points', action: 'hover' },
    { text: '💡 Switch between **Overview**, **Requests**, and **Vendors** tabs', action: 'filter' },
  ],
  '/manage-vendors': [
    { text: '💡 Press **Cmd+K** to ask Procura AI assistant', action: 'shortcut' },
    { text: '💡 Keep vendor ratings and delivery stats up to date', action: 'update' },
    { text: '💡 Categorize vendors for easier filtering', action: 'categorize' },
  ],
  '/admin': [
    { text: '💡 Press **Cmd+K** to ask Procura AI assistant', action: 'shortcut' },
    { text: '💡 Use **Invite User** to add team members', action: 'invite' },
    { text: '💡 Procura can help you invite users — just ask!', action: 'procura' },
  ],
  '/activity-log': [
    { text: '💡 Press **Cmd+K** to ask Procura AI assistant', action: 'shortcut' },
    { text: '💡 Activity logs track all changes in your organization', action: 'track' },
  ],
};

const GLOBAL_TIPS = [
  { text: '💡 Press **Cmd+K** to ask Procura AI assistant', action: 'shortcut' },
  { text: '💡 Press **⌘⇧K** to open the global search', action: 'shortcut' },
  { text: '💡 Ask Procura: "Show my pending requests"', action: 'procura' },
];

export default function ProcuraTips() {
  const location = useLocation();
  const [currentTip, setCurrentTip] = useState(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const getTipForPath = useCallback((path) => {
    // Check exact match first
    if (TIPS[path]) {
      const tips = TIPS[path];
      return tips[Math.floor(Math.random() * tips.length)];
    }
    // Check prefix match for PR detail pages
    if (path.startsWith('/pr/')) {
      return { text: '💡 Ask Procura: "What should I do next for this PR?"', action: 'procura' };
    }
    // Fallback to global
    return GLOBAL_TIPS[Math.floor(Math.random() * GLOBAL_TIPS.length)];
  }, []);

  useEffect(() => {
    // Reset dismissed state on page change
    setDismissed(false);
    setVisible(false);

    const tip = getTipForPath(location.pathname);
    setCurrentTip(tip);

    // Show tip after a brief delay
    const showTimer = setTimeout(() => {
      setVisible(true);
    }, 2000);

    // Auto-hide after 10 seconds if not dismissed
    const hideTimer = setTimeout(() => {
      setVisible(false);
    }, 12000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [location.pathname, getTipForPath]);

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
  };

  if (!currentTip || dismissed) return null;

  return (
    <Fade in={visible} timeout={400}>
      <Box
        sx={{
          position: 'fixed',
          bottom: 90,
          right: 24,
          zIndex: 1050, // Below ChatWidget (1200) and GlobalSearch (1300)
          maxWidth: 320,
          bgcolor: (theme) => theme.palette.mode === 'dark'
            ? 'rgba(26, 35, 53, 0.95)'
            : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          borderRadius: 2,
          p: 1.5,
          pr: 1,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
          },
        }}
        onClick={handleDismiss}
      >
        <Lightbulb sx={{ color: 'warning.main', fontSize: 20, mt: 0.2, flexShrink: 0 }} />
        <Typography
          variant="body2"
          sx={{
            flex: 1,
            fontSize: '0.8rem',
            lineHeight: 1.5,
            '& strong': { fontWeight: 700 },
          }}
          dangerouslySetInnerHTML={{
            __html: currentTip.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          }}
        />
        <Tooltip title="Dismiss">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
            sx={{ p: 0.3, mt: -0.3, mr: -0.3 }}
          >
            <Close sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Fade>
  );
}
