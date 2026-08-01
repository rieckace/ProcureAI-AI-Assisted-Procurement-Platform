import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Alert, IconButton, Tooltip,
  TextField, InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, LinearProgress, useTheme
} from '@mui/material';
import {
  Add, Edit, Delete, Search, Warning, Inventory2, FilterAltOff,
  AddCircle, RemoveCircle, Refresh
} from '@mui/icons-material';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { CATEGORIES } from '../constants';
import { StatsSkeleton } from '../components/Skeletons';

export default function InventoryPage() {
  const theme = useTheme();
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [addDialog, setAddDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ itemName: '', category: 'IT', quantity: 0, minStockLevel: 5, unitPrice: '' });
  const [formErrors, setFormErrors] = useState({});
  const [stockDialog, setStockDialog] = useState(false);
  const [stockItem, setStockItem] = useState(null);
  const [stockAction, setStockAction] = useState('add');
  const [stockQty, setStockQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const res = await api.get(`/inventory?${params}`);
      setItems(res.data.data || []);
    } catch (err) {
      setError('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  const handleAddItem = async () => {
    const errs = {};
    if (!form.itemName.trim()) errs.itemName = 'Item name is required';
    if (!form.category) errs.category = 'Category is required';
    if (form.quantity < 0) errs.quantity = 'Quantity must be 0 or more';
    if (form.minStockLevel < 0) errs.minStockLevel = 'Must be 0 or more';
    setFormErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    try {
      await api.post('/inventory', form);
      showToast('Item added to inventory', 'success');
      setAddDialog(false);
      setForm({ itemName: '', category: 'IT', quantity: 0, minStockLevel: 5, unitPrice: '' });
      fetchInventory();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add item', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStock = async () => {
    if (!stockItem || stockQty < 1) return;
    setSubmitting(true);
    try {
      await api.put(`/inventory/${stockItem.id}/stock`, { quantity: stockQty, type: stockAction });
      showToast(`Stock ${stockAction === 'add' ? 'added' : 'deducted'} successfully`, 'success');
      setStockDialog(false);
      fetchInventory();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update stock', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.itemName}" from inventory?`)) return;
    try {
      await api.delete(`/inventory/${item.id}`);
      showToast('Item deleted', 'success');
      fetchInventory();
    } catch (err) {
      showToast('Failed to delete item', 'error');
    }
  };

  const handleUpdateItem = async () => {
    if (!editItem) return;
    setSubmitting(true);
    try {
      await api.put(`/inventory/${editItem.id}`, form);
      showToast('Item updated', 'success');
      setEditDialog(false);
      setEditItem(null);
      fetchInventory();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update item', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const lowStockItems = items.filter(i => i.quantity <= i.minStockLevel);
  const totalValue = items.reduce((sum, i) => sum + (i.unitPrice || 0) * i.quantity, 0);

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
              <Inventory2 sx={{ mr: 1, verticalAlign: 'middle' }} />
              Inventory
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage stock levels and track inventory items
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<Add />} onClick={() => setAddDialog(true)}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
            Add Item
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* Stats Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ flex: 1, minWidth: 130 }}>
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ mb: 0.5, fontSize: '0.8rem' }}>
              Total Items
            </Typography>
            <Typography variant="h4" fontWeight={700}>{items.length}</Typography>
          </CardContent>
        </Card>
        <Card sx={{
          flex: 1, minWidth: 130,
          border: lowStockItems.length > 0 ? '2px solid' : '1px solid',
          borderColor: lowStockItems.length > 0 ? 'error.main' : 'divider',
        }}>
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ mb: 0.5, fontSize: '0.8rem' }}>
              Low Stock Alerts
            </Typography>
            <Typography variant="h4" fontWeight={700} color={lowStockItems.length > 0 ? 'error.main' : 'text.primary'}>
              {lowStockItems.length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 130 }}>
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ mb: 0.5, fontSize: '0.8rem' }}>
              Total Stock Value
            </Typography>
            <Typography variant="h4" fontWeight={700}>${totalValue.toLocaleString()}</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}
          action={<Button size="small" color="inherit" onClick={() => setSearch('')}>Dismiss</Button>}>
          <strong>{lowStockItems.length} item(s)</strong> below minimum stock level:
          {lowStockItems.slice(0, 3).map(i => ` "${i.itemName}" (${i.quantity}/${i.minStockLevel})`).join(', ')}
          {lowStockItems.length > 3 && ` and ${lowStockItems.length - 3} more`}
        </Alert>
      )}

      {/* Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <TextField
            size="small" placeholder="Search inventory items..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
            }}
          />
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {items.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Inventory2 sx={{ fontSize: 56, color: 'text.disabled', mb: 1, opacity: 0.5 }} />
              <Typography variant="h5" color="text.secondary" sx={{ mb: 1 }}>
                {search ? 'No matching items' : 'No inventory items yet'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {search ? 'Try adjusting your search' : 'Add your first inventory item to start tracking stock'}
              </Typography>
              {!search && (
                <Button variant="contained" startIcon={<Add />} onClick={() => setAddDialog(true)}>
                  Add Item
                </Button>
              )}
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Item</strong></TableCell>
                    <TableCell><strong>Category</strong></TableCell>
                    <TableCell align="center"><strong>In Stock</strong></TableCell>
                    <TableCell align="center"><strong>Min Level</strong></TableCell>
                    <TableCell align="right"><strong>Unit Price</strong></TableCell>
                    <TableCell align="right"><strong>Value</strong></TableCell>
                    <TableCell align="right"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => {
                    const isLowStock = item.quantity <= item.minStockLevel;
                    return (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{item.itemName}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={item.category} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={item.quantity}
                            size="small"
                            color={isLowStock && item.quantity === 0 ? 'error' : isLowStock ? 'warning' : 'success'}
                            sx={{ fontWeight: 600, minWidth: 40 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" color="text.secondary">{item.minStockLevel}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {item.unitPrice ? `$${item.unitPrice.toLocaleString()}` : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={500}>
                            {item.unitPrice ? `$${(item.unitPrice * item.quantity).toLocaleString()}` : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Add Stock">
                            <IconButton size="small" onClick={() => { setStockItem(item); setStockAction('add'); setStockQty(1); setStockDialog(true); }}>
                              <AddCircle fontSize="small" color="success" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Remove Stock">
                            <IconButton size="small" onClick={() => { setStockItem(item); setStockAction('deduct'); setStockQty(1); setStockDialog(true); }}>
                              <RemoveCircle fontSize="small" color="error" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Item">
                            <IconButton size="small" onClick={() => {
                              setEditItem(item);
                              setForm({ itemName: item.itemName, category: item.category, quantity: item.quantity, minStockLevel: item.minStockLevel, unitPrice: item.unitPrice || '' });
                              setEditDialog(true);
                            }}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => handleDelete(item)}>
                              <Delete fontSize="small" color="error" />
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

      {/* Add Item Dialog */}
      <Dialog open={addDialog} onClose={() => setAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Inventory Item</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Item Name" fullWidth required value={form.itemName}
              onChange={(e) => setForm({ ...form, itemName: e.target.value })}
              error={!!formErrors.itemName} helperText={formErrors.itemName} />
            <TextField select label="Category" fullWidth required value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <TextField label="Initial Quantity" type="number" fullWidth value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })}
              error={!!formErrors.quantity} helperText={formErrors.quantity} />
            <TextField label="Minimum Stock Level" type="number" fullWidth value={form.minStockLevel}
              onChange={(e) => setForm({ ...form, minStockLevel: parseInt(e.target.value) || 0 })} />
            <TextField label="Unit Price ($)" type="number" fullWidth value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddDialog(false)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button variant="contained" onClick={handleAddItem} disabled={submitting} sx={{ borderRadius: 2 }}>
            {submitting ? 'Adding...' : 'Add Item'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Inventory Item</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Item Name" fullWidth value={form.itemName}
              onChange={(e) => setForm({ ...form, itemName: e.target.value })} />
            <TextField select label="Category" fullWidth value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <TextField label="Minimum Stock Level" type="number" fullWidth value={form.minStockLevel}
              onChange={(e) => setForm({ ...form, minStockLevel: parseInt(e.target.value) || 0 })} />
            <TextField label="Unit Price ($)" type="number" fullWidth value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditDialog(false)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateItem} disabled={submitting} sx={{ borderRadius: 2 }}>
            {submitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={stockDialog} onClose={() => setStockDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {stockAction === 'add' ? 'Add Stock' : 'Remove Stock'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {stockItem?.itemName} — Currently: <strong>{stockItem?.quantity}</strong> units
          </Typography>
          <TextField
            label="Quantity"
            type="number"
            fullWidth
            value={stockQty}
            onChange={(e) => setStockQty(Math.max(1, parseInt(e.target.value) || 1))}
            inputProps={{ min: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setStockDialog(false)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button
            variant="contained"
            color={stockAction === 'add' ? 'success' : 'error'}
            onClick={handleUpdateStock}
            disabled={submitting}
            sx={{ borderRadius: 2 }}
          >
            {submitting ? 'Updating...' : stockAction === 'add' ? 'Add Stock' : 'Remove Stock'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
