import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Alert, IconButton,
  Tooltip, TextField, MenuItem, InputAdornment, Pagination, ToggleButton,
  ToggleButtonGroup, LinearProgress, useMediaQuery, useTheme, Avatar, Menu, ListItemIcon, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { Visibility, Search, Store, ViewKanban, TableChart, Download, FilterAltOff, Inbox, SearchOff, Today, DateRange, SaveAlt, Bookmark, CheckCircle, HourglassEmpty, FormatQuote, ArrowDropDown, Cancel as CancelIcon, LocalShipping } from '@mui/icons-material';
import { fireConfetti } from '../utils/confetti';
import api from '../api';
import { useToast } from '../context/ToastContext';
import StatusChip from '../components/StatusChip';
import KanbanBoard from '../components/KanbanBoard';
import UrgencyFilter from '../components/UrgencyFilter';
import { DashboardSkeleton } from '../components/Skeletons';
import DashboardHero from '../components/DashboardHero';
import { URGENCY_COLORS } from '../constants';
import { exportToCsv } from '../utils/exportCsv';
import { getAvatarUrl } from '../utils/avatar';

export default function OfficerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const { showToast } = useToast();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [viewMode, setViewMode] = useState('kanban');
  const [kanbanLoading, setKanbanLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const searchInputRef = useRef(null);

  // Saved Filter Presets
  const [savedPresets, setSavedPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('filter_presets') || '[]'); }
    catch { return []; }
  });
  const [presetName, setPresetName] = useState('');
  const [presetDialog, setPresetDialog] = useState(false);
  const [statusMenuAnchor, setStatusMenuAnchor] = useState(null);
  const [statusMenuTarget, setStatusMenuTarget] = useState(null);
  const [statusChanging, setStatusChanging] = useState(false);

  const handleOpenPresetDialog = () => {
    setPresetName('');
    setPresetDialog(true);
  };

  const handleSavePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const preset = {
      id: Date.now(),
      name,
      statusFilter,
      urgencyFilter,
      dateFrom,
      dateTo,
      search: debouncedSearch,
    };
    const updated = [...savedPresets, preset].slice(-10);
    setSavedPresets(updated);
    localStorage.setItem('filter_presets', JSON.stringify(updated));
    setPresetDialog(false);
    showToast(`Filter preset "${name}" saved`, 'success');
  };

  const applyPreset = (preset) => {
    setStatusFilter(preset.statusFilter || 'all');
    setUrgencyFilter(preset.urgencyFilter || 'all');
    setDateFrom(preset.dateFrom || '');
    setDateTo(preset.dateTo || '');
    setSearch(preset.search || '');
    setDebouncedSearch(preset.search || '');
    setPage(1);
    showToast(`Applied preset "${preset.name}"`, 'info');
  };

  const deletePreset = (presetId) => {
    const updated = savedPresets.filter(p => p.id !== presetId);
    setSavedPresets(updated);
    localStorage.setItem('filter_presets', JSON.stringify(updated));
  };

  const handleQuickStatusChange = async (prId, newStatus) => {
    setStatusChanging(true);
    try {
      await api.patch(`/purchase-requests/${prId}/status`, { status: newStatus });
      showToast(`Status updated to ${newStatus}`, 'success');
      // Celebrate when a request is marked delivered 🎉
      if (newStatus === 'delivered') fireConfetti();
      if (viewMode === 'kanban') fetchAllForKanban();
      else fetchRequests();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update status', 'error');
    } finally {
      setStatusChanging(false);
      setStatusMenuAnchor(null);
      setStatusMenuTarget(null);
    }
  };

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (urgencyFilter !== 'all') params.append('urgency', urgencyFilter);
      const res = await api.get(`/purchase-requests?${params}`);
      setPrs(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError('Failed to load purchase requests');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [page, statusFilter, urgencyFilter, debouncedSearch, dateFrom, dateTo]);

  const handleRetry = () => {
    setError('');
    if (viewMode === 'kanban') fetchAllForKanban();
    else fetchRequests();
  };

  const fetchAllForKanban = useCallback(async () => {
    setKanbanLoading(true);
    try {
      const params = new URLSearchParams({ page: 1, limit: 50, view: 'kanban' });
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (urgencyFilter !== 'all') params.append('urgency', urgencyFilter);
      const res = await api.get(`/purchase-requests?${params}`);
      setPrs(res.data.data);
    } catch (err) {
      setError('Failed to load purchase requests');
    } finally {
      setKanbanLoading(false);
      setInitialLoading(false);
    }
  }, [debouncedSearch, statusFilter, urgencyFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (viewMode === 'kanban') {
      fetchAllForKanban();
    } else {
      fetchRequests();
    }
  }, [viewMode, page, statusFilter, debouncedSearch, dateFrom, dateTo, urgencyFilter]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, dateFrom, dateTo, urgencyFilter, viewMode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
    if (e.target.value) setSearching(true);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') {
      setSearch('');
      setDebouncedSearch('');
      setPage(1);
      searchInputRef.current?.blur();
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setUrgencyFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const activeFilterCount = [statusFilter !== 'all', dateFrom !== '', dateTo !== '', urgencyFilter !== 'all'].filter(Boolean).length;
  const hasActiveFilters = search || activeFilterCount > 0;

  const handleExport = () => {
    showToast(`Exporting ${prs.length} row(s) to CSV...`, 'info');
    const columns = [
      { label: 'Item', accessor: 'itemName' },
      { label: 'Requester', accessor: (r) => r.user?.name || 'Unknown' },
      { label: 'Category', accessor: 'category' },
      { label: 'Budget', accessor: (r) => `$${r.budget.toLocaleString()}` },
      { label: 'Urgency', accessor: 'urgency' },
      { label: 'Status', accessor: 'status' },
      { label: 'Quotes', accessor: (r) => r.quotes?.length || 0 },
      { label: 'Date', accessor: (r) => new Date(r.createdAt).toLocaleDateString() },
    ];
    exportToCsv(prs, columns, `purchase-requests-${new Date().toISOString().slice(0, 10)}`);
  };

  // Hero stats — sparklines + progress ring computed from loaded requests
  const heroStats = useMemo(() => {
    const counts = { pending: 0, quoted: 0, ordered: 0, delivered: 0 };
    prs.forEach(p => { if (counts[p.status] !== undefined) counts[p.status]++; });
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days.push(d.toDateString());
    }
    const spark = days.map(day => prs.filter(p => p.createdAt && new Date(p.createdAt).toDateString() === day).length);
    const completion = prs.length > 0 ? Math.round((counts.delivered / prs.length) * 100) : 0;
    return [
      {
        label: 'Total Requests',
        value: prs.length,
        icon: <Inbox />,
        hex: '#1a73e8',
        sparkline: spark,
      },
      {
        label: 'Pending',
        value: counts.pending,
        icon: <HourglassEmpty />,
        hex: '#f9ab00',
        pulse: counts.pending > 0,
      },
      {
        label: 'Quoted',
        value: counts.quoted,
        icon: <FormatQuote />,
        hex: '#4285f4',
      },
      {
        label: 'Delivered',
        value: completion,
        icon: <LocalShipping />,
        hex: '#34a853',
        ring: true,
        subLabel: `${counts.delivered} of ${prs.length} requests`,
      },
    ];
  }, [prs]);
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 8000);
    return () => clearTimeout(t);
  }, [error]);

  if (initialLoading) {
    return <DashboardSkeleton />;
  }

  const isLoading = loading || kanbanLoading;

  return (
    <Box sx={{ position: 'relative', animation: 'fadeInUp 0.35s ease' }}>
      {isLoading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1 }} />}

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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, letterSpacing: '-0.02em' }}>
              All Purchase Requests
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review and manage procurement requests from all managers
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, v) => v && setViewMode(v)}
              size="small"
              sx={{
                '& .MuiToggleButton-root': { px: 1.5, borderRadius: '8px !important', border: '1px solid', borderColor: 'divider' },
              }}
            >
              <ToggleButton value="kanban" aria-label="Kanban view">
                <ViewKanban fontSize="small" />
              </ToggleButton>
              <ToggleButton value="table" aria-label="Table view">
                <TableChart fontSize="small" />
              </ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="contained"
              startIcon={<Store />}
              onClick={() => navigate('/manage-vendors')}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Manage Vendors
            </Button>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2, borderRadius: 2 }}
          action={
            <Button size="small" color="inherit" onClick={handleRetry}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Hero stat cards with sparklines */}
      <DashboardHero stats={heroStats} />

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Search items or requester... (Cmd+/)"
              value={search}
              onChange={handleSearch}
              onKeyDown={handleSearchKeyDown}
              inputRef={searchInputRef}
              sx={{ flex: 1, minWidth: 200 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {searching ? (
                      <Box component="span" sx={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid', borderColor: 'primary.main', borderTopColor: 'transparent', animation: 'spin 0.6s linear infinite' }} />
                    ) : (
                      <Search fontSize="small" />
                    )}
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>Esc ⎚</Typography>
                  </InputAdornment>
                ) : null,
              }}
            />
            <TextField
              size="small"
              select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="quoted">Quoted</MenuItem>
              <MenuItem value="ordered">Ordered</MenuItem>
              <MenuItem value="delivered">Delivered</MenuItem>
              <MenuItem value="rejected">Cancelled</MenuItem>
            </TextField>
            <TextField
              size="small"
              type="date"
              label="From"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 150 }}
            />
            <TextField
              size="small"
              type="date"
              label="To"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 150 }}
            />
            {/* Quick date filters */}
            <Tooltip title="Set date to today">
              <IconButton
                size="small"
                onClick={() => {
                  const today = new Date().toISOString().slice(0, 10);
                  setDateFrom(today);
                  setDateTo(today);
                }}
                sx={{ color: 'text.secondary', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
              >
                <Today fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Set date to this week">
              <IconButton
                size="small"
                onClick={() => {
                  const today = new Date();
                  const dayOfWeek = today.getDay();
                  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                  const monday = new Date(today);
                  monday.setDate(today.getDate() - diff);
                  setDateFrom(monday.toISOString().slice(0, 10));
                  setDateTo(today.toISOString().slice(0, 10));
                }}
                sx={{ color: 'text.secondary', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
              >
                <DateRange fontSize="small" />
              </IconButton>
            </Tooltip>
            {hasActiveFilters && (
              <Tooltip title={`Clear all active filters (${activeFilterCount + (search ? 1 : 0)} active)`}>
                <Button size="small" startIcon={<FilterAltOff />} onClick={clearFilters}>
                  Clear{activeFilterCount + (search ? 1 : 0) > 0 && ` (${activeFilterCount + (search ? 1 : 0)})`}
                </Button>
              </Tooltip>
            )}
            {savedPresets.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'nowrap', alignItems: 'center', overflowX: 'auto', maxWidth: 280, py: 0.5, '&::-webkit-scrollbar': { height: 2 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 1 } }}>
                {savedPresets.map(p => (
                  <Chip
                    key={p.id}
                    icon={<Bookmark fontSize="small" />}
                    label={p.name}
                    size="small"
                    variant="outlined"
                    onClick={() => applyPreset(p)}
                    onDelete={() => deletePreset(p.id)}
                    sx={{ fontSize: '0.75rem', '&:hover': { bgcolor: 'primary.main', color: 'primary.contrastText' } }}
                  />
                ))}
              </Box>
            )}
            {hasActiveFilters && (
              <Tooltip title="Save current filters as preset">
                <IconButton size="small" onClick={handleOpenPresetDialog} sx={{ color: 'text.secondary', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <SaveAlt fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {viewMode === 'table' && prs.length > 0 && (
              <Tooltip title="Download visible data as CSV">
                <Button size="small" startIcon={<Download />} onClick={handleExport}>
                  Export CSV
                </Button>
              </Tooltip>
            )}
          </Box>
        </CardContent>
      </Card>

      <UrgencyFilter urgencyFilter={urgencyFilter} onUrgencyChange={setUrgencyFilter} />

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <KanbanBoard prs={prs} onStatusChange={fetchAllForKanban} />
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <>
          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              {prs.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  {hasActiveFilters ? (
                    <SearchOff sx={{ fontSize: 56, color: 'text.disabled', mb: 1, opacity: 0.5 }} />
                  ) : (
                    <Inbox sx={{ fontSize: 56, color: 'text.disabled', mb: 1, opacity: 0.5 }} />
                  )}
                  <Typography variant="h5" color="text.secondary" sx={{ mb: 1 }}>
                    {hasActiveFilters ? 'No matching requests' : 'No purchase requests yet'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {hasActiveFilters ? 'Try adjusting your filters' : 'Requests from managers will appear here'}
                  </Typography>
                  {hasActiveFilters && (
                    <Button
                      variant="outlined"
                      startIcon={<FilterAltOff />}
                      onClick={clearFilters}
                      sx={{
                        minHeight: 44,
                        animation: 'pulse 2s ease-in-out 1',
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </Box>
              ) : (
            <Box sx={{ position: 'relative' }}>
            <TableContainer
              sx={{
                overflowX: 'auto',
                position: 'relative',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: 40,
                  background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.04))',
                  pointerEvents: 'none',
                  opacity: isMobile ? 1 : 0,
                  transition: 'opacity 0.3s ease',
                },
              }}
            >
              <Table size="small" sx={{ minWidth: isMobile ? 700 : 'auto' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1, borderRight: '1px solid', borderRightColor: 'divider' }}><Tooltip title="Name of the requested item/service" arrow><span>Item</span></Tooltip></TableCell>
                    {!isMobile && <TableCell><Tooltip title="Person who submitted the request" arrow><span>Requester</span></Tooltip></TableCell>}
                    <TableCell><Tooltip title="Item category" arrow><span>Category</span></Tooltip></TableCell>
                    {!isMobile && <TableCell><Tooltip title="Estimated budget" arrow><span>Budget</span></Tooltip></TableCell>}
                    <TableCell><Tooltip title="How urgent is this request" arrow><span>Urgency</span></Tooltip></TableCell>
                    {!isMobile && <TableCell><Tooltip title="Current review status" arrow><span>Status</span></Tooltip></TableCell>}
                    {!isMobile && <TableCell><Tooltip title="Number of quotes received" arrow><span>Quotes</span></Tooltip></TableCell>}
                    <TableCell><Tooltip title="When the request was created" arrow><span>Date</span></Tooltip></TableCell>
                    <TableCell align="right"><Tooltip title="Available actions" arrow><span>Action</span></Tooltip></TableCell>
                  </TableRow>
                </TableHead>
                    <TableBody>
                      {prs.map((pr) => (
                        <TableRow key={pr.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/pr/${pr.id}`)}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{pr.itemName}</Typography>
                            {isMobile && (
                              <Typography variant="caption" color="text.secondary">{pr.category} · ${pr.budget.toLocaleString()}</Typography>
                            )}
                          </TableCell>
                          {!isMobile && (
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              src={getAvatarUrl(pr.user?.name, 28)}
                              alt={pr.user?.name || 'Requester avatar'}
                              sx={{ width: 28, height: 28 }}
                            />
                            <Box>
                              <Typography variant="body2">{pr.user?.name || 'Unknown'}</Typography>
                              <Typography variant="caption" color="text.secondary">{pr.user?.email}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                          )}
                          <TableCell>{pr.category}</TableCell>
                          {!isMobile && (
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>${pr.budget.toLocaleString()}</Typography>
                            </TableCell>
                          )}
                          <TableCell>
                            <Chip
                              label={pr.urgency}
                              size="small"
                              sx={{
                                backgroundColor: URGENCY_COLORS[pr.urgency]?.bg || 'action.hover',
                                color: URGENCY_COLORS[pr.urgency]?.text || 'text.primary',
                                fontWeight: 500,
                                textTransform: 'capitalize',
                                fontSize: '0.75rem',
                              }}
                            />
                          </TableCell>
                          {!isMobile && (
                            <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Chip
                                icon={statusMenuTarget === pr.id ? <ArrowDropDown fontSize="small" /> : undefined}
                                label={pr.status.charAt(0).toUpperCase() + pr.status.slice(1)}
                                size="small"
                                color={pr.status === 'pending' ? 'warning' : pr.status === 'quoted' ? 'info' : pr.status === 'ordered' ? 'primary' : pr.status === 'delivered' ? 'success' : 'error'}
                                onClick={(e) => {
                                  if (user?.role === 'officer' || user?.role === 'admin') {
                                    e.stopPropagation();
                                    setStatusMenuTarget(pr.status === statusMenuTarget ? null : pr.id);
                                    setStatusMenuAnchor(e.currentTarget);
                                  }
                                }}
                                sx={{
                                  fontWeight: 600, fontSize: '0.75rem',
                                  cursor: (user?.role === 'officer' || user?.role === 'admin') ? 'pointer' : 'default',
                                  '&:hover': (user?.role === 'officer' || user?.role === 'admin') ? { filter: 'brightness(1.1)' } : {},
                                }}
                              />
                              <Menu
                                anchorEl={statusMenuAnchor}
                                open={Boolean(statusMenuAnchor) && statusMenuTarget === pr.id}
                                onClose={() => { setStatusMenuAnchor(null); setStatusMenuTarget(null); }}
                                onClick={(e) => e.stopPropagation()}
                                transformOrigin={{ horizontal: 'left', vertical: 'top' }}
                                anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
                                PaperProps={{ sx: { minWidth: 160, borderRadius: 2, mt: 1 } }}
                              >
                                {['pending', 'quoted', 'ordered', 'delivered', 'rejected'].filter(s => s !== pr.status).map(s => (
                                  <MenuItem
                                    key={s}
                                    onClick={() => handleQuickStatusChange(pr.id, s)}
                                    disabled={statusChanging}
                                    sx={{ py: 1 }}
                                  >
                                     <ListItemIcon sx={{ minWidth: 32 }}>
                                       {s === 'pending' ? <HourglassEmpty fontSize="small" color="warning" /> :
                                        s === 'quoted' ? <FormatQuote fontSize="small" color="info" /> :
                                        s === 'ordered' ? <CheckCircle fontSize="small" color="primary" /> :
                                        s === 'rejected' ? <CancelIcon fontSize="small" color="error" /> :
                                        <CheckCircle fontSize="small" color="success" />}
                                     </ListItemIcon>
                                    <ListItemText primary={s.charAt(0).toUpperCase() + s.slice(1)} />
                                  </MenuItem>
                                ))}
                              </Menu>
                            </Box>
                          </TableCell>
                          )}
                          {!isMobile && (
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>{pr.quotes?.length || 0}</Typography>
                            </TableCell>
                          )}
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(pr.createdAt).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="View Details">
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/pr/${pr.id}`); }} aria-label="View details">
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary">
                  Showing {prs.length} of {pagination.total} request(s)
                </Typography>
                {pagination.totalPages > 1 && (
                  <Pagination
                    count={pagination.totalPages}
                    page={page}
                    onChange={(e, v) => setPage(v)}
                    color="primary"
                    size="small"
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        </>
      )}

      {/* Save Filter Preset Dialog */}
      <Dialog open={presetDialog} onClose={() => setPresetDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Save Filter Preset</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Preset Name"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="e.g., High urgency this week"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSavePreset(); } }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPresetDialog(false)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSavePreset}
            disabled={!presetName.trim()}
            sx={{ borderRadius: 2 }}
          >
            Save Preset
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
