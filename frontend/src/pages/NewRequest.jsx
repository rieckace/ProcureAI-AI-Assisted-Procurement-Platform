import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, TextField, Button, MenuItem,
  Alert, CircularProgress, InputAdornment, Grid, Chip, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, Tooltip
} from '@mui/material';
import {
  ArrowBack, Send, Inventory, CheckCircleOutline, RadioButtonUnchecked,
  WarningAmber, InfoOutlined, Storefront, CheckCircle
} from '@mui/icons-material';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { CATEGORIES, UNITS, URGENCY_COLORS } from '../constants';

const urgencies = [
  { value: 'low', label: 'Low - Can wait' },
  { value: 'medium', label: 'Medium - Within month' },
  { value: 'high', label: 'High - Within 2 weeks' },
  { value: 'critical', label: 'Critical - Immediate' },
];

export default function NewRequest() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const timerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(() => {
    // Load saved draft from localStorage
    try {
      const saved = localStorage.getItem('new_request_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.itemName || parsed.justification) return parsed;
      }
    } catch { /* ignore */ }
    return {
      itemName: '', category: '', quantity: '', unit: 'unit', budget: '',
      urgency: 'medium', justification: '',
    };
  });
  const [errors, setErrors] = useState({});
  const [draftSaved, setDraftSaved] = useState(false);
  const draftTimerRef = useRef(null);

  // Stock guardrail
  const [inventoryItems, setInventoryItems] = useState([]);
  const [stockCheck, setStockCheck] = useState({ status: 'idle', match: null });
  const [stockDialog, setStockDialog] = useState(false);

  // Smart defaults based on category
  const categoryDefaults = {
    'Rice': { itemName: 'Basmati Rice (50kg bags)', unit: 'kg' },
    'Flour': { itemName: 'Whole Wheat Flour (25kg bags)', unit: 'kg' },
    'Oil': { itemName: 'Refined Cooking Oil (15L cans)', unit: 'litre' },
    'Packaging': { itemName: 'PP Packaging Bags (25kg)', unit: 'unit' },
    'Equipment': { itemName: 'Milling Spare Part - ', unit: 'unit' },
    'Services': { itemName: 'Consulting Services - ', unit: 'unit' },
    'Logistics': { itemName: 'Freight / Transport - ', unit: 'unit' },
  };

  // Load inventory catalog once for live stock matching
  useEffect(() => {
    api.get('/inventory?limit=100').then(res => {
      setInventoryItems(res.data.data || []);
    }).catch(() => {});
  }, []);

  // Debounced stock match against item name + quantity
  useEffect(() => {
    const qty = parseInt(form.quantity);
    if (!form.itemName?.trim() || !(qty > 0)) {
      setStockCheck({ status: 'idle', match: null });
      return;
    }
    const timer = setTimeout(() => {
      const q = form.itemName.trim().toLowerCase();
      const match = inventoryItems.find(it =>
        it.itemName.toLowerCase().includes(q) ||
        q.includes(it.itemName.toLowerCase())
      );
      if (!match) {
        setStockCheck({ status: 'none', match: null });
        return;
      }
      const available = match.quantity;
      setStockCheck({
        status: available >= qty ? 'full' : available > 0 ? 'partial' : 'out',
        match,
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [form.itemName, form.quantity, form.category, inventoryItems]);

  const handleUnitChange = (newUnit) => {
    setForm(prev => ({ ...prev, unit: newUnit }));
  };

  // Calculate form completion progress
  const formProgress = useMemo(() => {
    let completed = 0;
    const total = 5;
    if (form.itemName?.trim()) completed++;
    if (form.category) completed++;
    if (form.quantity && parseInt(form.quantity) > 0) completed++;
    if (form.budget && parseFloat(form.budget) > 0) completed++;
    if (form.urgency) completed++;
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  }, [form]);

  // Helper to render a readable quantity label (e.g. "500 bags")
  const quantityLabel = useMemo(() => {
    if (!form.quantity || parseInt(form.quantity) < 1) return '';
    const qty = parseInt(form.quantity);
    return `${qty} ${form.unit || 'unit'}${form.unit === 'unit' && qty !== 1 ? 's' : ''}`;
  }, [form.quantity, form.unit]);

  const handleCategoryChange = (e) => {
    const newCat = e.target.value;
    const defaults = categoryDefaults[newCat];
    if (defaults && !form.itemName) {
      // Pre-fill item name + unit hint when category is selected
      setForm(prev => ({ ...prev, category: newCat, itemName: defaults.itemName, unit: defaults.unit || 'unit' }));
    } else {
      setForm(prev => ({ ...prev, category: newCat }));
    }
    if (errors.category) setErrors(prev => ({ ...prev, category: '' }));
  };

  // Auto-save draft to localStorage every 2 seconds when form changes
  useEffect(() => {
    clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      const hasContent = form.itemName || form.category || form.quantity || form.budget || form.justification;
      if (hasContent) {
        localStorage.setItem('new_request_draft', JSON.stringify(form));
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 2000);
      }
    }, 2000);
    return () => clearTimeout(draftTimerRef.current);
  }, [form]);

  // Clear draft on successful submit
  const clearDraft = () => {
    localStorage.removeItem('new_request_draft');
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.itemName.trim()) newErrors.itemName = 'Item name is required';
    if (!form.category) newErrors.category = 'Category is required';
    if (!form.quantity || parseInt(form.quantity) < 1) newErrors.quantity = 'Valid quantity is required';
    if (!form.budget || parseFloat(form.budget) < 1) newErrors.budget = 'Valid budget is required';
    if (!form.urgency) newErrors.urgency = 'Urgency is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const doSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('/purchase-requests', form);
      clearDraft();
      showToast('Purchase request created successfully!', 'success');
      timerRef.current = setTimeout(() => navigate('/manager-dashboard'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (stockCheck.status === 'full') {
      setStockDialog(true);
      return;
    }
    await doSubmit();
  };

  // Auto-dismiss errors
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 8000);
    return () => clearTimeout(t);
  }, [error]);

  const stockBanner = stockCheck.status === 'full' ? (
    <Alert
      severity="success"
      icon={<Storefront />}
      sx={{ mb: 2, borderRadius: 2 }}
      action={
        <Button size="small" color="inherit" onClick={() => navigate('/inventory')}>
          View Stock
        </Button>
      }
    >
      Available in stock — <strong>{stockCheck.match.itemName}</strong> ({stockCheck.match.quantity}{' '}
      {stockCheck.match.unit}s on hand). You can fulfill this from existing inventory instead of raising a request.
    </Alert>
  ) : stockCheck.status === 'partial' ? (
    <Alert
      severity="warning"
      icon={<WarningAmber />}
      sx={{ mb: 2, borderRadius: 2 }}
      action={
        <Button size="small" color="inherit" onClick={() => navigate('/inventory')}>
          View Stock
        </Button>
      }
    >
      Only <strong>{stockCheck.match.quantity} {stockCheck.match.unit}s</strong> of "{stockCheck.match.itemName}" in
      stock — not enough for {quantityLabel}. Consider this along with the request.
    </Alert>
  ) : stockCheck.status === 'out' ? (
    <Alert severity="warning" icon={<WarningAmber />} sx={{ mb: 2, borderRadius: 2 }}>
      "{stockCheck.match.itemName}" is currently out of stock — this request makes sense to raise.
    </Alert>
  ) : stockCheck.status === 'none' ? (
    <Alert severity="info" icon={<InfoOutlined />} sx={{ mb: 2, borderRadius: 2 }}>
      No existing stock found for this item — a new purchase request is appropriate.
    </Alert>
  ) : null;

  const urgencyMeta = URGENCY_COLORS[form.urgency] || {};

  return (
    <Box sx={{ animation: 'fadeInUp 0.35s ease' }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/manager-dashboard')}
        sx={{ mb: 3, color: 'text.secondary', textTransform: 'none', '&:hover': { bgcolor: 'action.hover' } }}
      >
        Back to Dashboard
      </Button>

      {/* Header Banner */}
      <Box sx={{
        background: (theme) => theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, rgba(129,140,248,0.08) 0%, rgba(99,102,241,0.04) 100%)'
          : 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(129,140,248,0.03) 100%)',
        borderRadius: 3,
        p: 3,
        mb: 3,
        border: '1px solid',
        borderColor: 'divider',
      }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, letterSpacing: '-0.02em' }}>
          New Purchase Request
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Submit a new procurement request — we'll flag it if the item is already in stock
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
      )}

      {/* Form Progress Indicator */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: 120 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" fontWeight={600} color="text.secondary">
                  Form Completion
                </Typography>
                <Typography variant="caption" fontWeight={600} color={formProgress.percentage === 100 ? 'success.main' : 'primary.main'}>
                  {formProgress.completed}/{formProgress.total}
                </Typography>
              </Box>
              <Box sx={{ width: '100%', height: 6, bgcolor: 'action.hover', borderRadius: 3, overflow: 'hidden' }}>
                <Box sx={{
                  width: `${formProgress.percentage}%`,
                  height: '100%',
                  borderRadius: 3,
                  transition: 'width 0.4s ease',
                  background: formProgress.percentage === 100
                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                    : 'linear-gradient(90deg, #6366f1, #818cf8)',
                }} />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
              {['Item', 'Category', 'Qty', 'Budget', 'Urgency'].map((label, i) => {
                const filled = i === 0 ? !!form.itemName?.trim()
                  : i === 1 ? !!form.category
                  : i === 2 ? (form.quantity && parseInt(form.quantity) > 0)
                  : i === 3 ? (form.budget && parseFloat(form.budget) > 0)
                  : !!form.urgency;
                return (
                  <Box key={label} title={filled ? `${label} ✓` : `Fill in ${label}`} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {filled
                        ? <CheckCircleOutline sx={{ fontSize: 16, color: 'success.main' }} />
                        : <RadioButtonUnchecked sx={{ fontSize: 16, color: 'text.disabled' }} />
                      }
                      <Typography variant="caption" color={filled ? 'success.main' : 'text.disabled'} sx={{ fontWeight: 500 }}>
                        {label}
                      </Typography>
                    </Box>
                );
              })}
            </Box>
            {draftSaved && (
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', animation: 'fadeIn 0.3s ease' }}>
                Draft saved
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      {stockBanner}

      <Grid container spacing={3} alignItems="flex-start">
        <Grid item xs={12} lg={8}>
          <Card sx={{ transition: 'box-shadow 0.2s ease', '&:hover': { boxShadow: (t) => t.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.1)' } }}>
            <CardContent sx={{ p: 3 }}>
              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Item Name"
                  placeholder="e.g., Dell UltraSharp 27-inch Monitor"
                  value={form.itemName}
                  onChange={handleChange('itemName')}
                  error={!!errors.itemName}
                  helperText={errors.itemName}
                  required
                  autoFocus
                  sx={{ mb: 2.5 }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Inventory fontSize="small" color="action" /></InputAdornment>,
                  }}
                />

                <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
                  <TextField
                    fullWidth
                    select
                    label="Category"
                    value={form.category}
                    onChange={handleCategoryChange}
                    error={!!errors.category}
                    helperText={errors.category}
                    required
                  >
                    {CATEGORIES.map(cat => (
                      <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    fullWidth
                    label="Quantity"
                    type="number"
                    value={form.quantity}
                    onChange={handleChange('quantity')}
                    error={!!errors.quantity}
                    helperText={quantityLabel || errors.quantity}
                    required
                    inputProps={{ min: 1 }}
                  />

                  <TextField
                    fullWidth
                    select
                    label="Unit"
                    value={form.unit || 'unit'}
                    onChange={(e) => handleUnitChange(e.target.value)}
                    sx={{ minWidth: 130 }}
                  >
                    {UNITS.map(u => (
                      <MenuItem key={u} value={u}>{u}</MenuItem>
                    ))}
                  </TextField>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
                  <TextField
                    fullWidth
                    label="Budget (₹)"
                    type="number"
                    value={form.budget}
                    onChange={handleChange('budget')}
                    error={!!errors.budget}
                    helperText={errors.budget}
                    required
                    inputProps={{ min: 0, step: 0.01 }}
                  />

                  <TextField
                    fullWidth
                    select
                    label="Urgency"
                    value={form.urgency}
                    onChange={handleChange('urgency')}
                    error={!!errors.urgency}
                    helperText={errors.urgency}
                    required
                  >
                    {urgencies.map(u => (
                      <MenuItem key={u.value} value={u.value}>{u.label}</MenuItem>
                    ))}
                  </TextField>
                </Box>
                <TextField
                  fullWidth
                  label="Justification"
                  placeholder="Explain why this purchase is needed..."
                  value={form.justification}
                  onChange={handleChange('justification')}
                  multiline
                  rows={3}
                  sx={{ mb: 3 }}
                  helperText={`${form.justification.length} characters`}
                  inputProps={{ maxLength: 1000 }}
                />

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/manager-dashboard')}
                    sx={{ borderRadius: 2 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={18} /> : <Send />}
                    sx={{ borderRadius: 2, px: 4 }}
                  >
                    {loading ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Live Request Preview */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ position: { lg: 'sticky' }, top: { lg: 88 } }}>
            <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography
                  sx={{
                    fontSize: '0.6rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    color: 'text.disabled',
                  }}
                >
                  Request Preview
                </Typography>
                <Tooltip title="Live preview updates as you type">
                  <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.4 }}>
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#10b981', animation: 'pulse 1.6s ease-in-out infinite' }} />
                    Live
                  </Typography>
                </Tooltip>
              </Box>

              {form.itemName || form.category ? (
                <>
                  <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.015em', lineHeight: 1.3, mb: 1 }}>
                    {form.itemName || 'Unnamed item'}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
                    <Chip
                      label="Pending"
                      size="small"
                      sx={{ height: 22, backgroundColor: 'rgba(245,158,11,0.12)', color: '#d97706', fontWeight: 700, fontSize: '0.68rem' }}
                    />
                    {form.category && (
                      <Chip label={form.category} size="small" variant="outlined" sx={{ fontSize: '0.68rem', height: 22 }} />
                    )}
                    {form.urgency && (
                      <Chip
                        label={form.urgency}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                          backgroundColor: urgencyMeta.bg || 'action.hover',
                          color: urgencyMeta.text || 'text.primary',
                        }}
                      />
                    )}
                  </Box>

                  <Grid container spacing={1.5} sx={{ mb: 2 }}>
                    {[
                      { label: 'Quantity', value: quantityLabel || '—' },
                      { label: 'Budget', value: form.budget ? `₹${Number(form.budget).toLocaleString('en-IN')}` : '—' },
                      { label: 'Unit', value: form.unit || '—' },
                    ].map(f => (
                      <Grid item xs={4} key={f.label}>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem', display: 'block' }}>
                          {f.label}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                          {f.value}
                        </Typography>
                      </Grid>
                    ))}
                  </Grid>

                  <Divider sx={{ mb: 2 }} />

                  <Box sx={{ mb: form.justification ? 2 : 0 }}>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', display: 'block', mb: 0.5 }}>
                      Justification
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', color: form.justification ? 'text.secondary' : 'text.disabled' }}>
                      {form.justification || 'Add a short justification to speed up review.'}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(99,102,241,0.12)',
                        color: '#6366f1',
                      }}
                    >
                      <CheckCircle fontSize="small" />
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, fontSize: '0.7rem' }}>
                        Ready for the officer?
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formProgress.percentage === 100
                          ? 'All fields filled — submit when ready.'
                          : `Fill ${5 - formProgress.completed} more field${5 - formProgress.completed > 1 ? 's' : ''} to complete (${formProgress.percentage}%).`}
                      </Typography>
                    </Box>
                  </Box>
                </>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Inventory sx={{ fontSize: 36, color: 'text.disabled', opacity: 0.4, mb: 1 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Nothing to show yet
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    Your request summary will appear here as you type.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Stock availability dialog */}
      <Dialog open={stockDialog} onClose={() => setStockDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
          <Storefront sx={{ color: 'success.main' }} /> Available in Stock
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="success" icon={<CheckCircle />} sx={{ borderRadius: 2 }}>
            "{stockCheck.match?.itemName}" is available with{' '}
            <strong>{stockCheck.match?.quantity} {stockCheck.match?.unit}s</strong> in stock —
            enough to cover your request of {quantityLabel}.
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontSize: '0.85rem' }}>
            You can fulfill this need from existing inventory, or raise the purchase request anyway if you
            prefer to procure fresh stock.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setStockDialog(false); doSubmit(); }} sx={{ borderRadius: 2 }}>
            Raise Request Anyway
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<Inventory />}
            onClick={() => { setStockDialog(false); navigate('/inventory'); }}
            sx={{ borderRadius: 2 }}
          >
            Fulfill From Stock
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}