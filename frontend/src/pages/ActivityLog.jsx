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
import { timeAgo } from '../utils/timeAgo';

const actionConfig = {
  created: { icon: <Add fontSize="small" />, color: 'success.main', bg: 'rgba(46,125,50,0.12)', label: 'Created' },
  updated: { icon: <Edit fontSize="small" />, color: 'primary.main', bg: 'rgba(26,115,232,0.12)', label: 'Updated' },
  status_changed: { icon: <CheckCircle fontSize="small" />, color: 'warning.main', bg: 'rgba(249,171,0,0.12)', label: 'Status Changed' },
  cancelled: { icon: <Cancel fontSize="small" />, color: 'error.main', bg: 'rgba(234,67,53,0.12)', label: 'Cancelled' },
  added_quote: { icon: <ShoppingCart fontSize="small" />, color: 'primary.main', bg: 'rgba(26,115,232,0.12)', label: 'Quote Added' },
  deleted_quote: { icon: <Delete fontSize="small" />, color: 'error.main', bg: 'rgba(234,67,53,0.12)', label: 'Quote Deleted' },
  issued_po: { icon: <CheckCircle fontSize="small" />, color: 'success.main', bg: 'rgba(46,125,50,0.12)', label: 'PO Issued' },
  invited_user: { icon: <PersonAdd fontSize="small" />, color: 'secondary.main', bg: 'rgba(147,52,230,0.12)', label: 'User Invited' },
  sent_quote_request: { icon: <Email fontSize="small" />, color: 'info.main', bg: 'rgba(33,150,243,0.12)', label: 'Quote Request Sent' },
  sent_quote_requests: { icon: <Email fontSize="small" />, color: 'info.main', bg: 'rgba(33,150,243,0.12)', label: 'Quote Requests Sent' },
  resent_quote_request: { icon: <Email fontSize="small" />, color: 'info.main', bg: 'rgba(33,150,243,0.12)', label: 'Quote Request Resent' },
  cancelled_quote_request: { icon: <Cancel fontSize="small" />, color: 'error.main', bg: 'rgba(234,67,53,0.12)', label: 'Quote Request Cancelled' },
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
      <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 2, color: 'text.secondary', textTransform: 'none', '&:hover': { bgcolor: 'action.hover' } }}>
        Back
      </Button>

      {/* Header Banner */}
      <Box sx={{
        background: (theme) => theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, rgba(138,180,248,0.08) 0%, rgba(100,181,246,0.04) 100%)'
          : 'linear-gradient(135deg, rgba(26,115,232,0.06) 0%, rgba(100,181,246,0.03) 100%)',
        borderRadius: 3,
        p: 3,
        mb: 3,
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 44,
          height: 44,
          borderRadius: 2,
          backgroundColor: 'primary.main',
          color: 'white',
        }}>
          <History />
        </Box>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, letterSpacing: '-0.02em' }}>
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
                    transition: 'background-color 0.15s, transform 0.15s ease',
                    '&:hover': { bgcolor: 'action.hover', transform: 'translateX(4px)' },
                  }}
                >
                  <Box sx={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar
                      src={getAvatarUrl(log.user?.name, 36)}
                      alt={log.user?.name || 'User avatar'}
                      sx={{ width: 36, height: 36 }}
                    />
                    <Avatar
                      alt="Action icon"
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
                      {timeAgo(log.createdAt)} · {log.user?.role}
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
