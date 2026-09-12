import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, TextField, CircularProgress,
  Alert, Chip, Grid, Divider, Snackbar, AppBar, Toolbar
} from '@mui/material';
import { CheckCircle, Send, AccessTime, ErrorOutline } from '@mui/icons-material';
import api from '../api';

const URGENCY_COLORS = {
  low: 'success',
  medium: 'warning',
  high: 'error',
  critical: 'secondary',
};

export default function VendorQuoteForm() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ price: '', unitPrice: '', deliveryDays: '', notes: '' });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    let cancelled = false;
    const fetchQuoteRequest = async () => {
      try {
        const res = await api.get(`/quotes/vendor-quote/${token}`);
        if (!cancelled) {
          setData(res.data);
        }
      } catch (err) {
        if (!cancelled) setError('Failed to connect to server');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchQuoteRequest();
    return () => { cancelled = true; };
  }, [token]);

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (formErrors[field]) setFormErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const errs = {};
    const price = parseFloat(form.price);
    const unitPrice = parseFloat(form.unitPrice);
    const hasPrice = form.price && !isNaN(price) && price > 0;
    const hasUnitPrice = form.unitPrice && !isNaN(unitPrice) && unitPrice > 0;
    if (!hasPrice && !hasUnitPrice) errs.price = 'Enter a total price or a per-unit price';
    const days = parseInt(form.deliveryDays);
    if (!form.deliveryDays || isNaN(days) || days < 1) errs.deliveryDays = 'Enter delivery days (at least 1)';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        deliveryDays: parseInt(form.deliveryDays),
        notes: form.notes || undefined,
      };
      const unitPrice = parseFloat(form.unitPrice);
      const price = parseFloat(form.price);
      if (form.unitPrice && !isNaN(unitPrice) && unitPrice > 0) payload.unitPrice = unitPrice;
      if (form.price && !isNaN(price) && price > 0) payload.price = price;
      const res = await api.post(`/quotes/vendor-quote/${token}`, payload);
      setSubmitted(true);
      setResult(res.data.quote);
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || err.message || 'Submission failed', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>ProcureAI</Typography>
          </Toolbar>
        </AppBar>
        <Box sx={{ maxWidth: 600, mx: 'auto', p: 4, mt: 4 }}>
          <Card>
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <ErrorOutline sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>Unable to Load Quote Request</Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>{error}</Typography>
              <Alert severity="info" sx={{ borderRadius: 2, textAlign: 'left' }}>
                This link may have expired or already been used. Please contact the procurement team for assistance.
              </Alert>
            </CardContent>
          </Card>
        </Box>
      </Box>
    );
  }

  if (submitted && result) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>ProcureAI</Typography>
          </Toolbar>
        </AppBar>
        <Box sx={{ maxWidth: 600, mx: 'auto', p: 4, mt: 4 }}>
          <Card>
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Quote Submitted Successfully</Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Thank you, <strong>{result.vendorName}</strong>! Your quote has been received.
              </Typography>

              <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 3, mb: 3, textAlign: 'left' }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Your Quote</Typography>
                    <Typography variant="h5" fontWeight={700} color="primary.main">
                      ₹{result.price.toLocaleString('en-IN')}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Delivery Timeline</Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {result.deliveryDays} days
                    </Typography>
                  </Grid>
                </Grid>
                {result.notes && (
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                      Your Notes
                    </Typography>
                    <Typography variant="body2">{result.notes}</Typography>
                  </Box>
                )}
              </Box>

              <Alert severity="success" sx={{ borderRadius: 2, textAlign: 'left' }}>
                The procurement team will review your quote and get back to you if selected.
              </Alert>
            </CardContent>
          </Card>
        </Box>
      </Box>
    );
  }

  const pr = data.purchaseRequest;
  const daysLeft = Math.max(0, Math.ceil((new Date(data.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)));

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>ProcureAI</Typography>
          <Box sx={{ flex: 1 }} />
          <Chip
            icon={<AccessTime sx={{ fontSize: 14 }} />}
            label={`${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'inherit', fontWeight: 500 }}
          />
        </Toolbar>
      </AppBar>

      <Box sx={{ maxWidth: 700, mx: 'auto', p: 3, mt: 2 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            Submit Your Quote
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {pr.organizationName} is requesting a quote for the following item
          </Typography>
        </Box>

        {/* PR Details Card */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>{pr.itemName}</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Category</Typography>
                <Typography variant="body2" fontWeight={500}>{pr.category}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Quantity</Typography>
                <Typography variant="body2" fontWeight={500}>{pr.quantity} {pr.unit || 'units'}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Budget</Typography>
                <Typography variant="body2" fontWeight={500} color="primary.main">
                  ₹{pr.budget.toLocaleString('en-IN')}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Urgency</Typography>
                <Chip
                  label={pr.urgency}
                  size="small"
                  color={URGENCY_COLORS[pr.urgency] || 'default'}
                  sx={{ textTransform: 'capitalize', mt: 0.25 }}
                />
              </Grid>
            </Grid>
            {pr.justification && (
              <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                  Justification
                </Typography>
                <Typography variant="body2">{pr.justification}</Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Quote Form */}
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Your Proposal</Typography>
            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Total Price (₹)"
                    type="number"
                    value={form.price}
                    onChange={(e) => { setForm(p => ({ ...p, price: e.target.value, unitPrice: '' })); if (formErrors.price) setFormErrors(p => ({ ...p, price: '' })); }}
                    error={!!formErrors.price}
                    helperText={formErrors.price}
                    inputProps={{ min: 0, step: 0.01 }}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Delivery Timeline (days)"
                    type="number"
                    value={form.deliveryDays}
                    onChange={handleChange('deliveryDays')}
                    error={!!formErrors.deliveryDays}
                    helperText={formErrors.deliveryDays}
                    inputProps={{ min: 1 }}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={`Unit Price (₹ per ${pr.unit || 'unit'})`}
                    type="number"
                    value={form.unitPrice}
                    onChange={(e) => { setForm(p => ({ ...p, unitPrice: e.target.value, price: '' })); if (formErrors.price) setFormErrors(p => ({ ...p, price: '' })); }}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Additional Notes (optional)"
                    value={form.notes}
                    onChange={handleChange('notes')}
                    placeholder="Any terms, conditions, or notes about your proposal..."
                  />
                </Grid>
              </Grid>

              {(form.unitPrice || (form.price && form.deliveryDays)) && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    {pr.quantity} {pr.unit || 'unit'}s
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {form.unitPrice
                      ? `₹${parseFloat(form.unitPrice).toLocaleString()} × ${pr.quantity} = ₹${(parseFloat(form.unitPrice) * pr.quantity).toLocaleString()} total`
                      : `₹${(parseFloat(form.price || 0) / pr.quantity).toFixed(2)} per ${pr.unit || 'unit'}`}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 3 }} />

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <Send />}
                disabled={submitting}
                sx={{ borderRadius: 2, py: 1.5, fontWeight: 600 }}
              >
                {submitting ? 'Submitting Quote...' : 'Submit Quote'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
