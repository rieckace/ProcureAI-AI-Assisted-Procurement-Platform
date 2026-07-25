import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, IconButton, Badge, Menu, MenuItem, Divider,
  ListItemIcon, ListItemText, Chip, Avatar, Tooltip, CircularProgress
} from '@mui/material';
import {
  Notifications, Circle, CheckCircle, SmartToy, ShoppingCart,
  PersonAdd, Cancel, Edit, History, FormatQuote
} from '@mui/icons-material';
import api from '../api';
import { getAvatarUrl } from '../utils/avatar';
import { useAuth } from '../context/AuthContext';

const ACTION_ICONS = {
  created: <CheckCircle sx={{ fontSize: 16 }} />,
  updated: <Edit sx={{ fontSize: 16 }} />,
  status_changed: <History sx={{ fontSize: 16 }} />,
  cancelled: <Cancel sx={{ fontSize: 16 }} />,
  added_quote: <FormatQuote sx={{ fontSize: 16 }} />,
  deleted_quote: <Cancel sx={{ fontSize: 16 }} />,
  issued_po: <ShoppingCart sx={{ fontSize: 16 }} />,
  invited_user: <PersonAdd sx={{ fontSize: 16 }} />,
};

const ACTION_COLORS = {
  created: 'success.main',
  updated: 'primary.main',
  status_changed: 'warning.main',
  cancelled: 'error.main',
  added_quote: 'info.main',
  deleted_quote: 'error.main',
  issued_po: 'success.main',
  invited_user: 'secondary.main',
};

function timeAgo(dateStr) {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(false);
  const lastViewedRef = useRef(Date.now());
  const intervalRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.get('/notifications', {
        headers: { 'x-last-viewed': String(lastViewedRef.current) },
      });
      setNotifications(res.data.data);
      setUnreadCount(res.data.unreadCount);
    } catch {
      // Silently fail — notifications are non-critical
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Poll every 30 seconds
  useEffect(() => {
    intervalRef.current = setInterval(fetchNotifications, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchNotifications]);

  const handleOpen = (e) => {
    setAnchorEl(e.currentTarget);
    // Mark as read visually
    setUnreadCount(0);
    lastViewedRef.current = Date.now();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification) => {
    handleClose();
    // Navigate based on entity type
    if (notification.entity === 'PurchaseRequest' && notification.entityId) {
      navigate(`/pr/${notification.entityId}`);
    } else if (notification.action === 'invited_user') {
      navigate('/admin');
    } else if (notification.action === 'uploaded') {
      navigate(`/pr/${notification.entityId}`);
    } else {
      navigate('/activity-log');
    }
  };

  if (!user) return null;

  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title={unreadCount > 0 ? `${unreadCount} new notification(s)` : 'Notifications'}>
        <IconButton
          onClick={handleOpen}
          size="small"
          sx={{ color: 'text.secondary' }}
          aria-label="Notifications"
        >
          <Badge
            badgeContent={unreadCount}
            color="error"
            overlap="circular"
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.6rem',
                minWidth: 16,
                height: 16,
                fontWeight: 600,
                animation: unreadCount > 0 ? 'pulse 2s ease-in-out infinite' : 'none',
              },
            }}
          >
            <Notifications fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            width: 380,
            maxHeight: 480,
            borderRadius: 2,
            mt: 1,
            overflow: 'hidden',
          },
        }}
      >
        {/* Header */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" fontWeight={600}>
            Notifications
          </Typography>
          {notifications.length > 0 && (
            <Box
              onClick={(e) => {
                e.stopPropagation();
                setUnreadCount(0);
                lastViewedRef.current = Date.now();
                handleClose();
              }}
              sx={{
                fontSize: '0.7rem',
                color: 'primary.main',
                fontWeight: 500,
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Mark all read
            </Box>
          )}
        </Box>

        {/* List */}
        <Box sx={{ overflow: 'auto', maxHeight: 380 }}>
          {loading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
              <Notifications sx={{ fontSize: 40, mb: 1, opacity: 0.4 }} />
              <Typography variant="body2">No notifications yet</Typography>
            </Box>
          ) : (
            notifications.map((notif, i) => {
              const icon = ACTION_ICONS[notif.action] || <Circle sx={{ fontSize: 16 }} />;
              const color = ACTION_COLORS[notif.action] || 'text.secondary';
              const isNew = new Date(notif.createdAt).getTime() > lastViewedRef.current - 60000;

              return (
                <MenuItem
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderBottom: i < notifications.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                    bgcolor: isNew ? 'action.hover' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' },
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                  }}
                >
                  <Avatar
                    src={getAvatarUrl(notif.user?.name, 28)}
                    sx={{ width: 28, height: 28, mt: 0.3, flexShrink: 0 }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>
                        {notif.user?.name || 'System'}
                      </Typography>
                      {isNew && (
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            bgcolor: 'error.main',
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        fontSize: '0.75rem',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {notif.details || notif.action}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.disabled"
                      sx={{ fontSize: '0.65rem', mt: 0.3, display: 'block' }}
                    >
                      {timeAgo(notif.createdAt)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      color,
                      display: 'flex',
                      alignItems: 'center',
                      flexShrink: 0,
                      mt: 0.3,
                    }}
                  >
                    {icon}
                  </Box>
                </MenuItem>
              );
            })
          )}
        </Box>

        {notifications.length > 0 && (
          <>
            <Divider />
            <MenuItem
              onClick={() => { handleClose(); navigate('/activity-log'); }}
              sx={{ justifyContent: 'center', py: 1 }}
            >
              <Typography variant="body2" color="primary" fontWeight={500}>
                View All Activity
              </Typography>
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  );
}
