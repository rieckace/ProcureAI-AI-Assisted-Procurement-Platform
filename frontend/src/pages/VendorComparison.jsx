import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, Alert, Chip,
  LinearProgress, Divider, Grid, Snackbar, IconButton, Tooltip
} from '@mui/material';
import {
  ArrowBack, SmartToy, EmojiEvents, CheckCircle, OpenInNew,
  TrendingDown, LocalShipping, Star, Shield
} from '@mui/icons-material';
import api from '../api';

const COMPLETED_STATUSES = ['ordered', 'delivered'];

export default function VendorComparison() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [poLoading, setPoLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    let cancelled = false;
    const fetchComparison = async () => {
      try {
        const res = await api.get(`/purchase-requests/${id}/recommendation`);
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || 'Failed to load comparison');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchComparison();
    return () => { cancelled = true; };
  }, [id]);

  const storeEmailLocally = (url, subject) => {
    if (!url) return;
    const email = { id: Date.now(), subject, previewUrl: url, sentAt: new Date().toISOString() };
    const existing = JSON.parse(localStorage.getItem('sentEmails') || '[]');
    existing.unshift(email);
    localStorage.setItem('sentEmails', JSON.stringify(existing.slice(0, 20)));
  };

  const handleIssuePO = async (vendor) => {
    setPoLoading(true);
    try {
      const res = await api.post(`/purchase-requests/${id}/issue-po`, {
        vendorId: vendor.vendorId
      });
      storeEmailLocally(res.data.etherealUrl, `Purchase Order: ${data?.purchaseRequest?.itemName}`);
      setToast({
        open: true,
        message: `✅ Purchase order issued to ${res.data.vendorName}!`,
        severity: 'success',
        etherealUrl: res.data.etherealUrl,
      });
    } catch (err) {
      setToast({
        open: true,
        message: err.response?.data?.error || 'Failed to issue PO',
        severity: 'error'
      });
    } finally {
      setPoLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)}>Go Back</Button>
      </Box>
    );
  }

  if (!data) return null;

  const { purchaseRequest: pr, rankedVendors, recommendation, costAnalysis } = data;
  const topVendor = rankedVendors?.[0];
  const isCompleted = COMPLETED_STATUSES.includes(pr.status);

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate(`/pr/${id}`)} sx={{ mb: 3, color: 'text.secondary' }}>
        Back to Request Details
      </Button>

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          Vendor Comparison
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {pr.itemName} — {pr.quantity} units, Budget: ${pr.budget.toLocaleString()}
          {pr.status && (
            <Chip
              label={pr.status}
              size="small"
              sx={{ ml: 1, textTransform: 'capitalize' }}
              color={isCompleted ? 'success' : 'default'}
            />
          )}
        </Typography>
      </Box>

      {/* Cost Savings Banner */}
      {costAnalysis && (
        <Card sx={{ mb: 3, bgcolor: 'success.main', color: 'success.contrastText' }}>
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <TrendingDown sx={{ fontSize: 32 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>Potential Cost Savings</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  ${costAnalysis.potentialSavings.toLocaleString()}
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.3)' }} />
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>Avg. Vendor Price</Typography>
                <Typography variant="h6" fontWeight={600}>${costAnalysis.averagePrice.toLocaleString()}</Typography>
              </Box>
              <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.3)' }} />
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>Budget Status</Typography>
                <Typography variant="h6" fontWeight={600}>
                  {costAnalysis.budgetComparison}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* AI Recommendation */}
      <Card sx={{ mb: 3, border: '2px solid', borderColor: 'primary.main', position: 'relative', overflow: 'visible' }}>
        <Box
          sx={{
            position: 'absolute', top: -12, left: 20,
            bgcolor: 'primary.main', color: 'white',
            px: 1.5, py: 0.5, borderRadius: 1,
            display: 'flex', alignItems: 'center', gap: 0.5,
          }}
        >
          <SmartToy sx={{ fontSize: 16 }} />
          <Typography variant="caption" fontWeight={600}>AI RECOMMENDATION</Typography>
        </Box>
        <CardContent sx={{ p: 3, pt: 3.5 }}>
          {recommendation?.fallback && (
            <Chip
              label="Fallback Mode - Groq API not configured"
              size="small"
              color="warning"
              sx={{ mb: 1.5 }}
            />
          )}
          <Typography variant="body1" sx={{ lineHeight: 1.8, color: 'text.primary', fontSize: '1rem' }}>
            {recommendation?.explanation || 'No recommendation available'}
          </Typography>

          {topVendor && (
            <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                icon={<EmojiEvents />}
                label={`Top Pick: ${topVendor.vendorName}`}
                color="primary"
                sx={{ fontWeight: 600 }}
              />
              <Chip
                icon={<TrendingDown />}
                label={`$${topVendor.price.toLocaleString()}`}
                variant="outlined"
              />
              <Chip
                icon={<LocalShipping />}
                label={`${topVendor.deliveryDays} days delivery`}
                variant="outlined"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Ranked Vendors */}
      <Typography variant="h6" sx={{ mb: 2 }}>Ranked Vendors</Typography>

      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Rank</TableCell>
                  <TableCell>Vendor</TableCell>
                  <TableCell align="center">Price (35%)</TableCell>
                  <TableCell align="center">Delivery (20%)</TableCell>
                  <TableCell align="center">Reliability (30%)</TableCell>
                  <TableCell align="center">Rating (15%)</TableCell>
                  <TableCell align="center">Total Score</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rankedVendors?.map((v, i) => (
                  <TableRow
                    key={v.vendorId}
                    hover
                    sx={i === 0 ? {
                      bgcolor: 'action.hover',
                    } : {}}
                  >
                    <TableCell>
                      <Chip
                        label={`#${i + 1}`}
                        size="small"
                        color={i === 0 ? 'primary' : i === 1 ? 'default' : 'default'}
                        variant={i === 0 ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 700, minWidth: 40 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={i === 0 ? 700 : 500}>
                        {v.vendorName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {v.category} • {v.onTimeDelivery}% on-time
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={500}>${v.price.toLocaleString()}</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={(v.scores.price / 35) * 100}
                        sx={{ mt: 0.5, height: 4, borderRadius: 2, bgcolor: 'action.hover' }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">{v.deliveryDays}d</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={(v.scores.delivery / 20) * 100}
                        sx={{ mt: 0.5, height: 4, borderRadius: 2, bgcolor: 'action.hover' }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">{v.onTimeDelivery}%</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={(v.scores.reliability / 30) * 100}
                        sx={{ mt: 0.5, height: 4, borderRadius: 2, bgcolor: 'action.hover' }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        <Star sx={{ fontSize: 14, color: 'warning.main' }} />
                        <Typography variant="body2">{v.rating}</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(v.scores.rating / 15) * 100}
                        sx={{ mt: 0.5, height: 4, borderRadius: 2, bgcolor: 'action.hover' }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          color: i === 0 ? 'primary.main' : 'text.primary',
                        }}
                      >
                        {v.scores.total}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">/ 100</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant={i === 0 ? 'contained' : 'outlined'}
                        color="success"
                        startIcon={<CheckCircle />}
                        onClick={() => handleIssuePO(v)}
                        disabled={poLoading || isCompleted}
                        sx={{ borderRadius: 2, whiteSpace: 'nowrap' }}
                      >
                        {isCompleted ? 'Completed' : poLoading ? <CircularProgress size={16} /> : 'Issue PO'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Score Breakdown */}
      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Scoring Methodology</Typography>
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {[
              { icon: <TrendingDown />, label: 'Price', weight: '35%', desc: 'Lower prices score higher. Normalized against the highest quote.', color: '#1a73e8' },
              { icon: <LocalShipping />, label: 'Delivery Time', weight: '20%', desc: 'Faster delivery scores higher. Normalized against longest delivery.', color: '#34a853' },
              { icon: <Shield />, label: 'Reliability', weight: '30%', desc: 'Based on on-time delivery rate (70%) and low defect rate (30%).', color: '#f9ab00' },
              { icon: <Star />, label: 'Rating', weight: '15%', desc: 'Vendor rating out of 5, normalized to a 15-point scale.', color: '#ea4335' },
            ].map((metric) => (
              <Grid item xs={12} sm={6} key={metric.label}>
                <Box sx={{ display: 'flex', gap: 1.5, p: 2, bgcolor: 'action.hover', borderRadius: 2, height: '100%' }}>
                  <Box sx={{ color: metric.color }}>{metric.icon}</Box>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {metric.label} <Chip label={metric.weight} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{metric.desc}</Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast.severity}
          sx={{ borderRadius: 2, minWidth: 300 }}
          action={
            toast.etherealUrl ? (
              <Tooltip title="View in Ethereal">
                <IconButton size="small" color="inherit" href={toast.etherealUrl} target="_blank">
                  <OpenInNew fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null
          }
        >
          {toast.message}
          {toast.etherealUrl && (
            <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
              <a href={toast.etherealUrl} target="_blank" rel="noopener" style={{ color: 'inherit' }}>View Email</a>
            </Typography>
          )}
        </Alert>
      </Snackbar>
    </Box>
  );
}
