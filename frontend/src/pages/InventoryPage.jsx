import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Alert, IconButton, Tooltip,
  TextField, InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, LinearProgress, useTheme, Switch, FormControlLabel
} from '@mui/material';
import {
  Add, Edit, Delete, Search, Warning, Inventory2, FilterAltOff,
  AddCircle, RemoveCircle, Refresh, Download
} from '@mui/icons-material';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { CATEGORIES, UNITS } from '../constants';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatCompactINR } from '../utils/formatCompact';
import { exportToCsv } from '../utils/exportCsv';

export default function InventoryPage() {
  const theme = useTheme();
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [addDialog, setAddDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ itemName: '', category: 'Rice', quantity: 0, unit: 'unit', minStockLevel: 5, unitPrice: '' });
  const [formErrors, setFormErrors] = useState({});
  const [stockDialog, setStockDialog] = useState(false);
  const [stockItem, setStockItem] = useState(null);
  const [stockAction, setStockAction] = useState('add');
  const [stockQty, setStockQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
      setForm({ itemName: '', category: 'Rice', quantity: 0, unit: 'unit', minStockLevel: 5, unitPrice: '' });
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
      const undoType = stockAction === 'add' ? 'deduct' : 'add';
      showToast(`Stock ${stockAction === 'add' ? 'added' : 'deducted'} successfully`, 'success', {
        label: 'Undo',
        onClick: async () => {
          try {
            await api.put(`/inventory/${stockItem.id}/stock`, { quantity: stockQty, type: undoType });
            showToast('Stock change undone', 'info');
            fetchInventory();
          } catch {
            showToast('Failed to undo', 'error');
          }
        },
      });
      setStockDialog(false);
      fetchInventory();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update stock', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (item) => setDeleteTarget(item);

  const performDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const deleted = deleteTarget;
    try {
      await api.delete(`/inventory/${deleted.id}`);
      showToast('Item deleted', 'success', { label: 'Undo', onClick: () => restoreItem(deleted) });
      fetchInventory();
    } catch (err) {
      showToast('Failed to delete item', 'error');
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  // Restore a previously deleted item (undo support)
  const restoreItem = async (deleted) => {
    try {
      await api.post('/inventory', {
        itemName: deleted.itemName,
        category: deleted.category,
        quantity: deleted.quantity,
        unit: deleted.unit || 'unit',
        minStockLevel: deleted.minStockLevel || 5,
        unitPrice: deleted.unitPrice || null,
      });
      showToast('Item restored', 'info');
      fetchInventory();
    } catch {
      showToast('Failed to restore item', 'error');
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
          ? 'linear-gradient(135deg, rgba(165,180,252,0.08), transparent)'
          : 'linear-gradient(135deg, rgba(99,102,241,0.06), transparent)',
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
            <Typography variant="h4" fontWeight={700} title={`₹${totalValue.toLocaleString('en-IN')}`}>
              {formatCompactINR(totalValue)}
            </Typography>
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

      {/* Search + Low stock filter */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              size="small" placeholder="Search inventory items..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              sx={{ flex: 1, minWidth: 200 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
              }}
            />
            <Tooltip title="Show only items at or below minimum stock level">
              <FormControlLabel
                control={<Switch size="small" checked={lowStockFilter} onChange={() => setLowStockFilter(v => !v)} color="warning" />}
                label="Low stock only"
                labelPlacement="end"
              />
            </Tooltip>
            <Tooltip title="Export current view to CSV">
              <Button
                size="small"
                startIcon={<Download fontSize="small" />}
                onClick={() => {
                  const data = items.filter(item => !lowStockFilter || item.quantity <= item.minStockLevel);
                  const columns = [
                    { label: 'Item', accessor: 'itemName' },
                    { label: 'Category', accessor: 'category' },
                    { label: 'In Stock', accessor: 'quantity' },
                    { label: 'Min Level', accessor: 'minStockLevel' },
                    { label: 'Unit', accessor: 'unit' },
                    { label: 'Unit Price', accessor: row => `₹${row.unitPrice?.toLocaleString()}` },
                    { label: 'Total Value', accessor: row => `₹${(row.quantity * (row.unitPrice || 0)).toLocaleString()}` },
                    { label: 'Status', accessor: row => row.quantity <= row.minStockLevel ? 'LOW STOCK' : 'OK' },
                    { label: 'Updated', accessor: row => new Date(row.updatedAt).toLocaleDateString() },
                  ];
                  exportToCsv(data, columns, `inventory-export-${new Date().toISOString().slice(0,10)}`);
                  showToast('Inventory exported to CSV', 'success');
                }}
                sx={{ borderRadius: 2 }}
              >
                Export CSV
              </Button>
            </Tooltip>
          </Box>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {items.length === 0 ? (
            <EmptyState
              icon={<Inventory2 sx={{ fontSize: 40 }} />}
              title={search ? 'No matching items' : 'No inventory items yet'}
              description={search ? 'Try adjusting your search' : 'Add your first inventory item to start tracking stock'}
              action={!search && (
                <Button variant="contained" startIcon={<Add />} onClick={() => setAddDialog(true)} sx={{ borderRadius: 2 }}>
                  Add Item
                </Button>
              )}
            />
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
                  {items.filter(item => !lowStockFilter || item.quantity <= item.minStockLevel).map((item) => {
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
                            label={`${item.quantity} ${item.unit || ''}`}
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
                            {item.unitPrice ? `₹${item.unitPrice.toLocaleString('en-IN')}/${item.unit || 'unit'}` : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={500}>
                            {item.unitPrice ? `₹${(item.unitPrice * item.quantity).toLocaleString('en-IN')}` : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Add Stock">
                            <IconButton size="small" aria-label={`Add stock to ${item.itemName}`} onClick={() => { setStockItem(item); setStockAction('add'); setStockQty(1); setStockDialog(true); }}>
                              <AddCircle fontSize="small" color="success" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Remove Stock">
                            <IconButton size="small" aria-label={`Remove stock from ${item.itemName}`} onClick={() => { setStockItem(item); setStockAction('deduct'); setStockQty(1); setStockDialog(true); }}>
                              <RemoveCircle fontSize="small" color="error" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Item">
                            <IconButton size="small" aria-label={`Edit ${item.itemName}`} onClick={() => {
                              setEditItem(item);
                              setForm({ itemName: item.itemName, category: item.category, quantity: item.quantity, unit: item.unit || 'unit', minStockLevel: item.minStockLevel, unitPrice: item.unitPrice || '' });
                              setEditDialog(true);
                            }}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" aria-label={`Delete ${item.itemName}`} onClick={() => handleDelete(item)}>
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
            <TextField select label="Unit" fullWidth value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              {UNITS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
            </TextField>
            <TextField label="Minimum Stock Level" type="number" fullWidth value={form.minStockLevel}
              onChange={(e) => setForm({ ...form, minStockLevel: parseInt(e.target.value) || 0 })} />
            <TextField label="Unit Price (₹)" type="number" fullWidth value={form.unitPrice}
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
            <TextField select label="Unit" fullWidth value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              {UNITS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
            </TextField>
            <TextField label="Minimum Stock Level" type="number" fullWidth value={form.minStockLevel}
              onChange={(e) => setForm({ ...form, minStockLevel: parseInt(e.target.value) || 0 })} />
            <TextField label="Unit Price (₹)" type="number" fullWidth value={form.unitPrice}
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
            {stockItem?.itemName} — Currently: <strong>{stockItem?.quantity} {stockItem?.unit || 'units'}</strong>
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={performDelete}
        title="Delete Item"
        message={`Delete **"${deleteTarget?.itemName}"** from inventory? This will remove it permanently.`}
        confirmLabel="Delete"
        confirmColor="error"
        loading={deleteLoading}
        severity="error"
      />
    </Box>
  );
}
