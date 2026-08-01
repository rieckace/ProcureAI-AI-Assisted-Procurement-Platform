import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Alert, IconButton, Tooltip,
  TextField, InputAdornment, LinearProgress, useTheme, MenuItem
} from '@mui/material';
import {
  Search, Visibility, LocalShipping, Receipt,
  CheckCircle, HourglassEmpty, Print as PrintIcon
} from '@mui/icons-material';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { fireConfetti } from '../utils/confetti';
import PrintPODialog from '../components/PrintPODialog';
import EmptyState from '../components/EmptyState';
import StatusChip from '../components/StatusChip';

// Which PO statuses should pulse (live/in-progress states)
const LIVE_PO_STATUSES = ['SENT_TO_VENDOR', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'];

export default function PurchaseOrders() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [printPO, setPrintPO] = useState(null);
  const [printLoading, setPrintLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const res = await api.get(`/purchase-orders?${params}`);
      setOrders(res.data.data || []);
    } catch (err) {
      setError('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Upgraded stat cards with icons + live pulse
  const poStats = [
    { label: 'Total POs', count: orders.length, color: 'primary.main', icon: <Receipt /> },
    { label: 'Pending Approval', count: orders.filter(o => o.status === 'PENDING_APPROVAL').length, color: 'warning.main', icon: <HourglassEmpty />, pulse: orders.some(o => o.status === 'PENDING_APPROVAL') },
    { label: 'In Transit', count: orders.filter(o => LIVE_PO_STATUSES.includes(o.status)).length, color: 'info.main', icon: <LocalShipping />, pulse: orders.some(o => LIVE_PO_STATUSES.includes(o.status)) },
    { label: 'Delivered', count: orders.filter(o => o.status === 'DELIVERED').length, color: 'success.main', icon: <CheckCircle /> },
  ];

  const handleApprovePO = async (po) => {
    if (!window.confirm(`Approve Purchase Order ${po.poNumber}? This will start delivery tracking.`)) return;
    try {
      await api.post(`/purchase-orders/${po.id}/approve`);
      showToast(`PO ${po.poNumber} approved`, 'success');
      fireConfetti(); // 🎉 PO approved
      fetchOrders();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to approve PO', 'error');
    }
  };

  const handlePOStatusChange = async (po, status, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    try {
      await api.post(`/purchase-orders/${po.id}/status`, { status });
      showToast(`PO ${po.poNumber} updated`, 'success');
      if (status === 'DELIVERED') fireConfetti(); // 🎉 delivery complete
      fetchOrders();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update PO', 'error');
    }
  };

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
              <Receipt sx={{ mr: 1, verticalAlign: 'middle' }} />
              Purchase Orders
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View and manage all purchase orders
            </Typography>
          </Box>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* Stats */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {poStats.map(stat => (
          <Card
            key={stat.label}
            sx={{
              flex: 1,
              minWidth: 130,
              position: 'relative',
              overflow: 'hidden',
              animation: stat.pulse ? 'pulse 2s ease-in-out infinite' : 'fadeInUp 0.4s ease',
              ...(stat.pulse ? { border: '2px solid', borderColor: 'warning.main' } : {}),
            }}
          >
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                <Box sx={{
                  width: 34, height: 34, borderRadius: 2, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: stat.color,
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                }}>
                  {stat.icon}
                </Box>
                <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ fontSize: '0.78rem', lineHeight: 1.3 }}>
                  {stat.label}
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={700} color={stat.color}>{stat.count}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small" placeholder="Search POs or items..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              sx={{ flex: 1, minWidth: 200 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
              }}
            />
            <TextField
              size="small" select value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="PENDING_APPROVAL">Pending Approval</MenuItem>
              <MenuItem value="APPROVED">Approved</MenuItem>
              <MenuItem value="SENT_TO_VENDOR">Sent to Vendor</MenuItem>
              <MenuItem value="IN_TRANSIT">In Transit</MenuItem>
              <MenuItem value="DELIVERED">Delivered</MenuItem>
              <MenuItem value="CANCELLED">Cancelled</MenuItem>
            </TextField>
          </Box>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {orders.length === 0 ? (
            <EmptyState
              icon={<Receipt sx={{ fontSize: 40 }} />}
              title="No purchase orders yet"
              description="Purchase orders will appear here once generated by the autonomous agent or officers"
            />
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>PO Number</strong></TableCell>
                    <TableCell><strong>Item</strong></TableCell>
                    <TableCell><strong>Vendor</strong></TableCell>
                    <TableCell align="right"><strong>Amount</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Delivery</strong></TableCell>
                    <TableCell align="right"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.map((po) => {
                    return (
                      <TableRow key={po.id} hover sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/pr/${po.purchaseRequestId}`)}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
                            {po.poNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {po.purchaseRequest?.itemName || 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {po.purchaseRequest?.category}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{po.vendor?.name || 'N/A'}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600}>
                            ${po.totalAmount?.toLocaleString() || '0'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <StatusChip status={po.status} pulse={LIVE_PO_STATUSES.includes(po.status)} />
                        </TableCell>
                        <TableCell>
                          {po.expectedDelivery ? (
                            <Typography variant="caption" color="text.secondary">
                              {new Date(po.expectedDelivery).toLocaleDateString()}
                            </Typography>
                          ) : (
                            <Typography variant="caption" color="text.disabled">N/A</Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {po.status === 'PENDING_APPROVAL' && (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={(e) => { e.stopPropagation(); handleApprovePO(po); }}
                              sx={{ borderRadius: 2, textTransform: 'none', mr: 0.5 }}
                            >
                              Approve
                            </Button>
                          )}
                          {po.status === 'APPROVED' && (
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              onClick={(e) => { e.stopPropagation(); handlePOStatusChange(po, 'SENT_TO_VENDOR', `Send PO ${po.poNumber} to ${po.vendor?.name || 'the vendor'}?`); }}
                              sx={{ borderRadius: 2, textTransform: 'none', mr: 0.5 }}
                            >
                              Send to Vendor
                            </Button>
                          )}
                          {['SENT_TO_VENDOR', 'CONFIRMED'].includes(po.status) && (
                            <Button
                              size="small"
                              variant="contained"
                              color="info"
                              onClick={(e) => { e.stopPropagation(); handlePOStatusChange(po, 'IN_TRANSIT', `Mark PO ${po.poNumber} as In Transit?`); }}
                              sx={{ borderRadius: 2, textTransform: 'none', mr: 0.5 }}
                            >
                              In Transit
                            </Button>
                          )}
                          {['IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(po.status) && (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={(e) => { e.stopPropagation(); handlePOStatusChange(po, 'DELIVERED', `Mark PO ${po.poNumber} as Delivered?`); }}
                              sx={{ borderRadius: 2, textTransform: 'none', mr: 0.5 }}
                            >
                              Delivered
                            </Button>
                          )}
                          {!['DELIVERED', 'CANCELLED'].includes(po.status) && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={(e) => { e.stopPropagation(); handlePOStatusChange(po, 'CANCELLED', `Cancel PO ${po.poNumber}?`); }}
                              sx={{ borderRadius: 2, textTransform: 'none', mr: 0.5 }}
                            >
                              Cancel
                            </Button>
                          )}
                          <Tooltip title="Print PO">
                            <IconButton size="small" disabled={printLoading} onClick={async (e) => {
                              e.stopPropagation();
                              setPrintLoading(true);
                              try {
                                const res = await api.get(`/purchase-orders/${po.id}`);
                                setPrintPO(res.data);
                              } catch {
                                setPrintPO(po); // fall back to list row data
                              } finally {
                                setPrintLoading(false);
                              }
                            }}>
                              <PrintIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/pr/${po.purchaseRequestId}`); }}>
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

      {/* Print PO Dialog */}
      <PrintPODialog open={Boolean(printPO)} onClose={() => setPrintPO(null)} po={printPO} />
    </Box>
  );
}
