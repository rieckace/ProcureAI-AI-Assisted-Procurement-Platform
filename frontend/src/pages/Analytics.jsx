import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, CircularProgress, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Tooltip, Button, useMediaQuery, Skeleton, Alert
} from '@mui/material';
import { Visibility, TrendingUp, AttachMoney, Inventory, HourglassBottom, Download, Inbox, SearchOff } from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api';
import StatusChip from '../components/StatusChip';
import { URGENCY_COLORS } from '../constants';
import { exportToCsv } from '../utils/exportCsv';

const CHART_COLORS = ['#06b6d4', '#f43f5e', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#6366f1', '#14b8a6'];
const STATUS_COLORS = {
  pending: '#f59e0b',
  quoted: '#3b82f6',
  ordered: '#8b5cf6',
  delivered: '#10b981',
  rejected: '#f43f5e',
};

const OVERVIEW_CARDS = [
  { key: 'totalPRs', label: 'Total Requests', icon: <Inventory />, color: 'primary.main', bg: 'rgba(26,115,232,0.12)' },
  { key: 'totalBudget', label: 'Total Budget', icon: <AttachMoney />, color: 'success.main', bg: 'rgba(46,125,50,0.12)', format: 'currency' },
  { key: 'pending', label: 'Pending', icon: <HourglassBottom />, color: 'warning.main', bg: 'rgba(249,171,0,0.12)' },
  { key: 'totalVendors', label: 'Vendors', icon: <Inventory />, color: 'secondary.main', bg: 'rgba(147,52,230,0.12)' },
];

const URGENCY_GRADIENTS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#a855f7',
};

export default function Analytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const handleExportRecent = () => {
    if (!data?.recentPRs?.length) return;
    showToast(`Exporting ${data.recentPRs.length} row(s) to CSV...`, 'info');
    const columns = [
      { label: 'Item', accessor: 'itemName' },
      { label: 'Requester', accessor: (r) => r.user?.name || 'Unknown' },
      { label: 'Category', accessor: 'category' },
      { label: 'Budget', accessor: (r) => `$${r.budget.toLocaleString()}` },
      { label: 'Urgency', accessor: 'urgency' },
      { label: 'Status', accessor: 'status' },
      { label: 'Date', accessor: (r) => new Date(r.createdAt).toLocaleDateString() },
    ];
    exportToCsv(data.recentPRs, columns, `analytics-recent-${new Date().toISOString().slice(0, 10)}`);
  };

  useEffect(() => {
    let cancelled = false;
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/analytics/dashboard');
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) setError('Failed to load analytics data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAnalytics();
    return () => { cancelled = true; };
  }, []);

  // Auto-dismiss errors
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 8000);
    return () => clearTimeout(t);
  }, [error]);

  if (loading) {
    return (
      <Box sx={{ p: 2, animation: 'fadeIn 0.3s ease' }}>
        <Skeleton variant="text" width={250} height={32} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={350} height={20} sx={{ mb: 3 }} />
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          {[1,2,3,4].map(i => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Card><CardContent sx={{ p: 3 }}>
                <Skeleton variant="text" width="60%" height={16} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="40%" height={32} />
              </CardContent></Card>
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rectangular" width="100%" height={300} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', py: 8, animation: 'fadeIn 0.3s ease' }}>
        <Alert severity="error" sx={{ maxWidth: 400, mx: 'auto', mb: 2, borderRadius: 2 }}>{error}</Alert>
        <Button variant="outlined" onClick={() => window.location.reload()} sx={{ borderRadius: 2 }}>
          Try Again
        </Button>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ textAlign: 'center', py: 8, animation: 'fadeIn 0.3s ease' }}>
        <SearchOff sx={{ fontSize: 56, color: 'text.disabled', mb: 1, opacity: 0.5 }} />
        <Typography variant="h6" color="text.secondary">Failed to load analytics data</Typography>
      </Box>
    );
  }

  const statusPieData = data.statusBreakdown.map(s => ({
    name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    value: s.count,
  }));

  const urgencyPieData = data.urgencyBreakdown.map(u => ({
    name: u.urgency.charAt(0).toUpperCase() + u.urgency.slice(1),
    value: u.count,
  }));

  const overview = data.overview;

  return (
    <Box sx={{ animation: 'fadeInUp 0.35s ease' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          Analytics Overview
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {user?.role === 'manager' ? 'Your procurement analytics' : 'Organization-wide procurement analytics'}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* Overview Stats */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {OVERVIEW_CARDS.map((card) => {
          const value = overview[card.key];
          return (
            <Grid item xs={12} sm={6} md={3} key={card.key}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                      {card.label}
                    </Typography>
                    <Box sx={{ color: card.color, display: 'flex', alignItems: 'center' }}>
                      {card.icon}
                    </Box>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: card.color }}>
                    {card.format === 'currency'
                      ? `$${(value || 0).toLocaleString()}`
                      : (value || 0).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Charts Row 1: Status + Urgency Pie Charts */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Request Status
              </Typography>
              {statusPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <defs>
                      {statusPieData.map((entry) => {
                        const key = entry.name.toLowerCase();
                        const color = STATUS_COLORS[key] || '#999';
                        return (
                          <linearGradient key={entry.name} id={`statusGrad-${key}`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={1} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.65} />
                          </linearGradient>
                        );
                      })}
                    </defs>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={105}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, value }) => `${value}`}
                      stroke="none"
                    >
                      {statusPieData.map((entry) => {
                        const key = entry.name.toLowerCase();
                        return <Cell key={entry.name} fill={`url(#statusGrad-${key})`} />;
                      })}
                    </Pie>
                    <RechartsTooltip />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                  <Inventory sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
                  <Typography>No data yet</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Budget by Category
              </Typography>
              {data.categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.categoryData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <defs>
                      {CHART_COLORS.map((color, i) => (
                        <linearGradient key={i} id={`catGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={0.95} />
                          <stop offset="100%" stopColor={color} stopOpacity={0.55} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                      axisLine={{ stroke: theme.palette.divider }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                      axisLine={{ stroke: theme.palette.divider }}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <RechartsTooltip
                      formatter={(value) => [`$${value.toLocaleString()}`, 'Budget']}
                      contentStyle={{ borderRadius: 8, border: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper, color: theme.palette.text.primary }}
                    />
                    <Bar dataKey="budget" radius={[6, 6, 0, 0]} name="Budget">
                      {data.categoryData.map((entry, index) => (
                        <Cell key={entry.name} fill={`url(#catGrad${index % CHART_COLORS.length})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                  <Inventory sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
                  <Typography>No data yet</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 2: Monthly Trend (Full Width) + Urgency Pie */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Monthly Request & Budget Trend
              </Typography>
              {data.monthlyTrend.some(m => m.requests > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.monthlyTrend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="requestsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.5} />
                      </linearGradient>
                      <linearGradient id="budgetGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                      axisLine={{ stroke: theme.palette.divider }}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                      axisLine={{ stroke: theme.palette.divider }}
                      allowDecimals={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                      axisLine={{ stroke: theme.palette.divider }}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: 8, border: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper, color: theme.palette.text.primary }}
                      formatter={(value, name) => {
                        if (name === 'Budget') return [`$${value.toLocaleString()}`, name];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="requests" fill="url(#requestsGrad)" radius={[6, 6, 0, 0]} name="Requests" />
                    <Bar yAxisId="right" dataKey="budget" fill="url(#budgetGrad)" radius={[6, 6, 0, 0]} name="Budget" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                  <TrendingUp sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
                  <Typography>Not enough data for trends yet</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Urgency Breakdown
              </Typography>
              {urgencyPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <defs>
                      {urgencyPieData.map((entry) => {
                        const key = entry.name.toLowerCase();
                        const color = URGENCY_GRADIENTS[key] || '#999';
                        return (
                          <linearGradient key={entry.name} id={`urgGrad-${key}`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={1} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                          </linearGradient>
                        );
                      })}
                    </defs>
                    <Pie
                      data={urgencyPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, value }) => `${value}`}
                      stroke="none"
                    >
                      {urgencyPieData.map((entry) => {
                        const key = entry.name.toLowerCase();
                        return <Cell key={entry.name} fill={`url(#urgGrad-${key})`} />;
                      })}
                    </Pie>
                    <RechartsTooltip />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                  No data yet
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Requests Table */}
      {data.recentPRs && data.recentPRs.length > 0 && (
        <Card>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <Box sx={{ p: 2, pb: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Recent Requests
              </Typography>
              <Button size="small" startIcon={<Download />} onClick={handleExportRecent}>
                Export CSV
              </Button>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    {!isMobile && <TableCell>Requester</TableCell>}
                    <TableCell>Category</TableCell>
                    {!isMobile && <TableCell>Budget</TableCell>}
                    <TableCell>Urgency</TableCell>
                    {!isMobile && <TableCell>Status</TableCell>}
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.recentPRs.map((pr) => (
                    <TableRow key={pr.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/pr/${pr.id}`)}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{pr.itemName}</Typography>
                        {isMobile && (
                          <Typography variant="caption" color="text.secondary">
                            {pr.category} · ${pr.budget.toLocaleString()}
                          </Typography>
                        )}
                      </TableCell>
                      {!isMobile && (
                        <TableCell>
                          <Typography variant="body2">{pr.user?.name || 'Unknown'}</Typography>
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
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(pr.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); navigate(`/pr/${pr.id}`); }}
                            aria-label="View details"
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
