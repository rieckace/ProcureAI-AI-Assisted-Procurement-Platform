import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, TextField, Button, MenuItem,
  Alert, CircularProgress, Snackbar, InputAdornment
} from '@mui/material';
import { ArrowBack, Send, Inventory } from '@mui/icons-material';
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
  const [form, setForm] = useState({
    itemName: '', category: '', quantity: '', budget: '',
    urgency: 'medium', justification: '',
  });
  const [errors, setErrors] = useState({});

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
        sx={{ mb: 3, color: 'text.secondary', '&:hover': { bgcolor: 'action.hover' } }}
      >
        Back to Dashboard
      </Button>

      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        New Purchase Request
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Submit a new procurement request for approval
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
      )}

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
                value={form.category}
                onChange={handleChange('category')}
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
