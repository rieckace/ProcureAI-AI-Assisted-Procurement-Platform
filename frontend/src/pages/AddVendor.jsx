import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, TextField, Button, MenuItem,
  Alert, CircularProgress, Snackbar, Grid, InputAdornment
} from '@mui/material';
import { ArrowBack, Store, Save, Business } from '@mui/icons-material';
import api from '../api';
import { CATEGORIES } from '../constants';

export default function AddVendor() {
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', category: '', phone: '',
    onTimeDelivery: '95', defectRate: '1', rating: '4.0',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Vendor name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Invalid email format';
    if (!form.category) newErrors.category = 'Category is required';
    const delivery = parseFloat(form.onTimeDelivery);
    if (delivery < 0 || delivery > 100) newErrors.onTimeDelivery = 'Must be 0-100%';
    const defect = parseFloat(form.defectRate);
    if (defect < 0 || defect > 100) newErrors.defectRate = 'Must be 0-100%';
    const rating = parseFloat(form.rating);
    if (rating < 1 || rating > 5) newErrors.rating = 'Must be 1-5';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/vendors', form);
      setSuccess(true);
      timerRef.current = setTimeout(() => navigate('/manage-vendors'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add vendor');
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
      <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 3, color: 'text.secondary', textTransform: 'none', '&:hover': { bgcolor: 'action.hover' } }}>
        Back
      </Button>

      {/* Header Banner */}
      <Box sx={{
        background: (theme) => theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, rgba(165,180,252,0.08) 0%, rgba(129,140,248,0.04) 100%)'
          : 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(129,140,248,0.03) 100%)',
        borderRadius: 3,
        p: 3,
        mb: 3,
        border: '1px solid',
        borderColor: 'divider',
      }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, letterSpacing: '-0.02em' }}>
          Add New Vendor
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Register a new vendor in the procurement system
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box component="form" onSubmit={handleSubmit}>
            <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
              Vendor Information
            </Typography>

            <Grid container spacing={2.5} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Vendor Name"
                  value={form.name}
                  onChange={handleChange('name')}
                  error={!!errors.name}
                  helperText={errors.name}
                  required
                  autoFocus
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Business fontSize="small" color="action" /></InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  onBlur={() => {
                    const email = form.email.trim();
                    if (email && !/\S+@\S+\.\S+/.test(email)) {
                      setErrors(prev => ({ ...prev, email: 'Invalid email format' }));
                    }
                  }}
                  error={!!errors.email}
                  helperText={errors.email}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
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
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={form.phone}
                  onChange={handleChange('phone')}
                  placeholder="+1-555-0000"
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
              Performance Metrics
            </Typography>

            <Grid container spacing={2.5} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="On-Time Delivery (%)"
                  type="number"
                  value={form.onTimeDelivery}
                  onChange={handleChange('onTimeDelivery')}
                  error={!!errors.onTimeDelivery}
                  helperText={errors.onTimeDelivery}
                  inputProps={{ min: 0, max: 100, step: 0.1 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Defect Rate (%)"
                  type="number"
                  value={form.defectRate}
                  onChange={handleChange('defectRate')}
                  error={!!errors.defectRate}
                  helperText={errors.defectRate}
                  inputProps={{ min: 0, max: 100, step: 0.1 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Rating (1-5)"
                  type="number"
                  value={form.rating}
                  onChange={handleChange('rating')}
                  error={!!errors.rating}
                  helperText={errors.rating}
                  inputProps={{ min: 1, max: 5, step: 0.1 }}
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={() => navigate(-1)} sx={{ borderRadius: 2 }}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={18} /> : <Save />}
                sx={{ borderRadius: 2, px: 4 }}
              >
                {loading ? 'Saving...' : 'Add Vendor'}
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
          Vendor added successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
}
