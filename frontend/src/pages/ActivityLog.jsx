import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, CircularProgress, Alert, Pagination,
  Avatar, Chip, IconButton, Tooltip, Button, Skeleton
} from '@mui/material';
import {
  ArrowBack, Add, Edit, Delete, ShoppingCart, Cancel, CheckCircle,
  Email, PersonAdd, History, Inbox
} from '@mui/icons-material';
import api from '../api';
import { getAvatarUrl } from '../utils/avatar';

const actionConfig = {
  created: { icon: <Add fontSize="small" />, color: 'success.main', bg: 'rgba(46,125,50,0.12)', label: 'Created' },
  updated: { icon: <Edit fontSize="small" />, color: 'primary.main', bg: 'rgba(26,115,232,0.12)', label: 'Updated' },
  status_changed: { icon: <CheckCircle fontSize="small" />, color: 'warning.main', bg: 'rgba(249,171,0,0.12)', label: 'Status Changed' },
  cancelled: { icon: <Cancel fontSize="small" />, color: 'error.main', bg: 'rgba(234,67,53,0.12)', label: 'Cancelled' },
  added_quote: { icon: <ShoppingCart fontSize="small" />, color: 'primary.main', bg: 'rgba(26,115,232,0.12)', label: 'Quote Added' },
  deleted_quote: { icon: <Delete fontSize="small" />, color: 'error.main', bg: 'rgba(234,67,53,0.12)', label: 'Quote Deleted' },
  issued_po: { icon: <CheckCircle fontSize="small" />, color: 'success.main', bg: 'rgba(46,125,50,0.12)', label: 'PO Issued' },
  invited_user: { icon: <PersonAdd fontSize="small" />, color: 'secondary.main', bg: 'rgba(147,52,230,0.12)', label: 'User Invited' },
};

export default function ActivityLog() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  useEffect(() => {
    let cancelled = false;
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/activity-logs?page=${page}&limit=15`);
        if (!cancelled) {
          setLogs(res.data.data);
          setPagination(res.data.pagination);
        }
      } catch (err) {
        if (!cancelled) setError('Failed to load activity logs');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchLogs();
    return () => { cancelled = true; };
  }, [page]);

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  // Auto-dismiss errors
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 8000);
    return () => clearTimeout(t);
  }, [error]);

  if (loading) {
    return (
      <Box sx={{ p: 2, animation: 'fadeIn 0.3s ease' }}>
        <Skeleton variant="text" width={200} height={32} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={300} height={20} sx={{ mb: 3 }} />
        {[1,2,3,4,5].map(i => (
          <Box key={i} sx={{ display: 'flex', gap: 2, mb: 2, p: 2 }}>
            <Skeleton variant="circular" width={36} height={36} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="40%" height={20} />
              <Skeleton variant="text" width="70%" height={16} />
              <Skeleton variant="text" width="20%" height={12} />
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ animation: 'fadeInUp 0.35s ease' }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 2, color: 'text.secondary', '&:hover': { bgcolor: 'action.hover' } }}>
        Back
      </Button>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <History sx={{ fontSize: 28, color: 'primary.main' }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            Activity Log
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track all system actions and changes
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
      )}

      {logs.length === 0 ? (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 8, animation: 'fadeIn 0.4s ease' }}>
              <Inbox sx={{ fontSize: 56, color: 'text.secondary', mb: 2, opacity: 0.4 }} />
              <Typography variant="h5" color="text.secondary" sx={{ mb: 1 }}>No activity yet</Typography>
              <Typography variant="body2" color="text.secondary">
                Activities will appear here as actions are performed
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            {logs.map((log, index) => {
              const config = actionConfig[log.action] || { icon: <History fontSize="small" />, color: 'text.secondary', bg: 'action.hover', label: log.action };
              return (
                <Box
                  key={log.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 2,
                    p: 2.5,
                    borderBottom: index < logs.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                    '&:hover': { bgcolor: 'action.hover' },
                    transition: 'background-color 0.15s, transform 0.15s ease',
                    '&:hover': { bgcolor: 'action.hover', transform: 'translateX(4px)' },
                  }}
                >
                  <Box sx={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar
                      src={getAvatarUrl(log.user?.name, 36)}
                      sx={{ width: 36, height: 36 }}
                    />
                    <Avatar
                      sx={{
                        position: 'absolute',
                        bottom: -4,
                        right: -4,
                        width: 20,
                        height: 20,
                        fontSize: '0.65rem',
                        bgcolor: config.bg,
                        color: config.color,
                        border: '2px solid',
                        borderColor: 'background.paper',
                      }}
                    >
                      {config.icon}
                    </Avatar>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body2" fontWeight={600}>
                        {log.user?.name || 'Unknown'}
                      </Typography>
                      <Chip
                        label={config.label}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          bgcolor: config.bg,
                          color: config.color,
                          fontWeight: 500,
                        }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {log.details}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {formatTime(log.createdAt)} · {log.user?.role}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </CardContent>
        </Card>
      )}

      {pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <Pagination
            count={pagination.totalPages}
            page={page}
            onChange={(e, v) => setPage(v)}
            color="primary"
            size="small"
          />
        </Box>
      )}
    </Box>
  );
}
