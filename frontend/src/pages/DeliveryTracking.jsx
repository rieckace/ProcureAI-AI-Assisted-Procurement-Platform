import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Alert, IconButton, Tooltip,
  TextField, InputAdornment, LinearProgress, useTheme, MenuItem, Dialog,
  DialogTitle, DialogContent, DialogActions, Stepper, Step, StepLabel, StepIcon
} from '@mui/material';
import {
  Search, FilterAltOff, LocalShipping, CheckCircle, Cancel, Schedule,
  RadioButtonChecked, RadioButtonUnchecked
} from '@mui/icons-material';
import api from '../api';
import { useToast } from '../context/ToastContext';

const DELIVERY_STEPS = ['PREPARING', 'PROCESSING', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];

const STATUS_CONFIG = {
  PREPARING: { color: 'default', icon: <Box component="span" sx={{ fontSize: 16 }}>🔄</Box>, label: 'Preparing' },
  PROCESSING: { color: 'info', icon: <Box component="span" sx={{ fontSize: 16 }}>⚙️</Box>, label: 'Processing' },
  SHIPPED: { color: 'primary', icon: <Box component="span" sx={{ fontSize: 16 }}>📦</Box>, label: 'Shipped' },
  IN_TRANSIT: { color: 'info', icon: <Box component="span" sx={{ fontSize: 16 }}>🚚</Box>, label: 'In Transit' },
  OUT_FOR_DELIVERY: { color: 'warning', icon: <Box component="span" sx={{ fontSize: 16 }}>📬</Box>, label: 'Out for Delivery' },
  DELIVERED: { color: 'success', icon: <Box component="span" sx={{ fontSize: 16 }}>✅</Box>, label: 'Delivered' },
  FAILED: { color: 'error', icon: <Box component="span" sx={{ fontSize: 16 }}>❌</Box>, label: 'Failed' },
};

function DeliveryTimeline({ delivery }) {
  if (!delivery) return null;

  const currentIndex = DELIVERY_STEPS.indexOf(delivery.status);
  const isFailed = delivery.status === 'FAILED';

  return (
    <Box sx={{ width: '100%', py: 2 }}>
      <Stepper activeStep={currentIndex} alternativeLabel orientation="horizontal"
        sx={{
          '& .MuiStepLabel-label': { fontSize: '0.75rem', fontWeight: 500 },
          '& .MuiStepIcon-root': {
            fontSize: 24,
            color: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
            '&.Mui-active': { color: 'primary.main' },
            '&.Mui-completed': { color: 'success.main' },
          },
        }}>
        {DELIVERY_STEPS.map((step, i) => {
          const config = STATUS_CONFIG[step];
          const isCompleted = i <= currentIndex && !isFailed;
          const isActive = i === currentIndex && !isFailed;

          return (
            <Step key={step} completed={isCompleted} active={isActive}>
              <StepLabel
                StepIconComponent={() => (
                  <Box sx={{
                    width: 32, height: 32, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: isCompleted ? 'success.main' : isActive ? 'primary.main' : 'action.hover',
                    color: isCompleted || isActive ? 'white' : 'text.disabled',
                    fontSize: '0.9rem',
                    transition: 'all 0.3s ease',
                  }}>
                    {isCompleted ? '✓' : isActive ? '●' : '○'}
                  </Box>
                )}
              >
                {config?.label || step}
              </StepLabel>
            </Step>
          );
        })}
      </Stepper>

      {delivery.trackingNumber && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Chip
            label={`Tracking: ${delivery.trackingNumber}`}
            size="small"
            variant="outlined"
            color="primary"
          />
        </Box>
      )}

      {delivery.estimatedArrival && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
          {delivery.status === 'DELIVERED'
            ? `Delivered: ${new Date(delivery.actualArrival || delivery.estimatedArrival).toLocaleDateString()}`
            : `Estimated: ${new Date(delivery.estimatedArrival).toLocaleDateString()}`
          }
        </Typography>
      )}
    </Box>
  );
}

export default function DeliveryTrackingPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showOverdue, setShowOverdue] = useState(false);
  const [updateDialog, setUpdateDialog] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateTracking, setUpdateTracking] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (showOverdue) params.append('overdue', 'true');
      const res = await api.get(`/deliveries?${params}`);
      setDeliveries(res.data.data || []);
    } catch (err) {
      setError('Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showOverdue]);

  useEffect(() => { fetchDeliveries(); }, [fetchDeliveries]);

  const handleUpdateDelivery = async () => {
    if (!selectedDelivery) return;
    setSubmitting(true);
    try {
      await api.put(`/deliveries/${selectedDelivery.id}`, {
        status: updateStatus,
        trackingNumber: updateTracking,
      });
      showToast(`Delivery updated to ${updateStatus}`, 'success');
      setUpdateDialog(false);
      setSelectedDelivery(null);
      fetchDeliveries();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update delivery', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const overdueCount = deliveries.filter(d =>
    d.status !== 'DELIVERED' && d.status !== 'FAILED' &&
    d.estimatedArrival && new Date(d.estimatedArrival) < new Date()
  ).length;

  return (
    <Box sx={{ animation: 'fadeInUp 0.35s ease' }}>
      {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1 }} />}

      {/* Header */}
      <Box sx={{
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, rgba(138,180,248,0.08), transparent)'
          : 'linear-gradient(135deg, rgba(26,115,232,0.06), transparent)',
        borderRadius: 3, p: 3, mb: 3, border: '1px solid', borderColor: 'divider',
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, letterSpacing: '-0.02em' }}>
              <LocalShipping sx={{ mr: 1, verticalAlign: 'middle' }} />
              Delivery Tracking
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track incoming deliveries and update shipment status
            </Typography>
          </Box>
          <Button
            variant={showOverdue ? 'contained' : 'outlined'}
            color="warning"
            startIcon={<Schedule />}
            onClick={() => setShowOverdue(!showOverdue)}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            {showOverdue ? 'Show All' : `Overdue (${overdueCount})`}
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {overdueCount > 0 && !showOverdue && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}
          action={<Button size="small" color="inherit" onClick={() => setShowOverdue(true)}>View</Button>}>
          <strong>{overdueCount} delivery(ies)</strong> are past their estimated arrival date.
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <TextField
            size="small" select value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="PREPARING">Preparing</MenuItem>
            <MenuItem value="PROCESSING">Processing</MenuItem>
            <MenuItem value="SHIPPED">Shipped</MenuItem>
            <MenuItem value="IN_TRANSIT">In Transit</MenuItem>
            <MenuItem value="OUT_FOR_DELIVERY">Out for Delivery</MenuItem>
            <MenuItem value="DELIVERED">Delivered</MenuItem>
            <MenuItem value="FAILED">Failed</MenuItem>
          </TextField>
        </CardContent>
      </Card>

      {/* Delivery Cards */}
      {deliveries.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <LocalShipping sx={{ fontSize: 56, color: 'text.disabled', mb: 1, opacity: 0.5 }} />
          <Typography variant="h5" color="text.secondary">No deliveries to track</Typography>
          <Typography variant="body2" color="text.secondary">
            Deliveries will appear here once purchase orders are approved
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {deliveries.map((delivery) => {
            const config = STATUS_CONFIG[delivery.status] || { color: 'default', icon: '📦' };
            const isOverdue = delivery.status !== 'DELIVERED' && delivery.status !== 'FAILED' &&
              delivery.estimatedArrival && new Date(delivery.estimatedArrival) < new Date();

            return (
              <Card key={delivery.id} sx={{
                border: isOverdue ? '2px solid' : '1px solid',
                borderColor: isOverdue ? 'warning.main' : 'divider',
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: 3 },
              }}>
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        {delivery.purchaseOrder?.purchaseRequest?.itemName || 'Unknown Item'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Vendor: {delivery.purchaseOrder?.vendor?.name || 'N/A'}
                        {delivery.purchaseOrder?.poNumber && ` · PO: ${delivery.purchaseOrder.poNumber}`}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip
                        icon={config.icon}
                        label={config.label || delivery.status}
                        size="small"
                        color={config.color}
                        sx={{ fontWeight: 600 }}
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setSelectedDelivery(delivery);
                          setUpdateStatus(delivery.status);
                          setUpdateTracking(delivery.trackingNumber || '');
                          setUpdateDialog(true);
                        }}
                        sx={{ borderRadius: 2, textTransform: 'none' }}
                      >
                        Update
                      </Button>
                    </Box>
                  </Box>

                  <DeliveryTimeline delivery={delivery} />

                  {delivery.notes && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Notes: {delivery.notes}
                    </Typography>
                  )}

                  {isOverdue && (
                    <Alert severity="warning" sx={{ mt: 1, borderRadius: 1 }} dense>
                      Past expected delivery date
                    </Alert>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Update Delivery Dialog */}
      <Dialog open={updateDialog} onClose={() => setUpdateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Update Delivery Status</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField select label="Status" fullWidth value={updateStatus}
              onChange={(e) => setUpdateStatus(e.target.value)}>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <MenuItem key={key} value={key}>{cfg.icon} {cfg.label}</MenuItem>
              ))}
            </TextField>
            <TextField label="Tracking Number" fullWidth value={updateTracking}
              onChange={(e) => setUpdateTracking(e.target.value)}
              placeholder="e.g., UPS-1Z999AA10123456784" />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setUpdateDialog(false)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateDelivery} disabled={submitting} sx={{ borderRadius: 2 }}>
            {submitting ? 'Updating...' : 'Update Delivery'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
