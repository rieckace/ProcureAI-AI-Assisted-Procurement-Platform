import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, TextField, Button, MenuItem,
  Alert, CircularProgress, Snackbar, InputAdornment
} from '@mui/material';
import { ArrowBack, Send, Inventory, CheckCircleOutline, RadioButtonUnchecked } from '@mui/icons-material';
import api from '../api';
import { CATEGORIES } from '../constants';

const urgencies = [
  { value: 'low', label: 'Low - Can wait' },
  { value: 'medium', label: 'Medium - Within month' },
  { value: 'high', label: 'High - Within 2 weeks' },
  { value: 'critical', label: 'Critical - Immediate' },
];

export default function NewRequest() {
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
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
      itemName: '', category: '', quantity: '', budget: '',
      urgency: 'medium', justification: '',
    };
  });
  const [errors, setErrors] = useState({});
  const [draftSaved, setDraftSaved] = useState(false);
  const draftTimerRef = useRef(null);

  // Smart defaults based on category
  const categoryDefaults = {
    'IT': { itemName: 'Software License - ' },
    'Office Supplies': { itemName: 'Office Supplies - ' },
    'Furniture': { itemName: 'Office Furniture - ' },
    'Equipment': { itemName: 'Equipment - ' },
    'Services': { itemName: 'Consulting Services - ' },
    'Software': { itemName: 'Software License - ' },
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

  const handleCategoryChange = (e) => {
    const newCat = e.target.value;
    const defaults = categoryDefaults[newCat];
    if (defaults && !form.itemName) {
      // Pre-fill item name hint when category is selected
      setForm(prev => ({ ...prev, category: newCat, itemName: defaults.itemName }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError('');
    try {
      await api.post('/purchase-requests', form);
      clearDraft();
      setSuccess(true);
      timerRef.current = setTimeout(() => navigate('/manager-dashboard'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  // Auto-dismiss errors
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 8000);
    return () => clearTimeout(t);
  }, [error]);

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', animation: 'fadeInUp 0.35s ease' }}>
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
          ? 'linear-gradient(135deg, rgba(138,180,248,0.08) 0%, rgba(100,181,246,0.04) 100%)'
          : 'linear-gradient(135deg, rgba(26,115,232,0.06) 0%, rgba(100,181,246,0.03) 100%)',
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
          Submit a new procurement request for approval
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
                    ? 'linear-gradient(90deg, #4caf50, #66bb6a)'
                    : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                }} />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
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

            <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
              <TextField
                fullWidth
                select
                label="Category"
                value={form.category}                  onChange={handleCategoryChange}
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
                helperText={errors.quantity}
                required
                inputProps={{ min: 1 }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
              <TextField
                fullWidth
                label="Budget ($)"
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
            </Box>              <TextField
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

      <Snackbar
        open={success}
        autoHideDuration={3000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ borderRadius: 2 }}>
          Purchase request created successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
}
