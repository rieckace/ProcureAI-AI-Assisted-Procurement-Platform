import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Alert, IconButton,
  Tooltip, TextField, MenuItem, InputAdornment, Pagination, ToggleButton,
  ToggleButtonGroup, LinearProgress, useMediaQuery, useTheme, Avatar
} from '@mui/material';
import { Visibility, Search, Store, ViewKanban, TableChart, Download, FilterAltOff, Inbox, SearchOff, Today, DateRange } from '@mui/icons-material';
import api from '../api';
import { useToast } from '../context/ToastContext';
import StatusChip from '../components/StatusChip';
import KanbanBoard from '../components/KanbanBoard';
import UrgencyFilter from '../components/UrgencyFilter';
import { DashboardSkeleton } from '../components/Skeletons';
import { URGENCY_COLORS } from '../constants';
import { exportToCsv } from '../utils/exportCsv';
import { getAvatarUrl } from '../utils/avatar';

export default function OfficerDashboard() {
  const navigate = useNavigate();
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

  const summaryStats = useMemo(() => {
    const counts = { pending: 0, quoted: 0, ordered: 0 };
    prs.forEach(p => { if (counts[p.status] !== undefined) counts[p.status]++; });
    return [
      { label: 'Total', count: prs.length, color: 'primary.main', bg: 'rgba(26,115,232,0.12)' },
      { label: 'Pending', count: counts.pending, color: 'warning.main', bg: 'rgba(249,171,0,0.12)' },
      { label: 'Quoted', count: counts.quoted, color: 'info.main', bg: 'rgba(33,150,243,0.12)' },
      { label: 'Ordered', count: counts.ordered, color: 'primary.main', bg: 'rgba(26,115,232,0.12)' },
    ];
  }, [prs]);

  // Auto-dismiss errors (must be before early return — Rules of Hooks)
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            All Purchase Requests
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ animation: 'fadeInUp 0.3s ease' }}>
            Review and manage procurement requests from all managers
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, v) => v && setViewMode(v)}
            size="small"
            sx={{ '& .MuiToggleButton-root': { px: 1.5 } }}
          >
            <ToggleButton value="kanban" aria-label="Kanban view">
              <ViewKanban fontSize="small" />
            </ToggleButton>
            <ToggleButton value="table" aria-label="Table view">
              <TableChart fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="outlined"
            startIcon={<Store />}
            onClick={() => navigate('/manage-vendors')}
            sx={{ borderRadius: 2 }}
          >
            Manage Vendors
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
      )}

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
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ minWidth: 150 }}
            />
            <TextField
              size="small"
              type="date"
              label="To"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
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
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', animation: 'fadeInUp 0.3s ease' }}>
            {summaryStats.map((stat) => (
              <Tooltip key={stat.label} title={`${stat.count} ${stat.label.toLowerCase()} request(s)`} arrow>
                <Card sx={{ flex: 1, minWidth: 120 }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: stat.color, mb: 0.5 }}>
                      {stat.count}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                  </CardContent>
                </Card>
              </Tooltip>
            ))}
          </Box>

          <Card>
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
                          {!isMobile && <TableCell><StatusChip status={pr.status} /></TableCell>}
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
              {pagination.totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <Pagination
                    count={pagination.totalPages}
                    page={page}
                    onChange={(e, v) => setPage(v)}
                    color="primary"
                    size="small"
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}
