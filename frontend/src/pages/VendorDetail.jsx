import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Alert, IconButton, Tooltip,
  TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, InputAdornment, Grid, Divider, useTheme, useMediaQuery
} from '@mui/material';
import {
  ArrowBack, Add, Edit, Delete, Search, Inventory2, Star, TrendingUp,
  Warning, Business, Email, Phone, Store, Category, CheckCircle
} from '@mui/icons-material';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CATEGORIES, UNITS, PRODUCT_STATUSES, PRODUCT_STATUS_COLORS } from '../constants';
import ConfirmDialog from '../components/ConfirmDialog';

const STATUS_LABELS = {
  available: 'Available',
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
  discontinued: 'Discontinued',
};

export default function VendorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const { showToast } = useToast();

  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [dialog, setDialog] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState({ name: '', category: '', unit: 'unit', unitPrice: '', availableQty: 0, status: 'available' });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [deleteProduct, setDeleteProduct] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isOfficer = user?.role === 'officer' || user?.role === 'admin';
  const debounceRef = useRef(null);

  const fetchVendor = useCallback(async () => {
    try {
      const res = await api.get(`/vendors/${id}`);
      if (!res.data) throw new Error('no data');
      setVendor(res.data);
      setProducts(res.data.products || []);
    } catch (err) {
      setError('Failed to load vendor');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchVendor(); }, [fetchVendor]);

  const filteredProducts = products.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const availableCount = products.filter(p => p.status === 'available').length;
  const lowStockCount = products.filter(p => p.status === 'low_stock' || p.status === 'out_of_stock').length;

  const openAdd = () => {
    setEditProduct(null);
    setForm({ name: '', category: vendor?.category || '', unit: 'unit', unitPrice: '', availableQty: 0, status: 'available' });
    setFormErrors({});
    setDialog(true);
  };

  const openEdit = (product) => {
    setEditProduct(product);
    setForm({
      name: product.name,
      category: product.category,
      unit: product.unit || 'unit',
      unitPrice: product.unitPrice.toString(),
      availableQty: product.availableQty,
      status: product.status,
    });
    setFormErrors({});
    setDialog(true);
  };

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (formErrors[field]) setFormErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Product name is required';
    if (!form.category) errs.category = 'Category is required';
    if (!form.unitPrice || parseFloat(form.unitPrice) <= 0) errs.unitPrice = 'Unit price must be greater than 0';
    if (isNaN(parseInt(form.availableQty)) || parseInt(form.availableQty) < 0) errs.availableQty = 'Must be 0 or more';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editProduct) {
        await api.put(`/vendors/${id}/products/${editProduct.id}`, form);
        showToast('Product updated successfully', 'success');
      } else {
        await api.post(`/vendors/${id}/products`, form);
        showToast('Product added to catalog', 'success');
      }
      setDialog(false);
      fetchVendor();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save product', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteProduct) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/vendors/${id}/products/${deleteProduct.id}`);
      showToast('Product deleted', 'success');
      setDeleteProduct(null);
      fetchVendor();
    } catch (err) {
      showToast('Failed to delete product', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !vendor) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error || 'Vendor not found'}</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/manage-vendors')}>Back to Vendors</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ animation: 'fadeInUp 0.35s ease' }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/manage-vendors')} sx={{ mb: 2, color: 'text.secondary', textTransform: 'none' }}>
        Back to Vendors
      </Button>

      {/* Vendor Header */}
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <Box sx={{
              width: 52, height: 52, borderRadius: 2, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            }}>
              <Store sx={{ color: 'white', fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5 }}>
                {vendor.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip icon={<Category sx={{ fontSize: 14 }} />} label={vendor.category} size="small" variant="outlined" />
                <Chip icon={<Star sx={{ fontSize: 14, color: 'warning.main' }} />} label={`${vendor.rating}/5`} size="small" />
                <Chip icon={<TrendingUp sx={{ fontSize: 14, color: 'success.main' }} />} label={`${vendor.onTimeDelivery}% on-time`} size="small" />
                <Chip icon={<Warning sx={{ fontSize: 14, color: vendor.defectRate <= 2 ? 'success.main' : 'warning.main' }} />} label={`${vendor.defectRate}% defect`} size="small" />
              </Box>
              <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Email sx={{ fontSize: 14 }} /> {vendor.email}
                </Typography>
                {vendor.phone && (
                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Phone sx={{ fontSize: 14 }} /> {vendor.phone}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
          {isOfficer && (
            <Button variant="contained" startIcon={<Add />} onClick={openAdd} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
              Add Product
            </Button>
          )}
        </Box>
      </Box>

      {/* Stat chips row */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <Chip size="small" label={`Total: ${products.length}`} icon={<Store fontSize="small" />} variant="outlined" sx={{ backgroundColor: 'rgba(99,102,241,0.08)', color: '#6366f1' }} />
        <Chip size="small" label={`Available: ${availableCount}`} icon={<CheckCircle fontSize="small" />} variant="outlined" sx={{ backgroundColor: 'rgba(16,185,129,0.08)', color: '#10b981' }} />
        <Chip size="small" label={`Low Stock: ${lowStockCount || 0}`} icon={<Warning fontSize="small" />} variant="outlined" sx={{ backgroundColor: 'rgba(245,158,11,0.08)', color: '#f59e0b' }} />
        <Chip size="small" label={`Categories: ${new Set(products.map(p => p.category)).size}`} icon={<Category fontSize="small" />} variant="outlined" sx={{ backgroundColor: 'rgba(14,165,233,0.08)', color: '#0ea5e9' }} />
      </Box>

      {/* Catalog stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={3}>
          <Card>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>Products</Typography>
              <Typography variant="h5" fontWeight={700}>{products.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <Card>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>Available</Typography>
              <Typography variant="h5" fontWeight={700} color="success.main">{availableCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <Card sx={{ border: lowStockCount > 0 ? '1px solid' : '1px solid', borderColor: lowStockCount > 0 ? 'warning.main' : 'divider' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>Low / Out of Stock</Typography>
              <Typography variant="h5" fontWeight={700} color="warning.main">{lowStockCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <TextField
            size="small"
            placeholder="Search products by name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
            }}
          />
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mb: 2, mt: 1 }}>
        <Inventory2 sx={{ mr: 1, verticalAlign: 'middle', fontSize: 22 }} />
        Product Catalog ({filteredProducts.length})
      </Typography>

      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {filteredProducts.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Inventory2 sx={{ fontSize: 56, color: 'text.secondary', mb: 2, opacity: 0.4 }} />
              <Typography variant="h5" color="text.secondary" sx={{ mb: 1 }}>
                {products.length === 0 ? 'No products yet' : 'No matching products'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {products.length === 0
                  ? 'Add products to this vendor\'s catalog so buyers can see what they offer'
                  : 'Try adjusting your search'}
              </Typography>
              {isOfficer && products.length === 0 && (
                <Button variant="contained" startIcon={<Add />} onClick={openAdd} sx={{ borderRadius: 2 }}>
                  Add First Product
                </Button>
              )}
            </Box>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Product</strong></TableCell>
                    {!isMobile && <TableCell><strong>Category</strong></TableCell>}
                    {!isMobile && <TableCell align="center"><strong>Unit</strong></TableCell>}
                    <TableCell align="right"><strong>Unit Price</strong></TableCell>
                    <TableCell align="center"><strong>Available Qty</strong></TableCell>
                    <TableCell align="center"><strong>Status</strong></TableCell>
                    {isOfficer && <TableCell align="right"><strong>Actions</strong></TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const statusColor = PRODUCT_STATUS_COLORS[product.status]?.color || 'text.primary';
                    const statusBg = PRODUCT_STATUS_COLORS[product.status]?.bg || 'action.hover';
                    const isOut = product.status === 'out_of_stock' || product.status === 'discontinued';
                    return (
                      <TableRow key={product.id} hover sx={{ opacity: isOut ? 0.6 : 1 }}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{product.name}</Typography>
                        </TableCell>
                        {!isMobile && (
                          <TableCell>
                            <Chip label={product.category} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                          </TableCell>
                        )}
                        {!isMobile && (
                          <TableCell align="center">
                            <Typography variant="body2">{product.unit}</Typography>
                          </TableCell>
                        )}
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600}>₹{product.unitPrice.toLocaleString()}/{product.unit}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={product.availableQty}
                            size="small"
                            color={product.availableQty === 0 ? 'error' : product.status === 'low_stock' ? 'warning' : 'success'}
                            sx={{ fontWeight: 600, minWidth: 40 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={STATUS_LABELS[product.status] || product.status}
                            size="small"
                            sx={{ bgcolor: statusBg, color: statusColor, fontWeight: 600, fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        {isOfficer && (
                          <TableCell align="right">
                            <Tooltip title="Edit product">
                              <IconButton size="small" onClick={() => openEdit(product)} aria-label="Edit product">
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete product">
                              <IconButton size="small" color="error" onClick={() => setDeleteProduct(product)} aria-label="Delete product">
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Product Dialog */}
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>{editProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth label="Product Name" value={form.name}
                onChange={handleChange('name')}
                error={!!formErrors.name} helperText={formErrors.name}
                placeholder="e.g., Premium Basmati Rice"
                autoFocus
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth select label="Category" value={form.category}
                onChange={handleChange('category')}
                error={!!formErrors.category} helperText={formErrors.category}
              >
                {CATEGORIES.map(cat => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth select label="Unit" value={form.unit}
                onChange={handleChange('unit')}
              >
                {UNITS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth label="Unit Price (₹)" type="number" value={form.unitPrice}
                onChange={handleChange('unitPrice')}
                error={!!formErrors.unitPrice} helperText={formErrors.unitPrice}
                placeholder={`Price per 1 ${form.unit}`}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth label="Available Quantity" type="number" value={form.availableQty}
                onChange={handleChange('availableQty')}
                error={!!formErrors.availableQty} helperText={formErrors.availableQty}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth select label="Status" value={form.status}
                onChange={handleChange('status')}
              >
                {PRODUCT_STATUSES.map(s => <MenuItem key={s} value={s}>{STATUS_LABELS[s]}</MenuItem>)}
              </TextField>
            </Grid>
            {form.unitPrice && form.unitPrice > 0 && (
              <Grid item xs={12}>
                <Box sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">Pricing hint</Typography>
                  <Typography variant="body2">
                    A PR for 1 {form.unit} = ₹{parseFloat(form.unitPrice).toLocaleString()} · A PR for 22 {form.unit} = ₹{(parseFloat(form.unitPrice) * 22).toLocaleString()}
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog(false)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button
            variant="contained" onClick={handleSave} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <Add />}
            sx={{ borderRadius: 2 }}
          >
            {saving ? 'Saving...' : editProduct ? 'Save Changes' : 'Add Product'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteProduct}
        onClose={() => setDeleteProduct(null)}
        onConfirm={handleDelete}
        title="Delete Product"
        message={`Are you sure you want to remove **${deleteProduct?.name}** from ${vendor.name}'s catalog?`}
        confirmLabel="Delete"
        confirmColor="error"
        loading={deleteLoading}
        severity="error"
      />

      <Divider sx={{ my: 3 }} />
      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Business sx={{ fontSize: 14 }} /> Catalog last updated {vendor.updatedAt ? new Date(vendor.updatedAt).toLocaleDateString() : '—'}
      </Typography>
    </Box>
  );
}
