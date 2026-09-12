import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, TextField, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, Chip, Grid, Divider, IconButton, Tooltip, LinearProgress,
  Avatar, Link, Breadcrumbs
} from '@mui/material';
import {
  ArrowBack, Add, Send, SmartToy, CheckCircle, CompareArrows,
  Edit, Delete, Undo, CloudUpload, AttachFile, Download, NavigateNext,
  MailOutline, Refresh, Schedule, Cancel as CancelIcon, DoneAll,
  Star, StarBorder, ContentCopy, AttachMoney, TrendingDown, Analytics, Percent
} from '@mui/icons-material';
import api from '../api';
import StatusChip from '../components/StatusChip';
import ProcurementLifecycleStepper from '../components/ProcurementLifecycleStepper';
import NextActionBanner from '../components/NextActionBanner';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { URGENCY_COLORS, CATEGORIES } from '../constants';
import { getAvatarUrl } from '../utils/avatar';
import { renderMarkdown } from '../utils/renderMarkdown';

const COMPLETED_STATUSES = ['ordered', 'delivered'];

export default function PRDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [pr, setPr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add quote
  const [quoteDialog, setQuoteDialog] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [quoteForm, setQuoteForm] = useState({ vendorId: '', price: '', unitPrice: '', deliveryDays: '' });
  const [quoteErrors, setQuoteErrors] = useState({});
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [vendorProducts, setVendorProducts] = useState([]);
  const [vendorProductsLoading, setVendorProductsLoading] = useState(false);

  // Issue PO
  const [poDialog, setPoDialog] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [poLoading, setPoLoading] = useState(false);

  // AI Recommendation
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Edit PR
  const [editDialog, setEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  // Cancel PR
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Rollback
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [rollbackDialog, setRollbackDialog] = useState(false);

  // Delete quote
  const [deleteQuoteDialog, setDeleteQuoteDialog] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState(null);
  const [deleteQuoteLoading, setDeleteQuoteLoading] = useState(false);

  // Mark delivered
  const [deliverLoading, setDeliverLoading] = useState(false);
  const [deliverDialog, setDeliverDialog] = useState(false);

  // Send Quote Requests
  const [sendRequestsDialog, setSendRequestsDialog] = useState(false);
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);
  const [sendRequestsLoading, setSendRequestsLoading] = useState(false);
  const [sendRequestsResults, setSendRequestsResults] = useState(null);
  const [quoteRequests, setQuoteRequests] = useState([]);

  // Star/Favorite
  const [isStarred, setIsStarred] = useState(() => {
    const stars = JSON.parse(localStorage.getItem('starred_prs') || '[]');
    return stars.includes(id);
  });

  const toggleStar = () => {
    const stars = JSON.parse(localStorage.getItem('starred_prs') || '[]');
    if (isStarred) {
      localStorage.setItem('starred_prs', JSON.stringify(stars.filter(s => s !== id)));
    } else {
      localStorage.setItem('starred_prs', JSON.stringify([...stars, id]));
    }
    setIsStarred(!isStarred);
  };

  const handleCopySummary = () => {
    const summary = `PR: ${pr?.itemName}\nStatus: ${pr?.status}\nBudget: ₹${pr?.budget?.toLocaleString('en-IN')}\nQuantity: ${pr?.quantity} ${pr?.unit || 'units'}\nCreated: ${new Date(pr?.createdAt).toLocaleDateString()}`;
    navigator.clipboard.writeText(summary);
    showToast('PR summary copied to clipboard', 'success');
  };

  // Budget utilization
  const getBudgetUtilization = () => {
    const validQuotes = pr?.quotes?.filter(Boolean) || [];
    if (!validQuotes.length) return null;
    const minPrice = Math.min(...validQuotes.map(q => q.price));
    return Math.round((minPrice / pr.budget) * 100);
  };
  const budgetUtil = getBudgetUtilization();

  // Attachments
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef(null);
  const cancelledRef = useRef(false);

  const fetchPR = async () => {
    try {
      const res = await api.get(`/purchase-requests/${id}`);
      if (!cancelledRef.current) setPr(res.data);
    } catch (err) {
      if (!cancelledRef.current) setError('Failed to load purchase request');
    }
  };

  const fetchAttachments = async () => {
    try {
      const res = await api.get(`/purchase-requests/${id}/attachments`);
      if (!cancelledRef.current) setAttachments(res.data);
    } catch (err) {
      if (!cancelledRef.current) setError('Failed to load attachments');
    }
  };

  useEffect(() => {
    cancelledRef.current = false;
    const loadAll = async () => {
      try {
        const [prRes, vendorRes, attRes] = await Promise.all([
          api.get(`/purchase-requests/${id}`),
          api.get('/vendors?limit=100'),
          api.get(`/purchase-requests/${id}/attachments`),
        ]);
        if (!cancelledRef.current) {
          setPr(prRes.data);
          setVendors(vendorRes.data.data);
          setAttachments(attRes.data);
        }
        // Fetch quote requests separately (non-blocking)
        api.get(`/purchase-requests/${id}/quote-requests`).then(res => {
          if (!cancelledRef.current) setQuoteRequests(res.data);
        }).catch(() => {});
      } catch (err) {
        if (!cancelledRef.current) setError('Failed to load purchase request');
      } finally {
        if (!cancelledRef.current) setLoading(false);
      }
    };
    loadAll();
    return () => { cancelledRef.current = true; };
  }, [id]);

  const uploadFiles = async (files) => {
    if (!files.length) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      await api.post(`/purchase-requests/${id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      showToast(`${files.length} file(s) uploaded successfully`);
      fetchAttachments();
    } catch (err) {
      showToast(err.response?.data?.error || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (e) => {
    uploadFiles(Array.from(e.target.files));
  };

  const handleDeleteAttachment = async (attachmentId) => {
    try {
      await api.delete(`/attachments/${attachmentId}`);
      showToast('Attachment deleted');
      fetchAttachments();
    } catch (err) {
      showToast('Failed to delete attachment', 'error');
    }
  };

  const handleAddQuote = async () => {
    const newErrors = {};
    if (!quoteForm.vendorId) newErrors.vendorId = 'Vendor is required';
    const hasPrice = quoteForm.price && parseFloat(quoteForm.price) > 0;
    const hasUnitPrice = quoteForm.unitPrice && parseFloat(quoteForm.unitPrice) > 0;
    if (!hasPrice && !hasUnitPrice) newErrors.price = 'Enter a total price or unit price';
    if (!quoteForm.deliveryDays) newErrors.deliveryDays = 'Delivery days are required';
    else if (parseInt(quoteForm.deliveryDays) < 1) newErrors.deliveryDays = 'Must be at least 1 day';
    setQuoteErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setQuoteLoading(true);
    try {
      const payload = {
        vendorId: quoteForm.vendorId,
        deliveryDays: parseInt(quoteForm.deliveryDays),
      };
      if (hasUnitPrice) payload.unitPrice = parseFloat(quoteForm.unitPrice);
      if (hasPrice) payload.price = parseFloat(quoteForm.price);
      const res = await api.post(`/purchase-requests/${id}/quotes`, payload);
      // Store email in localStorage for EmailPreview
      storeEmailLocally(res.data.etherealUrl, `Quote Request: ${pr?.itemName}`, quoteForm.vendorId);
      showToast('Quote added successfully!');
      setQuoteDialog(false);
      setQuoteForm({ vendorId: '', price: '', unitPrice: '', deliveryDays: '' });
      setQuoteErrors({});
      setVendorProducts([]);
      fetchPR();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add quote', 'error');
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleQuoteVendorChange = async (vendorId) => {
    setQuoteForm(prev => ({ ...prev, vendorId, price: '', unitPrice: '' }));
    if (quoteErrors.vendorId) setQuoteErrors(prev => ({ ...prev, vendorId: '' }));
    if (!vendorId) { setVendorProducts([]); return; }
    // Load the selected vendor's catalog so the officer can quote from their unit prices
    setVendorProductsLoading(true);
    try {
      const res = await api.get(`/vendors/${vendorId}/products`);
      setVendorProducts(res.data.data || []);
    } catch {
      setVendorProducts([]);
    } finally {
      setVendorProductsLoading(false);
    }
  };

  // When a unit price is entered, auto-compute the total (22kg × ₹50 = ₹1100)
  const quoteComputedTotal = (() => {
    if (!quoteForm.unitPrice || parseFloat(quoteForm.unitPrice) <= 0) return null;
    return parseFloat(quoteForm.unitPrice) * (pr?.quantity || 1);
  })();

  const handleIssuePO = async () => {
    if (!selectedQuote) return;
    setPoLoading(true);
    try {
      const res = await api.post(`/purchase-requests/${id}/issue-po`, {
        quoteId: selectedQuote.id,
        vendorId: selectedQuote.vendorId
      });
      // Store email in localStorage for EmailPreview
      storeEmailLocally(res.data.etherealUrl, `Purchase Order: ${pr?.itemName}`, selectedQuote.vendorId);
      showToast(`Purchase order issued to ${res.data.vendorName}!`);
      setPoDialog(false);
      fetchPR();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to issue PO', 'error');
      // If a PO already exists for this request, refresh so the UI reflects reality
      if (err.response?.data?.alreadyOrdered) {
        setPoDialog(false);
        setSelectedQuote(null);
        fetchPR();
      }
    } finally {
      setPoLoading(false);
    }
  };

  const storeEmailLocally = (url, subject, vendorId) => {
    if (!url) return;
    const email = { id: Date.now(), subject, previewUrl: url, sentAt: new Date().toISOString() };
    const existing = JSON.parse(localStorage.getItem('sentEmails') || '[]');
    existing.unshift(email);
    localStorage.setItem('sentEmails', JSON.stringify(existing.slice(0, 20))); // Keep last 20
  };

  const fetchRecommendation = async () => {
    setAiLoading(true);
    try {
      const res = await api.get(`/purchase-requests/${id}/recommendation`);
      setAiData(res.data);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to get recommendation', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleEditClick = () => {
    setEditForm({
      itemName: pr.itemName,
      category: pr.category,
      quantity: pr.quantity.toString(),
      budget: pr.budget.toString(),
      urgency: pr.urgency,
      justification: pr.justification || '',
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
    if (!editForm.itemName.trim()) newErrors.itemName = 'Item name is required';
    if (!editForm.category) newErrors.category = 'Category is required';
    const qty = parseInt(editForm.quantity);
    if (isNaN(qty) || qty < 1) newErrors.quantity = 'Must be at least 1';
    const bud = parseFloat(editForm.budget);
    if (isNaN(bud) || bud < 1) newErrors.budget = 'Must be at least ₹1';
    if (!editForm.urgency) newErrors.urgency = 'Urgency is required';
    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditSubmit = async () => {
    if (!validateEdit()) return;
    setEditLoading(true);
    try {
      await api.put(`/purchase-requests/${id}`, editForm);
      setEditDialog(false);
      showToast('Purchase request updated successfully');
      fetchPR();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancelPR = async () => {
    setCancelLoading(true);
    try {
      await api.patch(`/purchase-requests/${id}/cancel`);
      setCancelDialog(false);
      showToast('Purchase request cancelled');
      fetchPR();
      fetchQuoteRequests();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to cancel', 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleRollback = async () => {
    setRollbackLoading(true);
    try {
      await api.patch(`/purchase-requests/${id}/rollback`);
      setRollbackDialog(false);
      showToast('Status rolled back successfully');
      fetchPR();
      fetchQuoteRequests();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to rollback', 'error');
    } finally {
      setRollbackLoading(false);
    }
  };

  const handleDeleteQuote = async () => {
    if (!quoteToDelete) return;
    setDeleteQuoteLoading(true);
    try {
      await api.delete(`/purchase-requests/${id}/quotes/${quoteToDelete.id}`);
      setDeleteQuoteDialog(false);
      setQuoteToDelete(null);
      showToast('Quote deleted successfully');
      fetchPR();
      fetchQuoteRequests();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete quote', 'error');
    } finally {
      setDeleteQuoteLoading(false);
    }
  };

  const handleMarkDelivered = async () => {
    setDeliverLoading(true);
    try {
      await api.patch(`/purchase-requests/${id}/status`, { status: 'delivered' });
      showToast('Marked as delivered');
      fetchPR();
      fetchQuoteRequests();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update status', 'error');
    } finally {
      setDeliverLoading(false);
    }
  };

  const fetchQuoteRequests = async () => {
    try {
      const res = await api.get(`/purchase-requests/${id}/quote-requests`);
      setQuoteRequests(res.data);
    } catch (err) {
      // silent
    }
  };

  const handleSendRequests = async () => {
    if (selectedVendorIds.length === 0) {
      showToast('Select at least one vendor', 'error');
      return;
    }
    setSendRequestsLoading(true);
    setSendRequestsResults(null);
    try {
      const res = await api.post(`/purchase-requests/${id}/send-requests`, {
        vendorIds: selectedVendorIds
      });
      setSendRequestsResults(res.data.results);
      showToast(`Quote requests sent to ${res.data.results.filter(r => r.status === 'sent').length} vendor(s)`);
      fetchQuoteRequests();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to send requests', 'error');
    } finally {
      setSendRequestsLoading(false);
    }
  };

  const handleToggleVendor = (vendorId) => {
    setSelectedVendorIds(prev =>
      prev.includes(vendorId)
        ? prev.filter(id => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  const handleSelectAllVendors = () => {
    const availableVendors = vendors.filter(v => {
      // Agent-estimated quotes don't block sending a real quote request
      const hasQuote = pr.quotes?.some(q => q.vendorId === v.id && !(q.notes?.includes('Auto-estimated by Procura')));
      const hasCompleted = quoteRequests.some(qr => qr.vendorId === v.id && qr.status === 'completed');
      const hasActive = quoteRequests.some(qr => qr.vendorId === v.id && qr.status === 'sent' && new Date(qr.expiresAt) > new Date());
      return !hasQuote && !hasCompleted && !hasActive;
    });
    setSelectedVendorIds(availableVendors.map(v => v.id));
  };

  const handleResendRequest = async (requestId) => {
    try {
      const res = await api.post(`/purchase-requests/${id}/resend-request/${requestId}`);
      showToast(res.data.message || 'Quote request resent');
      fetchQuoteRequests();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to resend', 'error');
    }
  };

  const handleCancelRequest = async (requestId) => {
    try {
      await api.post(`/purchase-requests/${id}/cancel-request/${requestId}`);
      showToast('Quote request cancelled', 'success');
      fetchQuoteRequests();
      // Also refresh PR — cancel might affect PR status if it was the only pending request
      fetchPR();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to cancel request', 'error');
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

  if (!pr) return null;

  const isOfficer = user?.role === 'officer' || user?.role === 'admin';
  const isManager = user?.role === 'manager' || user?.role === 'admin';
  const isOwner = pr.userId === user?.id || user?.role === 'admin';
  const isCompleted = COMPLETED_STATUSES.includes(pr.status);
  const canEdit = isManager && isOwner && pr.status === 'pending';
  const canCancel = isManager && isOwner && !isCompleted;

  return (
    <Box>
      {/* Breadcrumbs */}
      <Breadcrumbs
        separator={<NavigateNext sx={{ fontSize: 14, color: 'text.disabled' }} />}
        sx={{ mb: 2.5, fontSize: '0.8rem' }}
      >
        <Link
          component={RouterLink}
          to={user?.role === 'manager' ? '/manager-dashboard' : '/officer-dashboard'}
          underline="hover"
          color="text.secondary"
          sx={{ fontSize: '0.8rem', cursor: 'pointer' }}
        >
          {user?.role === 'manager' ? 'My Requests' : 'All Requests'}
        </Link>
        <Typography color="text.primary" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
          {pr?.itemName || 'Request Details'}
        </Typography>
      </Breadcrumbs>

      {/* PR Header */}
      <Card sx={{
        mb: 3,
        background: (theme) => theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, rgba(165,180,252,0.08) 0%, rgba(0,0,0,0.2) 100%)'
          : 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(255,255,255,0.8) 100%)',
        border: '1px solid',
        borderColor: 'divider',
      }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, letterSpacing: '-0.02em' }}>
                  {pr.itemName}
                </Typography>
                <Tooltip title={isStarred ? 'Remove from favorites' : 'Add to favorites'}>
                  <IconButton size="small" onClick={toggleStar} sx={{ color: isStarred ? 'warning.main' : 'text.disabled', mb: 0.5 }}>
                    {isStarred ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Copy PR summary">
                  <IconButton size="small" onClick={handleCopySummary} sx={{ mb: 0.5 }}>
                    <ContentCopy fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <StatusChip status={pr.status} />
                <Chip
                  label={pr.urgency}
                  size="small"
                  sx={{
                    backgroundColor: URGENCY_COLORS[pr.urgency]?.bg || 'action.hover',
                    color: URGENCY_COLORS[pr.urgency]?.text || 'text.primary',
                    fontWeight: 500, textTransform: 'capitalize', fontSize: '0.75rem',
                  }}
                />
                <Chip label={pr.category} size="small" variant="outlined" />
              </Box>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Created {new Date(pr.createdAt).toLocaleDateString()}
            </Typography>
          </Box>

          <Grid container spacing={3} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Quantity</Typography>
              <Typography variant="body2" fontWeight={600}>{pr.quantity} {pr.unit || 'units'}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Budget</Typography>
              <Typography variant="body2" fontWeight={600}>₹{pr.budget.toLocaleString('en-IN')}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Requester</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.3 }}>
                <Avatar
                  src={getAvatarUrl(pr.user?.name, 24)}
                  alt={pr.user?.name || 'Requester avatar'}
                  sx={{ width: 24, height: 24 }}
                />
                <Typography variant="body2">{pr.user?.name || 'N/A'}</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>                <Typography variant="caption" color="text.secondary">Total Quotes</Typography>
              <Typography variant="body2" fontWeight={600}>{pr.quotes?.filter(Boolean).length || 0}</Typography>
            </Grid>
          </Grid>

          {budgetUtil !== null && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" fontWeight={500}>Budget Utilization</Typography>
                <Typography variant="caption" fontWeight={600} color={budgetUtil > 100 ? 'error.main' : budgetUtil > 80 ? 'warning.main' : 'success.main'}>
                  {budgetUtil}% (₹{Math.min(...(pr.quotes?.filter(Boolean) || []).map(q => q.price)).toLocaleString('en-IN')} / ₹{pr.budget.toLocaleString('en-IN')})
                </Typography>
              </Box>
              <Box sx={{ width: '100%', bgcolor: 'action.hover', borderRadius: 1, height: 8, overflow: 'hidden' }}>
                <Box sx={{
                  width: `${Math.min(budgetUtil, 100)}%`,
                  height: '100%',
                  borderRadius: 1,
                  transition: 'width 0.5s ease',
                  background: budgetUtil > 100
                    ? 'linear-gradient(90deg, #f44336, #d32f2f)'
                    : budgetUtil > 80
                      ? 'linear-gradient(90deg, #ff9800, #f57c00)'
                      : 'linear-gradient(90deg, #4caf50, #388e3c)',
                }} />
              </Box>
            </Box>
          )}

          {pr.justification && (
            <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Justification
              </Typography>
              <Typography variant="body2">{pr.justification}</Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Lifecycle Stepper */}
      <Card sx={{ mb: 2, overflow: 'visible' }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography
              sx={{
                fontSize: '0.6rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: 'text.disabled',
              }}
            >
              Lifecycle
            </Typography>
            <StatusChip status={pr.status} />
          </Box>
          <ProcurementLifecycleStepper
            status={pr.status}
            quoteCount={pr.quotes?.length || 0}
          />
        </CardContent>
      </Card>

      {/* Next Action Banner */}
      <NextActionBanner
        pr={pr}
        isOfficer={isOfficer}
        quoteCount={pr.quotes?.length || 0}
        onRequestQuotes={() => { setSelectedVendorIds([]); setSendRequestsResults(null); setSendRequestsDialog(true); fetchQuoteRequests(); }}
        onCompare={() => navigate(`/pr/${id}/compare`)}
        onMarkDelivered={() => setDeliverDialog(true)}
      />

      {/* Actions */}
      {isOfficer && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {!isCompleted && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setQuoteDialog(true)}
              sx={{ borderRadius: 2 }}
            >
              Add Quote
            </Button>
          )}
          {!isCompleted && (
            <Button
              variant="outlined"
              startIcon={<MailOutline />}
              onClick={() => { setSelectedVendorIds([]); setSendRequestsResults(null); setSendRequestsDialog(true); fetchQuoteRequests(); }}
              sx={{ borderRadius: 2 }}
            >
              Send Quote Requests
            </Button>
          )}
          {pr.status === 'ordered' && (
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircle />}
              onClick={() => setDeliverDialog(true)}
              disabled={deliverLoading}
              sx={{ borderRadius: 2 }}
            >
              {deliverLoading ? 'Updating...' : 'Mark as Delivered'}
            </Button>
          )}
          {(pr.status === 'ordered' || pr.status === 'quoted') && (
            <Button
              variant="outlined"
              color="warning"
              startIcon={rollbackLoading ? <CircularProgress size={18} /> : <Undo />}
              onClick={() => setRollbackDialog(true)}
              disabled={rollbackLoading}
              sx={{ borderRadius: 2 }}
            >
              Rollback Status
            </Button>
          )}
          {pr.quotes?.length > 0 && (
            <>
              <Button
                variant="outlined"
                startIcon={aiLoading ? <CircularProgress size={18} /> : <SmartToy />}
                onClick={fetchRecommendation}
                disabled={aiLoading}
                sx={{ borderRadius: 2 }}
              >
                AI Recommendation
              </Button>
              <Button
                variant="outlined"
                color="success"
                startIcon={<CompareArrows />}
                onClick={() => navigate(`/pr/${id}/compare`)}
                sx={{ borderRadius: 2 }}
              >
                Compare Vendors
              </Button>
            </>
          )}
        </Box>
      )}

      {/* Manager Actions */}
      {isManager && isOwner && (canEdit || canCancel) && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {canEdit && (
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={handleEditClick}
              sx={{ borderRadius: 2 }}
            >
              Edit Request
            </Button>
          )}
          {canCancel && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={() => setCancelDialog(true)}
              sx={{ borderRadius: 2 }}
            >
              Cancel Request
            </Button>
          )}
        </Box>
      )}

      {/* AI Recommendation */}
      {aiData && (
        <Card sx={{ mb: 3, border: '2px solid', borderColor: 'primary.main' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SmartToy color="primary" />
              <Typography variant="h6">AI Vendor Recommendation</Typography>
              {aiData.recommendation?.fallback && (
                <Chip label="Automatic analysis" size="small" color="warning" />
              )}
            </Box>

            <Box sx={{ mb: 2, '& ul, & ol': { my: 0.5 } }}>
              {renderMarkdown(aiData.recommendation?.explanation || 'No recommendation available')}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Vendor Rankings</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Rank</TableCell>
                    <TableCell>Vendor</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Delivery</TableCell>
                    <TableCell align="right">Score</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {aiData.rankedVendors?.map((v, i) => (
                    <TableRow key={v.vendorId} sx={i === 0 ? { bgcolor: 'action.hover' } : {}}>
                      <TableCell>
                        <Chip
                          label={`#${i + 1}`}
                          size="small"
                          color={i === 0 ? 'primary' : 'default'}
                          sx={{ fontWeight: 600, minWidth: 36 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={i === 0 ? 600 : 400}>
                          {v.vendorName}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">₹{v.price.toLocaleString('en-IN')}</TableCell>
                      <TableCell align="right">{v.deliveryDays} days</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600} color={i === 0 ? 'primary.main' : 'text.primary'}>
                          {v.scores.total}/100
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {aiData.costAnalysis && (
              <Box sx={{ mt: 2, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Box sx={{ bgcolor: 'success.main', p: 1.5, borderRadius: 2, color: 'white', minWidth: 160 }}>
                  <Typography variant="caption" sx={{ opacity: 0.85 }}>Potential Savings</Typography>
                  <Typography variant="h6" fontWeight={700}>
                    ₹{aiData.costAnalysis.potentialSavings.toLocaleString('en-IN')}
                  </Typography>
                </Box>
                <Box sx={{ bgcolor: 'primary.main', p: 1.5, borderRadius: 2, color: 'white', minWidth: 160 }}>
                  <Typography variant="caption" sx={{ opacity: 0.85 }}>Budget Status</Typography>
                  <Typography variant="body2" fontWeight={600}>{aiData.costAnalysis.budgetComparison}</Typography>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quote Request Tracking */}
      {quoteRequests.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                Quote Request Status ({quoteRequests.length})
              </Typography>
              <Chip
                size="small"
                label={`${quoteRequests.filter(qr => qr.status === 'completed').length}/${quoteRequests.length} submitted`}
                color={quoteRequests.every(qr => qr.status === 'completed') ? 'success' : 'default'}
              />
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Vendor</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell>Sent</TableCell>
                    <TableCell>Deadline</TableCell>
                    <TableCell align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {quoteRequests.map((qr) => {
                    const isExpired = qr.expiresAt && new Date(qr.expiresAt) < new Date();
                    const statusLabel = qr.status === 'completed' ? 'Submitted'
                      : isExpired ? 'Expired'
                      : qr.status === 'sent' ? 'Pending'
                      : qr.status;
                    const statusColor = qr.status === 'completed' ? 'success'
                      : isExpired ? 'error'
                      : qr.status === 'sent' ? 'warning'
                      : 'default';
                    const statusIcon = qr.status === 'completed' ? <DoneAll fontSize="small" />
                      : isExpired ? <CancelIcon fontSize="small" />
                      : <Schedule fontSize="small" />;

                    return (
                      <TableRow key={qr.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{qr.vendor?.name || 'Unknown'}</Typography>
                          <Typography variant="caption" color="text.secondary">{qr.vendor?.email}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            icon={statusIcon}
                            label={statusLabel}
                            size="small"
                            color={statusColor}
                            variant={qr.status === 'completed' ? 'filled' : 'outlined'}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {qr.sentAt ? new Date(qr.sentAt).toLocaleDateString() : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {qr.expiresAt ? (
                            <Typography
                              variant="body2"
                              sx={{ color: isExpired ? 'error.main' : 'text.primary' }}
                            >
                              {new Date(qr.expiresAt).toLocaleDateString()}
                            </Typography>
                          ) : '—'}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            {(qr.status === 'sent' || isExpired || qr.status === 'cancelled') && qr.status !== 'completed' && (
                              <>
                                {(isExpired || qr.status === 'cancelled') && (
                                  <Tooltip title={qr.status === 'cancelled' ? 'Re-send quote request' : 'Resend quote request'}>
                                    <IconButton size="small" color="primary" onClick={() => handleResendRequest(qr.id)}>
                                      <Refresh fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                {qr.status !== 'cancelled' && (
                                  <Tooltip title="Cancel quote request">
                                    <IconButton size="small" color="error" onClick={() => handleCancelRequest(qr.id)}>
                                      <CancelIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Quotes */}
      <Typography variant="h6" sx={{ mb: 1 }}>Quotes ({pr.quotes?.length || 0})</Typography>

      {(pr.quotes?.filter(Boolean).length ?? 0) > 0 && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Chip
            size="small"
            label={`${pr.quotes.filter(Boolean).length} quote${pr.quotes.filter(Boolean).length !== 1 ? 's' : ''}`}
            icon={<AttachMoney fontSize="small" />}
            variant="outlined"
            sx={{ backgroundColor: 'rgba(99,102,241,0.08)', color: '#6366f1' }}
          />
          <Chip
            size="small"
            label={`Lowest: ₹${Math.min(...pr.quotes.filter(Boolean).map(q => q.price)).toLocaleString()}`}
            icon={<TrendingDown fontSize="small" />}
            variant="outlined"
            sx={{ backgroundColor: 'rgba(16,185,129,0.08)', color: '#10b981' }}
          />
          <Chip
            size="small"
            label={`Avg: ₹${Math.round(pr.quotes.filter(Boolean).reduce((a,q) => a + q.price, 0) / pr.quotes.filter(Boolean).length).toLocaleString()}`}
            icon={<Analytics fontSize="small" />}
            variant="outlined"
            sx={{ backgroundColor: 'rgba(245,158,11,0.08)', color: '#f59e0b' }}
          />
          {budgetUtil !== null && (
            <Chip
              size="small"
              label={`Budget: ${budgetUtil}%`}
              icon={<Percent fontSize="small" />}
              variant="outlined"
              sx={{ backgroundColor: budgetUtil <= 100 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', color: budgetUtil <= 100 ? '#10b981' : '#ef4444' }}
            />
          )}
        </Box>
      )}

      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {(!pr.quotes || pr.quotes.length === 0) ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="body1" color="text.secondary">No quotes yet</Typography>
              {isOfficer && !isCompleted && (
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={() => setQuoteDialog(true)}
                  sx={{ mt: 2, borderRadius: 2 }}
                >
                  Add First Quote
                </Button>
              )}
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Vendor</TableCell>
                    <TableCell>Price</TableCell>
                    <TableCell>Delivery</TableCell>
                    <TableCell>Unit Price</TableCell>
                    <TableCell>Date</TableCell>
                    {isOfficer && <TableCell align="right">Action</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pr.quotes?.filter(Boolean).map((quote) => (
                    <TableRow key={quote.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{quote.vendor?.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{quote.vendor?.email}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>₹{quote.price.toLocaleString()}</Typography>
                        {quote.unitPrice && (
                          <Typography variant="caption" color="text.secondary">
                            ₹{quote.unitPrice.toLocaleString()}/{pr.unit || 'unit'}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{quote.deliveryDays} days</TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {quote.unitPrice
                            ? `₹${quote.unitPrice.toLocaleString()}/${pr.unit || 'unit'}`
                            : `₹${(quote.price / pr.quantity).toFixed(2)}/${pr.unit || 'unit'}`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(quote.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      {isOfficer && (
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<CheckCircle />}
                              onClick={() => {
                                setSelectedQuote(quote);
                                setPoDialog(true);
                              }}
                              disabled={isCompleted}
                              sx={{ borderRadius: 2 }}
                            >
                              {isCompleted ? 'Completed' : 'Issue PO'}
                            </Button>
                            {!isCompleted && (
                              <Tooltip title="Delete Quote">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setQuoteToDelete(quote);
                                    setDeleteQuoteDialog(true);
                                  }}
                                  aria-label="Delete quote"
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Add Quote Dialog */}
      <Dialog open={quoteDialog} onClose={() => setQuoteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Add Quote</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              select
              label="Vendor"
              value={quoteForm.vendorId}
              onChange={(e) => handleQuoteVendorChange(e.target.value)}
              error={!!quoteErrors.vendorId}
              helperText={quoteErrors.vendorId}
              sx={{ mb: 2 }}
            >
              {vendors.map(v => (
                <MenuItem key={v.id} value={v.id}>
                  {v.name} — {v.category}
                </MenuItem>
              ))}
            </TextField>

            {vendorProducts.length > 0 && (
              <Box sx={{ mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  {vendorProducts.find(vp => vp.category === pr?.category) ? 'Catalog prices (this category)' : 'Available products'}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.75 }}>
                  {vendorProducts
                    .filter(vp => !pr?.category || vp.category === pr?.category || vendorProducts.length <= 6)
                    .slice(0, 6)
                    .map(vp => (
                      <Chip
                        key={vp.id}
                        size="small"
                        label={`${vp.name}: ₹${vp.unitPrice}/${vp.unit}`}
                        onClick={() => setQuoteForm(p => ({ ...p, unitPrice: vp.unitPrice.toString(), price: '' }))}
                        title={`Click to use ₹${vp.unitPrice}/${vp.unit}`}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                </Box>
                {vendorProductsLoading && <CircularProgress size={14} sx={{ mt: 1 }} />}
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
              <TextField
                fullWidth
                label={`Unit Price (₹ per ${pr?.unit || 'unit'})`}
                type="number"
                value={quoteForm.unitPrice}
                onChange={(e) => { setQuoteForm(p => ({ ...p, unitPrice: e.target.value, price: '' })); if (quoteErrors.price) setQuoteErrors(p => ({ ...p, price: '' })); }}
                inputProps={{ min: 0, step: 0.01 }}
              />
              <TextField
                fullWidth
                label="Total Price (₹)"
                type="number"
                value={quoteForm.price}
                onChange={(e) => { setQuoteForm(p => ({ ...p, price: e.target.value, unitPrice: '' })); if (quoteErrors.price) setQuoteErrors(p => ({ ...p, price: '' })); }}
                error={!!quoteErrors.price}
                helperText={quoteErrors.price}
                inputProps={{ min: 0, step: 0.01 }}
              />
              <TextField
                fullWidth
                label="Delivery (days)"
                type="number"
                value={quoteForm.deliveryDays}
                onChange={(e) => { setQuoteForm(p => ({ ...p, deliveryDays: e.target.value })); if (quoteErrors.deliveryDays) setQuoteErrors(p => ({ ...p, deliveryDays: '' })); }}
                error={!!quoteErrors.deliveryDays}
                helperText={quoteErrors.deliveryDays}
                inputProps={{ min: 1 }}
              />
            </Box>

            {quoteComputedTotal !== null && (
              <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {pr?.quantity} {pr?.unit || 'unit'}s × ₹{parseFloat(quoteForm.unitPrice).toLocaleString()}
                </Typography>
                <Typography variant="body1" fontWeight={600} color="primary.main">
                  Total: ₹{quoteComputedTotal.toLocaleString()}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setQuoteDialog(false)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddQuote}
            disabled={quoteLoading}
            startIcon={quoteLoading ? <CircularProgress size={18} /> : <Send />}
            sx={{ borderRadius: 2 }}
          >
            {quoteLoading ? 'Sending...' : 'Add Quote'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Issue PO Dialog */}
      <Dialog open={poDialog} onClose={() => setPoDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Issue Purchase Order</DialogTitle>
        <DialogContent>
          {selectedQuote && (
            <Box sx={{ pt: 1 }}>
              <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 2, mb: 2 }}>
                <Typography variant="body2" fontWeight={600}>{selectedQuote.vendor?.name}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Price: <strong>₹{selectedQuote.price.toLocaleString('en-IN')}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Delivery: <strong>{selectedQuote.deliveryDays} days</strong>
                </Typography>
              </Box>
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                This will send a purchase order email to the vendor and update the request status to "Ordered".
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setPoDialog(false)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleIssuePO}
            disabled={poLoading || isCompleted}
            startIcon={poLoading ? <CircularProgress size={18} /> : <CheckCircle />}
            sx={{ borderRadius: 2 }}
          >
            {poLoading ? 'Issuing...' : 'Confirm & Issue PO'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit PR Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Edit Purchase Request</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth label="Item Name" value={editForm.itemName}
                onChange={handleEditChange('itemName')}
                error={!!editErrors.itemName} helperText={editErrors.itemName}
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
                fullWidth select label="Urgency" value={editForm.urgency}
                onChange={handleEditChange('urgency')}
                error={!!editErrors.urgency} helperText={editErrors.urgency}
              >
                {['low', 'medium', 'high', 'critical'].map(u => (
                  <MenuItem key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth label="Quantity" type="number" value={editForm.quantity}
                onChange={handleEditChange('quantity')}
                error={!!editErrors.quantity} helperText={editErrors.quantity}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth label="Budget (₹)" type="number" value={editForm.budget}
                onChange={handleEditChange('budget')}
                error={!!editErrors.budget} helperText={editErrors.budget}
                inputProps={{ min: 1, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth multiline rows={3} label="Justification" value={editForm.justification}
                onChange={handleEditChange('justification')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setEditDialog(false)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button
            variant="contained" onClick={handleEditSubmit} disabled={editLoading}
            sx={{ borderRadius: 2 }}
          >
            {editLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel PR Dialog */}
      <Dialog open={cancelDialog} onClose={() => setCancelDialog(false)}>
        <DialogTitle sx={{ fontWeight: 600 }}>Cancel Purchase Request</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel <strong>{pr.itemName}</strong>? This will reject the request.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setCancelDialog(false)} sx={{ borderRadius: 2 }}>No, Keep It</Button>
          <Button
            variant="contained" color="error" onClick={handleCancelPR} disabled={cancelLoading}
            sx={{ borderRadius: 2 }}
          >
            {cancelLoading ? 'Cancelling...' : 'Yes, Cancel'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Quote Dialog */}
      <Dialog open={deleteQuoteDialog} onClose={() => setDeleteQuoteDialog(false)}>
        <DialogTitle sx={{ fontWeight: 600 }}>Delete Quote</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the quote from <strong>{quoteToDelete?.vendor?.name}</strong> for{' '}
            <strong>₹{quoteToDelete?.price?.toLocaleString('en-IN')}</strong>?
          </Typography>
          {pr.quotes?.length === 1 && (
            <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
              This is the only quote. Deleting it will revert the status back to "Pending".
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setDeleteQuoteDialog(false)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button
            variant="contained" color="error" onClick={handleDeleteQuote} disabled={deleteQuoteLoading}
            sx={{ borderRadius: 2 }}
          >
            {deleteQuoteLoading ? 'Deleting...' : 'Delete Quote'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mark Delivered Dialog */}
      <Dialog open={deliverDialog} onClose={() => setDeliverDialog(false)}>
        <DialogTitle sx={{ fontWeight: 600 }}>Mark as Delivered</DialogTitle>
        <DialogContent>
          <Typography>
            Confirm that <strong>{pr.itemName}</strong> has been delivered?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setDeliverDialog(false)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button
            variant="contained" color="success" onClick={() => { setDeliverDialog(false); handleMarkDelivered(); }} disabled={deliverLoading}
            sx={{ borderRadius: 2 }}
          >
            {deliverLoading ? 'Updating...' : 'Confirm Delivered'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rollback Dialog */}
      <Dialog open={rollbackDialog} onClose={() => setRollbackDialog(false)}>
        <DialogTitle sx={{ fontWeight: 600 }}>Rollback Status</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to roll back <strong>{pr.itemName}</strong> from{' '}
            <strong>{pr.status}</strong> to <strong>{pr.status === 'ordered' ? 'quoted' : 'pending'}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setRollbackDialog(false)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button
            variant="contained" color="warning" onClick={handleRollback} disabled={rollbackLoading}
            sx={{ borderRadius: 2 }}
          >
            {rollbackLoading ? 'Rolling back...' : 'Confirm Rollback'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Send Quote Requests Dialog */}
      <Dialog open={sendRequestsDialog} onClose={() => setSendRequestsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Send Quote Requests</DialogTitle>
        <DialogContent>
          {sendRequestsResults ? (
            <Box sx={{ pt: 1 }}>
              <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                Quote requests processed successfully
              </Alert>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Vendor</TableCell>
                      <TableCell align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sendRequestsResults.map((r) => (
                      <TableRow key={r.vendorId}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{r.vendorName}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={r.status === 'sent' ? 'Email Sent' : r.status === 'skipped' ? 'Skipped' : 'Email Failed'}
                            size="small"
                            color={r.status === 'sent' ? 'success' : r.status === 'skipped' ? 'default' : 'error'}
                          />
                          {r.reason && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                              {r.reason}
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Select vendors to send quote request emails. Each vendor will receive a unique link to submit their proposal.
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button size="small" variant="outlined" onClick={handleSelectAllVendors}>
                  Select All Available
                </Button>
                <Button size="small" variant="outlined" onClick={() => setSelectedVendorIds([])}>
                  Clear Selection
                </Button>
                {selectedVendorIds.length > 0 && (
                  <Chip label={`${selectedVendorIds.length} selected`} color="primary" size="small" />
                )}
              </Box>

              <TableContainer sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">Select</TableCell>
                      <TableCell>Vendor</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {vendors.map((vendor) => {
                      const hasQuote = pr.quotes?.some(q => q.vendorId === vendor.id);
                      const hasCompleted = quoteRequests.some(qr => qr.vendorId === vendor.id && qr.status === 'completed');
                      const hasActive = quoteRequests.some(qr => qr.vendorId === vendor.id && qr.status === 'sent' && new Date(qr.expiresAt) > new Date());
                      const hasCancelled = quoteRequests.some(qr => qr.vendorId === vendor.id && qr.status === 'cancelled');
                      const hasExpired = quoteRequests.some(qr => qr.vendorId === vendor.id && (qr.status === 'expired' || (qr.status === 'sent' && new Date(qr.expiresAt) <= new Date())));
                      const isDisabled = hasQuote || hasCompleted || hasActive;
                      const isSelected = selectedVendorIds.includes(vendor.id);

                      return (
                        <TableRow
                          key={vendor.id}
                          hover={!isDisabled}
                          sx={{ opacity: isDisabled ? 0.5 : 1 }}
                        >
                          <TableCell padding="checkbox">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isDisabled}
                              onChange={() => handleToggleVendor(vendor.id)}
                              style={{ width: 18, height: 18, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>{vendor.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{vendor.email}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={vendor.category} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell align="center">
                            {hasQuote ? (
                              <Chip label="Quoted" size="small" color="success" />
                            ) : hasCompleted ? (
                              <Chip label="Submitted" size="small" color="info" />
                            ) : hasActive ? (
                              <Chip label="Pending" size="small" color="warning" />
                            ) : hasCancelled || hasExpired ? (
                              <Chip label="Cancelled/Expired" size="small" color="warning" variant="outlined" />
                            ) : (
                              <Chip label="Available" size="small" variant="outlined" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setSendRequestsDialog(false)} sx={{ borderRadius: 2 }}>
            {sendRequestsResults ? 'Close' : 'Cancel'}
          </Button>
          {!sendRequestsResults && (
            <Button
              variant="contained"
              startIcon={sendRequestsLoading ? <CircularProgress size={18} /> : <MailOutline />}
              onClick={handleSendRequests}
              disabled={sendRequestsLoading || selectedVendorIds.length === 0}
              sx={{ borderRadius: 2 }}
            >
              {sendRequestsLoading ? 'Sending...' : `Send to ${selectedVendorIds.length} Vendor(s)`}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Attachments */}
      <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>
        Attachments ({attachments.length})
      </Typography>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          {/* Drag & Drop Zone */}
          <Box
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dragCounterRef.current += 1;
              setDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dragCounterRef.current -= 1;
              if (dragCounterRef.current === 0) {
                setDragOver(false);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOver(false);
              dragCounterRef.current = 0;
              const files = Array.from(e.dataTransfer.files);
              if (files.length > 0) {
                uploadFiles(files);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            sx={{
              border: '2px dashed',
              borderColor: dragOver ? 'primary.main' : 'divider',
              borderRadius: 3,
              p: 4,
              mb: 2,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              bgcolor: dragOver ? 'action.hover' : 'transparent',
              '&:hover': {
                borderColor: 'primary.light',
                bgcolor: 'action.hover',
              },
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              multiple
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.txt,.csv"
            />
            <CloudUpload
              sx={{
                fontSize: 48,
                color: dragOver ? 'primary.main' : 'text.secondary',
                mb: 1.5,
                transition: 'transform 0.25s ease, color 0.25s ease',
                transform: dragOver ? 'translateY(-4px)' : 'none',
              }}
            />
            <Typography variant="body1" fontWeight={500} sx={{ mb: 0.5 }}>
              {dragOver ? 'Drop files here' : 'Drag & drop files or click to browse'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              PDF, Images, Word, Excel, Text — max 10MB each
            </Typography>
          </Box>

          {uploading && (
            <Box sx={{ mb: 2, animation: 'fadeIn 0.2s ease' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" fontWeight={500}>Uploading...</Typography>
                <Typography variant="caption" color="text.secondary">{uploadProgress}%</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={uploadProgress}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 3,
                    transition: 'transform 0.3s ease',
                  },
                }}
              />
            </Box>
          )}

          {attachments.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <AttachFile sx={{ fontSize: 40, color: 'text.secondary', mb: 1, opacity: 0.4 }} />
              <Typography variant="body2" color="text.secondary">No attachments yet</Typography>
            </Box>
          ) : (
            <Box sx={{ animation: 'fadeInUp 0.3s ease' }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>File</TableCell>
                      <TableCell>Size</TableCell>
                      <TableCell>Uploaded by</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {attachments.map((att) => (
                      <TableRow key={att.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AttachFile fontSize="small" color="primary" />
                            <Typography variant="body2" fontWeight={500}>{att.originalName}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {att.size > 1024 * 1024
                              ? `${(att.size / (1024 * 1024)).toFixed(1)} MB`
                              : `${(att.size / 1024).toFixed(1)} KB`}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{att.user?.name || 'Unknown'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(att.createdAt).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                            <Tooltip title="Download">
                              <IconButton
                                size="small"
                                component="a"
                                href={`/api/attachments/${att.id}/download`}
                                target="_blank"
                                aria-label="Download file"
                                sx={{
                                  transition: 'all 0.2s ease',
                                  '&:hover': { bgcolor: 'primary.main', color: 'white' },
                                }}
                              >
                                <Download fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteAttachment(att.id)}
                                aria-label="Delete attachment"
                                sx={{
                                  transition: 'all 0.2s ease',
                                  '&:hover': { bgcolor: 'error.main', color: 'white' },
                                }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
