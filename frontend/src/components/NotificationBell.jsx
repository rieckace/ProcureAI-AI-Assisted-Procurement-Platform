import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, IconButton, Badge, Menu, MenuItem, Divider,
  Tooltip, CircularProgress, Button, Chip
} from '@mui/material';
import {
  Notifications, CheckCircle, ShoppingCart, Cancel, History,
  FormatQuote, PersonAdd, Edit, Inventory2, DeleteSweep, Circle
} from '@mui/icons-material';
import api from '../api';
import { timeAgo } from '../utils/timeAgo';
import { useAuth } from '../context/AuthContext';

const NOTIFICATION_ICONS = {
  status_change: <History sx={{ fontSize: 16 }} />,
  new_quote: <FormatQuote sx={{ fontSize: 16 }} />,
  po_issued: <ShoppingCart sx={{ fontSize: 16 }} />,
  comment_added: <Edit sx={{ fontSize: 16 }} />,
  vendor_added: <PersonAdd sx={{ fontSize: 16 }} />,
  user_invited: <PersonAdd sx={{ fontSize: 16 }} />,
  attachment_added: <Inventory2 sx={{ fontSize: 16 }} />,
};

const NOTIFICATION_COLORS = {
  status_change: 'warning.main',
  new_quote: 'info.main',
  po_issued: 'success.main',
  comment_added: 'primary.main',
  vendor_added: 'secondary.main',
  user_invited: 'secondary.main',
  attachment_added: 'primary.main',
};

const NOTIFICATION_EMOJIS = {
  status_change: '🔄',
  new_quote: '💰',
  po_issued: '📦',
  comment_added: '💬',
  vendor_added: '🏢',
  user_invited: '👤',
  attachment_added: '📎',
};

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const intervalRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications', { params: { limit: 50 } });
      setNotifications(res.data.data);
      setUnreadCount(res.data.unreadCount);
    } catch {
      // Silently fail — notifications are non-critical
    }
  }, [user]);

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
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAllRead = async () => {
    setMarkingAllRead(true);
    try {
      await api.post('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {
      // Silently fail
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    handleClose();
    // Mark this notification as read
    try {
      await api.post(`/notifications/read/${notification.id}`);
    } catch { /* silent */ }

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleDismiss = async (e, notifId) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${notifId}`);
      setNotifications(prev => prev.filter(n => n.id !== notifId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
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
            width: 400,
            maxHeight: 500,
            borderRadius: 2,
            mt: 1,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          },
        }}
      >
        {/* Header */}
        <Box sx={{
          px: 2, py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'background.paper',
          position: 'sticky',
          top: 0,
          zIndex: 1,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Chip
                label={unreadCount}
                size="small"
                color="error"
                sx={{ height: 20, minWidth: 20, fontSize: '0.65rem', fontWeight: 700 }}
              />
            )}
          </Box>
          {unreadCount > 0 && (
            <Button
              size="small"
              onClick={handleMarkAllRead}
              disabled={markingAllRead}
              sx={{
                fontSize: '0.7rem',
                fontWeight: 600,
                textTransform: 'none',
                color: 'primary.main',
                minWidth: 'auto',
                p: 0.5,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              {markingAllRead ? <CircularProgress size={12} /> : 'Mark all read'}
            </Button>
          )}
        </Box>

        {/* List */}
        <Box sx={{ overflow: 'auto', maxHeight: 400 }}>
          {loading && notifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
              <Notifications sx={{ fontSize: 40, mb: 1.5, opacity: 0.3 }} />
              <Typography variant="body2" fontWeight={500}>No notifications yet</Typography>
              <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block', mb: 2 }}>
                You'll see updates about your purchase requests here
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<History fontSize="small" />}
                onClick={() => { setOpen(false); navigate('/activity-log'); }}
              >
                View Activity Log
              </Button>
            </Box>
          ) : (
            notifications.map((notif) => {
              const emoji = NOTIFICATION_EMOJIS[notif.type] || '🔔';
              const icon = NOTIFICATION_ICONS[notif.type] || <Circle sx={{ fontSize: 16 }} />;
              const color = NOTIFICATION_COLORS[notif.type] || 'text.secondary';

              return (
                <MenuItem
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    bgcolor: notif.read ? 'transparent' : 'action.hover',
                    borderLeft: notif.read ? '3px solid transparent' : '3px solid',
                    borderLeftColor: notif.read ? 'transparent' : 'primary.main',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: 'action.selected',
                      transform: 'translateX(2px)',
                    },
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                  }}
                >
                  {/* Icon */}
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: notif.read ? 'action.hover' : color.replace('.main', '.light'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      mt: 0.3,
                      color,
                    }}
                  >
                    {icon}
                  </Box>

                  {/* Content */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      fontWeight={notif.read ? 500 : 700}
                      sx={{ fontSize: '0.8rem', mb: 0.2 }}
                    >
                      {emoji} {notif.title}
                    </Typography>
                    {notif.message && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          fontSize: '0.73rem',
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {notif.message}
                      </Typography>
                    )}
                    <Typography
                      variant="caption"
                      color="text.disabled"
                      sx={{ fontSize: '0.65rem', mt: 0.3, display: 'block' }}
                    >
                      {timeAgo(notif.createdAt)}
                    </Typography>
                  </Box>

                  {/* Dismiss */}
                  <Tooltip title="Dismiss">
                    <IconButton
                      size="small"
                      onClick={(e) => handleDismiss(e, notif.id)}
                      sx={{
                        opacity: 0,
                        transition: 'opacity 0.15s ease',
                        width: 24,
                        height: 24,
                        '&:hover': { bgcolor: 'action.hover' },
                        '.MuiMenuItem-root:hover &': { opacity: 0.6 },
                      }}
                    >
                      <DeleteSweep sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </MenuItem>
              );
            })
          )}
        </Box>

        {notifications.length > 0 && (
          <>
            <Divider />
            <Box
              onClick={() => { handleClose(); navigate('/activity-log'); }}
              sx={{
                py: 1,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: 'action.hover' },
                transition: 'background-color 0.15s ease',
              }}
            >
              <Typography variant="body2" color="primary" fontWeight={600} sx={{ fontSize: '0.8rem' }}>
                View All Activity
              </Typography>
            </Box>
          </>
        )}
      </Menu>
    </>
  );
}
