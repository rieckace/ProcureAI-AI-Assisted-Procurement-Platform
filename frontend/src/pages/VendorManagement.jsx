import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, Alert, IconButton,
  Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Snackbar, Grid, Chip, InputAdornment, useMediaQuery, useTheme
} from '@mui/material';
import { Add, Edit, Delete, ArrowBack, Search, Business, TrendingUp, CheckCircle, Warning, Star, StarBorder } from '@mui/icons-material';
import api from '../api';
import { CATEGORIES } from '../constants';
import ConfirmDialog from '../components/ConfirmDialog';

export default function VendorManagement() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const debounceRef = useRef(null);

  const fetchVendors = useCallback(async (searchVal, categoryVal) => {
    try {
      const params = new URLSearchParams({ limit: 100 });
      if (searchVal) params.append('search', searchVal);
      if (categoryVal && categoryVal !== 'all') params.append('category', categoryVal);
      const res = await api.get(`/vendors?${params}`);
      setVendors(res.data.data);
    } catch (err) {
      setError('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchVendors(search, categoryFilter);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, categoryFilter, fetchVendors]);

  const handleEdit = (vendor) => {
    setSelectedVendor(vendor);
    setEditForm({
      name: vendor.name,
      email: vendor.email,
      category: vendor.category,
      phone: vendor.phone || '',
      onTimeDelivery: vendor.onTimeDelivery.toString(),
      defectRate: vendor.defectRate.toString(),
      rating: vendor.rating.toString(),
    });
    setEditErrors({});
    setEditDialog(true);
  };

  const handleEditChange = (field) => (e) => {
    setEditForm(prev => ({ ...prev, [field]: e.target.value }));
    if (editErrors[field]) setEditErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateEdit = () => {
    const newErrors = {};
    if (!editForm.name.trim()) newErrors.name = 'Name is required';
    if (!editForm.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(editForm.email)) newErrors.email = 'Invalid email';
    if (!editForm.category) newErrors.category = 'Category is required';
    const delivery = parseFloat(editForm.onTimeDelivery);
    if (isNaN(delivery) || delivery < 0 || delivery > 100) newErrors.onTimeDelivery = 'Must be 0-100%';
    const defect = parseFloat(editForm.defectRate);
    if (isNaN(defect) || defect < 0 || defect > 100) newErrors.defectRate = 'Must be 0-100%';
    const rating = parseFloat(editForm.rating);
    if (isNaN(rating) || rating < 1 || rating > 5) newErrors.rating = 'Must be 1-5';
    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditSubmit = async () => {
    if (!validateEdit()) return;
    setSaving(true);
    try {
      await api.put(`/vendors/${selectedVendor.id}`, editForm);
      setEditDialog(false);
      setSnackbar({ open: true, message: 'Vendor updated successfully', severity: 'success' });
      fetchVendors(search, categoryFilter);
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to update vendor', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (vendor) => {
    setSelectedVendor(vendor);
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    setSaving(true);
    try {
      await api.delete(`/vendors/${selectedVendor.id}`);
      setDeleteDialog(false);
      setSnackbar({ open: true, message: 'Vendor deleted successfully', severity: 'success' });
      fetchVendors(search, categoryFilter);
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to delete vendor', severity: 'error' });
      setDeleteDialog(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 2, color: 'text.secondary', textTransform: 'none' }}>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2,
      }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, letterSpacing: '-0.02em' }}>
            Manage Vendors
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Edit or remove vendors from the system
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/add-vendor')}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
        >
          Add Vendor
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Search vendors by name, email, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flex: 1, minWidth: 200 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>
                ),
              }}
            />
            <TextField
              size="small"
              select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="all">All Categories</MenuItem>
              {CATEGORIES.map(cat => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </TextField>
          </Box>
        </CardContent>
      </Card>

      {/* Vendor Performance Scorecard */}
      {vendors.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Performance Overview
          </Typography>
          <Grid container spacing={2}>
            {(() => {
              const avgRating = vendors.reduce((s, v) => s + v.rating, 0) / vendors.length;
              const avgDelivery = vendors.reduce((s, v) => s + v.onTimeDelivery, 0) / vendors.length;
              const avgDefect = vendors.reduce((s, v) => s + v.defectRate, 0) / vendors.length;
              const highPerformers = vendors.filter(v => v.rating >= 4).length;
              const topVendor = vendors.reduce((best, v) => v.rating > (best?.rating || 0) ? v : best, null);

              const scorecards = [
                { label: 'Avg Rating', value: `${avgRating.toFixed(1)}/5`, icon: <Star />, color: 'warning.main', bg: 'rgba(255,193,7,0.12)', highlight: avgRating >= 4 },
                { label: 'On-Time Delivery', value: `${avgDelivery.toFixed(0)}%`, icon: <TrendingUp />, color: 'success.main', bg: 'rgba(76,175,80,0.12)', highlight: avgDelivery >= 85 },
                { label: 'Defect Rate', value: `${avgDefect.toFixed(1)}%`, icon: avgDefect <= 3 ? <CheckCircle /> : <Warning />, color: avgDefect <= 3 ? 'success.main' : 'error.main', bg: avgDefect <= 3 ? 'rgba(76,175,80,0.12)' : 'rgba(244,67,54,0.12)', highlight: avgDefect <= 3 },
                { label: 'Top Vendor', value: topVendor?.name || 'N/A', icon: <Business />, color: 'primary.main', bg: 'rgba(33,150,243,0.12)', highlight: true },
                { label: 'High Performers', value: `${highPerformers}/${vendors.length}`, icon: <StarBorder />, color: 'secondary.main', bg: 'rgba(156,39,176,0.12)', highlight: highPerformers > vendors.length / 2 },
              ];

              return scorecards.map((card) => (
                <Grid item xs={6} sm={4} md={2} key={card.label}>
                  <Card sx={{
                    background: (theme) => theme.palette.mode === 'dark'
                      ? `linear-gradient(135deg, ${card.bg} 0%, rgba(0,0,0,0.2) 100%)`
                      : `linear-gradient(135deg, ${card.bg} 0%, rgba(255,255,255,0.8) 100%)`,
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
                  }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                          {card.label}
                        </Typography>
                        <Box sx={{ color: card.color, display: 'flex', alignItems: 'center' }}>
                          {card.icon}
                        </Box>
                      </Box>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: card.color, fontSize: '0.95rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {card.value}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ));
            })()}
          </Grid>
        </Box>
      )}

      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {vendors.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Business sx={{ fontSize: 56, color: 'text.secondary', mb: 2, opacity: 0.4 }} />
              <Typography variant="h5" color="text.secondary" sx={{ mb: 1 }}>No vendors yet</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Add your first vendor to start collecting quotes
              </Typography>
              <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/add-vendor')} sx={{ borderRadius: 2 }}>
                Add First Vendor
              </Button>
            </Box>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    {!isMobile && <TableCell>Email</TableCell>}
                    <TableCell>Category</TableCell>
                    {!isMobile && <TableCell>On-Time Delivery</TableCell>}
                    {!isMobile && <TableCell>Defect Rate</TableCell>}
                    <TableCell>Rating</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vendors.map((vendor) => (
                    <TableRow key={vendor.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{vendor.name}</Typography>
                        {isMobile && (
                          <Typography variant="caption" color="text.secondary">{vendor.email}</Typography>
                        )}
                      </TableCell>
                      {!isMobile && (
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{vendor.email}</Typography>
                        </TableCell>
                      )}
                      <TableCell>
                        <Chip label={vendor.category} size="small" sx={{ fontSize: '0.75rem' }} />
                      </TableCell>
                      {!isMobile && (
                        <TableCell>
                          <Typography variant="body2" sx={{ color: vendor.onTimeDelivery >= 90 ? 'success.main' : 'warning.main' }}>
                            {vendor.onTimeDelivery}%
                          </Typography>
                        </TableCell>
                      )}
                      {!isMobile && (
                        <TableCell>
                          <Typography variant="body2" sx={{ color: vendor.defectRate <= 2 ? 'success.main' : 'warning.main' }}>
                            {vendor.defectRate}%
                          </Typography>
                        </TableCell>
                      )}
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{vendor.rating}/5</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleEdit(vendor)} aria-label="Edit vendor">
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => handleDeleteClick(vendor)} color="error" aria-label="Delete vendor">
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Vendor</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth label="Name" value={editForm.name}
                onChange={handleEditChange('name')}
                error={!!editErrors.name} helperText={editErrors.name}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth label="Email" value={editForm.email}
                onChange={handleEditChange('email')}
                error={!!editErrors.email} helperText={editErrors.email}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth select label="Category" value={editForm.category}
                onChange={handleEditChange('category')}
                error={!!editErrors.category} helperText={editErrors.category}
              >
                {CATEGORIES.map(cat => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth label="Phone" value={editForm.phone}
                onChange={handleEditChange('phone')}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth label="On-Time Delivery (%)" type="number" value={editForm.onTimeDelivery}
                onChange={handleEditChange('onTimeDelivery')}
                error={!!editErrors.onTimeDelivery} helperText={editErrors.onTimeDelivery}
                inputProps={{ min: 0, max: 100, step: 0.1 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth label="Defect Rate (%)" type="number" value={editForm.defectRate}
                onChange={handleEditChange('defectRate')}
                error={!!editErrors.defectRate} helperText={editErrors.defectRate}
                inputProps={{ min: 0, max: 100, step: 0.1 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth label="Rating (1-5)" type="number" value={editForm.rating}
                onChange={handleEditChange('rating')}
                error={!!editErrors.rating} helperText={editErrors.rating}
                inputProps={{ min: 1, max: 5, step: 0.1 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditDialog(false)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button
            variant="contained" onClick={handleEditSubmit} disabled={saving}
            sx={{ borderRadius: 2 }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Vendor"
        message={`Are you sure you want to delete **${selectedVendor?.name}**? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="error"
        loading={saving}
        severity="error"
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
