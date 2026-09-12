import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Alert, IconButton, Tooltip,
  LinearProgress, useTheme, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField
} from '@mui/material';
import {
  SmartToy, CheckCircle, Cancel, HourglassEmpty, Visibility,
  ThumbUp, ThumbDown, History, Refresh, Schedule
} from '@mui/icons-material';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { fireConfetti } from '../utils/confetti';
import PipelineTimeline from '../components/PipelineTimeline';
import EmptyState from '../components/EmptyState';
import { renderMarkdown } from '../utils/renderMarkdown';

const PIPELINE_STATUS_COLORS = {
  PROCESSING: { color: 'info', label: 'Processing' },
  AWAITING_APPROVAL: { color: 'warning', label: 'Awaiting Approval' },
  APPROVED: { color: 'success', label: 'Approved' },
  REJECTED: { color: 'error', label: 'Rejected' },
  COMPLETED: { color: 'success', label: 'Completed' },
  FAILED: { color: 'error', label: 'Failed' },
};

export default function AgentDashboard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approveDialog, setApproveDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(timer);
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/agent/history?limit=50');
      setPipelines(res.data.data || []);
      setLastUpdated(Date.now());
    } catch (err) {
      setError('Failed to load agent history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  useEffect(() => {
    const timer = setInterval(fetchHistory, 45000);
    return () => clearInterval(timer);
  }, [fetchHistory]);

  const handleApprove = async () => {
    if (!selectedPipeline) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/agent/approve/${selectedPipeline.id}`);
      showToast(res.data.message || 'Approved successfully!', 'success');
      fireConfetti(); // 🎉 celebrate agent completion
      setApproveDialog(false);
      setSelectedPipeline(null);
      fetchHistory();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to approve', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPipeline) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/agent/reject/${selectedPipeline.id}`, { reason: rejectReason });
      showToast(res.data.message || 'Rejected', 'info');
      setRejectDialog(false);
      setRejectReason('');
      setSelectedPipeline(null);
      fetchHistory();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to reject', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const awaitingApproval = pipelines.filter(p => p.status === 'AWAITING_APPROVAL');
  const completed = pipelines.filter(p => p.status === 'COMPLETED');
  const failed = pipelines.filter(p => p.status === 'FAILED' || p.status === 'REJECTED');

  return (
    <Box sx={{ animation: 'fadeInUp 0.35s ease' }}>
      {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1 }} />}

      {/* Header */}
      <Box sx={{
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, rgba(165,180,252,0.08), transparent)'
          : 'linear-gradient(135deg, rgba(99,102,241,0.06), transparent)',
        borderRadius: 3, p: 3, mb: 3, border: '1px solid', borderColor: 'divider',
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, letterSpacing: '-0.02em' }}>
              <SmartToy sx={{ mr: 1, verticalAlign: 'middle' }} />
              Procura Agent Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Monitor autonomous procurement agent activity
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Chip
              size="small"
              variant="outlined"
              icon={<Schedule fontSize="small" />}
              label={`Auto-refreshes every 45s · ${lastUpdated ? `updated ${Math.max(0, Math.round((Date.now() - lastUpdated) / 1000))}s ago` : 'loading…'}`}
              sx={{ color: 'text.secondary', borderColor: 'divider', borderRadius: 1, fontSize: '0.7rem' }}
            />
            <Button variant="outlined" startIcon={<Refresh />} onClick={fetchHistory}
              sx={{ borderRadius: 2, textTransform: 'none' }}>
              Refresh
            </Button>
          </Box>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* Stats */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Requests', count: pipelines.length, color: 'primary.main' },
          { label: 'Awaiting Approval', count: awaitingApproval.length, color: 'warning.main', pulse: awaitingApproval.length > 0 },
          { label: 'Completed', count: completed.length, color: 'success.main' },
          { label: 'Failed/Rejected', count: failed.length, color: 'error.main' },
        ].map(stat => (
          <Card key={stat.label} sx={{
            flex: 1, minWidth: 130,
            animation: stat.pulse ? 'pulse 2s ease-in-out infinite' : 'none',
          }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ mb: 0.5, fontSize: '0.8rem' }}>
                {stat.label}
              </Typography>
              <Typography variant="h4" fontWeight={700} color={stat.color}>{stat.count}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Pending Approvals */}
      {awaitingApproval.length > 0 && (
        <Card sx={{ mb: 3, border: '2px solid', borderColor: 'warning.main' }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <HourglassEmpty color="warning" />
              Pending Approvals ({awaitingApproval.length})
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {awaitingApproval.map(p => (
                <Box key={p.id} sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  p: 2, borderRadius: 2, bgcolor: 'action.hover', flexWrap: 'wrap', gap: 1,
                }}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {p.purchaseRequest?.itemName || 'Unknown Item'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      by {p.user?.name || 'Unknown'} · {new Date(p.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small" variant="contained" color="success"
                      startIcon={<ThumbUp />}
                      onClick={() => { setSelectedPipeline(p); setApproveDialog(true); }}
                      sx={{ borderRadius: 2, textTransform: 'none' }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="small" variant="outlined" color="error"
                      startIcon={<ThumbDown />}
                      onClick={() => { setSelectedPipeline(p); setRejectReason(''); setRejectDialog(true); }}
                      sx={{ borderRadius: 2, textTransform: 'none' }}
                    >
                      Reject
                    </Button>
                    <IconButton size="small" onClick={() => { setSelectedPipeline(p); setDetailDialog(true); }}>
                      <Visibility />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Pipeline History */}
      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {pipelines.length === 0 ? (
            <EmptyState
              icon={<SmartToy sx={{ fontSize: 40 }} />}
              title="No agent activity yet"
              description="Ask Procura to process a procurement request to see agent activity here"
            />
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Item</strong></TableCell>
                    <TableCell><strong>Requester</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Steps</strong></TableCell>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell align="right"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pipelines.map(p => {
                    const statusCfg = PIPELINE_STATUS_COLORS[p.status] || { color: 'default', label: p.status };
                    const steps = typeof p.stepsCompleted === 'string' ? JSON.parse(p.stepsCompleted || '[]') : (p.stepsCompleted || []);
                    const completedSteps = steps.filter(s => s.status === 'completed' || s.status === 'approved').length;

                    return (
                      <TableRow key={p.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {p.purchaseRequest?.itemName || (p.intent?.itemName) || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{p.user?.name || 'Unknown'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={statusCfg.label}
                            size="small"
                            color={statusCfg.color}
                            sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {completedSteps}/{steps.length} steps
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => { setSelectedPipeline(p); setDetailDialog(true); }}>
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={approveDialog} onClose={() => setApproveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm Approval</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to approve this procurement request?
            This will generate a Purchase Order.
          </Typography>
          {selectedPipeline?.intent && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="body2"><strong>Item:</strong> {selectedPipeline.intent.itemName}</Typography>
              {selectedPipeline.intent.quantity && (
                <Typography variant="body2"><strong>Quantity:</strong> {selectedPipeline.intent.quantity}</Typography>
              )}
              {selectedPipeline.intent.department && (
                <Typography variant="body2"><strong>Department:</strong> {selectedPipeline.intent.department}</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setApproveDialog(false)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleApprove} disabled={submitting} sx={{ borderRadius: 2 }}>
            {submitting ? 'Processing...' : 'Approve & Generate PO'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog} onClose={() => setRejectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Reject Recommendation</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth multiline rows={3}
            label="Reason (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Why are you rejecting this recommendation?"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRejectDialog(false)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleReject} disabled={submitting} sx={{ borderRadius: 2 }}>
            {submitting ? 'Rejecting...' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Pipeline Details
          {selectedPipeline?.purchaseRequest?.id && (
            <Button size="small" sx={{ ml: 2 }} onClick={() => {
              setDetailDialog(false);
              navigate(`/pr/${selectedPipeline.purchaseRequest.id}`);
            }}>
              View PR
            </Button>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedPipeline && (
            <Box>
              {/* Intent */}
              {selectedPipeline.intent && (
                <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>📋 Parsed Intent</Typography>
                  <Typography variant="body2">
                    Item: <strong>{selectedPipeline.intent.itemName}</strong>
                    {selectedPipeline.intent.quantity && ` · Qty: ${selectedPipeline.intent.quantity}`}
                    {selectedPipeline.intent.category && ` · ${selectedPipeline.intent.category}`}
                    {selectedPipeline.intent.budget && ` · Budget: ₹${selectedPipeline.intent.budget.toLocaleString('en-IN')}`}
                    {selectedPipeline.intent.urgency && ` · Urgency: ${selectedPipeline.intent.urgency}`}
                  </Typography>
                </Box>
              )}

              {/* AI Recommendation */}
              {selectedPipeline.recommendation?.explanation && (
                <Box sx={{
                  mb: 2, p: 2, borderRadius: 2,
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(76,175,80,0.08)' : 'rgba(76,175,80,0.06)',
                  border: '1px solid', borderColor: 'success.main',
                }}>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>🤖 AI Recommendation</Typography>
                  <Box sx={{ '& ul, & ol': { my: 0.5 } }}>
                    {renderMarkdown(selectedPipeline.recommendation.explanation)}
                  </Box>
                </Box>
              )}

              {/* Scored Vendors */}
              {selectedPipeline.recommendation?.scoredVendors?.length > 0 && (
                <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>🏆 Vendor Rankings</Typography>
                  {selectedPipeline.recommendation.scoredVendors.slice(0, 5).map((v, i) => (
                    <Box key={v.vendorId || i} sx={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      py: 0.75, borderBottom: '1px dashed', borderColor: 'divider',
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={`#${i + 1}`} size="small"
                          color={i === 0 ? 'success' : 'default'}
                          sx={{ fontWeight: 600, minWidth: 34, fontSize: '0.65rem' }} />
                        <Typography variant="body2" fontWeight={i === 0 ? 600 : 400}>
                          {v.vendorName}
                        </Typography>
                      </Box>
                      <Typography variant="body2">
                        ₹{v.price?.toLocaleString('en-IN')} · {v.deliveryDays}d ·{' '}
                        <strong>{v.total}/100</strong>
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}

              {/* Animated Steps Timeline */}
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>🔄 Pipeline Steps</Typography>
              {(() => {
                let steps = [];
                try {
                  steps = typeof selectedPipeline.stepsCompleted === 'string'
                    ? JSON.parse(selectedPipeline.stepsCompleted || '[]')
                    : (selectedPipeline.stepsCompleted || []);
                } catch { steps = []; }
                return (
                  <PipelineTimeline steps={steps} status={selectedPipeline.status} />
                );
              })()}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDetailDialog(false)} sx={{ borderRadius: 2 }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
