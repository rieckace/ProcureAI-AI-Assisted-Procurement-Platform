import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, CircularProgress, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Tooltip, Button, useMediaQuery, Skeleton, Alert,
  Tabs, Tab, Paper
} from '@mui/material';
import {
  Visibility, TrendingUp, AttachMoney, Inventory, HourglassBottom,
  Download, Image, SearchOff, BarChart, Group, Star,
  LocalShipping, Warning, CheckCircle, People, Storefront,
  Category, BusinessCenter
} from '@mui/icons-material';
import {
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api';
import StatusChip from '../components/StatusChip';
import { URGENCY_COLORS } from '../constants';
import { exportToCsv } from '../utils/exportCsv';

// ─── Helpers ───

const exportChartAsPng = async (chartSelector, filename) => {
  const svgEl = document.querySelector(chartSelector);
  if (!svgEl) return;
  const svgData = new XMLSerializer().serializeToString(svgEl);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  return new Promise((resolve) => {
    img.onload = () => {
      canvas.width = img.naturalWidth * 2;
      canvas.height = img.naturalHeight * 2;
      ctx.scale(2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      resolve(true);
    };
    img.onerror = () => resolve(false);
    img.src = url;
  });
};

const CHART_COLORS = ['#06b6d4', '#f43f5e', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#6366f1', '#14b8a6'];
const STATUS_COLORS = {
  pending: '#f59e0b',
  quoted: '#3b82f6',
  ordered: '#8b5cf6',
  delivered: '#10b981',
  rejected: '#f43f5e',
};
const URGENCY_GRADIENTS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#a855f7',
};

// ─── Tab Panel ───

function TabPanel({ children, value, index }) {
  return value === index ? (
    <Box sx={{ animation: 'fadeInUp 0.3s ease' }}>{children}</Box>
  ) : null;
}

// ─── Overview Tab Cards ───

const OVERVIEW_CARDS = [
  { key: 'totalPRs', label: 'Total Requests', icon: <Inventory />, color: 'primary.main', bg: 'rgba(26,115,232,0.12)' },
  { key: 'totalBudget', label: 'Total Budget', icon: <AttachMoney />, color: 'success.main', bg: 'rgba(46,125,50,0.12)', format: 'currency' },
  { key: 'pending', label: 'Pending', icon: <HourglassBottom />, color: 'warning.main', bg: 'rgba(249,171,0,0.12)' },
  { key: 'totalVendors', label: 'Vendors', icon: <Storefront />, color: 'secondary.main', bg: 'rgba(147,52,230,0.12)' },
];

// ─── Rendered tab components (extracted for readability) ───

function OverviewTab({ data, error, navigate, theme, isMobile, showToast }) {
  if (!data) return null;

  const statusPieData = data.statusBreakdown.map(s => ({
    name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    value: s.count,
  }));
  const urgencyPieData = data.urgencyBreakdown.map(u => ({
    name: u.urgency.charAt(0).toUpperCase() + u.urgency.slice(1),
    value: u.count,
  }));
  const overview = data.overview;

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

  return (
    <>
      {/* Overview Stats */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {OVERVIEW_CARDS.map((card) => {
          const value = overview[card.key];
          return (
            <Grid item xs={12} sm={6} md={3} key={card.key}>
              <Card sx={{
                background: (theme) => theme.palette.mode === 'dark'
                  ? `linear-gradient(135deg, ${card.bg} 0%, rgba(0,0,0,0.2) 100%)`
                  : `linear-gradient(135deg, ${card.bg} 0%, rgba(255,255,255,0.8) 100%)`,
                border: '1px solid',
                borderColor: 'divider',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ fontSize: '0.8rem' }}>
                      {card.label}
                    </Typography>
                    <Box sx={{
                      color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 36, height: 36, borderRadius: 2, backgroundColor: card.bg,
                    }}>
                      {card.icon}
                    </Box>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: card.color, letterSpacing: '-0.02em' }}>
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

      {/* Charts Row 1: Status + Budget by Category */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>Request Status</Typography>
                {statusPieData.length > 0 && (
                  <Tooltip title="Download chart as PNG">
                    <IconButton size="small" onClick={() => exportChartAsPng('#overview-status-pie', 'request-status-chart')}>
                      <Image fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              {statusPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart id="overview-status-pie">
                    <defs>
                      {statusPieData.map((entry) => {
                        const key = entry.name.toLowerCase();
                        const color = STATUS_COLORS[key] || '#999';
                        return (
                          <linearGradient key={entry.name} id={`os-${key}`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={1} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.65} />
                          </linearGradient>
                        );
                      })}
                    </defs>
                    <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={105}
                      paddingAngle={4} dataKey="value" label={({ name, value }) => `${value}`} stroke="none">
                      {statusPieData.map((entry) => {
                        const key = entry.name.toLowerCase();
                        return <Cell key={entry.name} fill={`url(#os-${key})`} />;
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
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>Budget by Category</Typography>
                {data.categoryData.length > 0 && (
                  <Tooltip title="Download chart as PNG">
                    <IconButton size="small" onClick={() => exportChartAsPng('#overview-budget-bar', 'budget-by-category-chart')}>
                      <Image fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              {data.categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <ReBarChart id="overview-budget-bar" data={data.categoryData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <defs>
                      {CHART_COLORS.map((color, i) => (
                        <linearGradient key={i} id={`obg${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={0.95} />
                          <stop offset="100%" stopColor={color} stopOpacity={0.55} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} axisLine={{ stroke: theme.palette.divider }} />
                    <YAxis tick={{ fontSize: 12, fill: theme.palette.text.secondary }} axisLine={{ stroke: theme.palette.divider }}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <RechartsTooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Budget']}
                      contentStyle={{ borderRadius: 8, border: `1px solid ${theme.palette.divider}` }} />
                    <Bar dataKey="budget" radius={[6, 6, 0, 0]} name="Budget">
                      {data.categoryData.map((entry, index) => (
                        <Cell key={entry.name} fill={`url(#obg${index % CHART_COLORS.length})`} />
                      ))}
                    </Bar>
                  </ReBarChart>
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

      {/* Charts Row 2: Monthly Trend + Urgency */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>Monthly Request & Budget Trend</Typography>
                {data.monthlyTrend?.some(m => m.requests > 0) && (
                  <Tooltip title="Download chart as PNG">
                    <IconButton size="small" onClick={() => exportChartAsPng('#overview-monthly', 'monthly-trend-chart')}>
                      <Image fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              {data.monthlyTrend?.some(m => m.requests > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <ReBarChart id="overview-monthly" data={data.monthlyTrend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="om-requests" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.5} />
                      </linearGradient>
                      <linearGradient id="om-budget" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} axisLine={{ stroke: theme.palette.divider }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} axisLine={{ stroke: theme.palette.divider }} allowDecimals={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                      axisLine={{ stroke: theme.palette.divider }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <RechartsTooltip contentStyle={{ borderRadius: 8, border: `1px solid ${theme.palette.divider}` }}
                      formatter={(value, name) => name === 'Budget' ? [`$${value.toLocaleString()}`, name] : [value, name]} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="requests" fill="url(#om-requests)" radius={[6, 6, 0, 0]} name="Requests" />
                    <Bar yAxisId="right" dataKey="budget" fill="url(#om-budget)" radius={[6, 6, 0, 0]} name="Budget" />
                  </ReBarChart>
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
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>Urgency Breakdown</Typography>
                {urgencyPieData.length > 0 && (
                  <Tooltip title="Download chart as PNG">
                    <IconButton size="small" onClick={() => exportChartAsPng('#overview-urgency', 'urgency-breakdown-chart')}>
                      <Image fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              {urgencyPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart id="overview-urgency">
                    <defs>
                      {urgencyPieData.map((entry) => {
                        const key = entry.name.toLowerCase();
                        const color = URGENCY_GRADIENTS[key] || '#999';
                        return (
                          <linearGradient key={entry.name} id={`ou-${key}`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={1} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                          </linearGradient>
                        );
                      })}
                    </defs>
                    <Pie data={urgencyPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={95}
                      paddingAngle={4} dataKey="value" label={({ name, value }) => `${value}`} stroke="none">
                      {urgencyPieData.map((entry) => {
                        const key = entry.name.toLowerCase();
                        return <Cell key={entry.name} fill={`url(#ou-${key})`} />;
                      })}
                    </Pie>
                    <RechartsTooltip />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>No data yet</Box>
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
              <Typography variant="subtitle1" fontWeight={600}>Recent Requests</Typography>
              <Button size="small" startIcon={<Download />} onClick={handleExportRecent}>Export CSV</Button>
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
                      {!isMobile && <TableCell><Typography variant="body2">{pr.user?.name || 'Unknown'}</Typography></TableCell>}
                      <TableCell>{pr.category}</TableCell>
                      {!isMobile && <TableCell><Typography variant="body2" fontWeight={500}>${pr.budget.toLocaleString()}</Typography></TableCell>}
                      <TableCell>
                        <Chip label={pr.urgency} size="small"
                          sx={{ backgroundColor: URGENCY_COLORS[pr.urgency]?.bg || 'action.hover',
                            color: URGENCY_COLORS[pr.urgency]?.text || 'text.primary', fontWeight: 500,
                            textTransform: 'capitalize', fontSize: '0.75rem' }} />
                      </TableCell>
                      {!isMobile && <TableCell><StatusChip status={pr.status} /></TableCell>}
                      <TableCell><Typography variant="body2" color="text.secondary">{new Date(pr.createdAt).toLocaleDateString()}</Typography></TableCell>
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
          </CardContent>
        </Card>
      )}
    </>
  );
}

function RequestsTab({ data, loading, error, theme }) {
  if (!data && !error) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <CircularProgress size={36} sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">Loading request analytics...</Typography>
      </Box>
    );
  }
  if (loading) {
    return (
      <Box sx={{ py: 4 }}>
        <Grid container spacing={2.5}>
          {[1,2,3].map(i => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card><CardContent><Skeleton variant="text" width="60%" /><Skeleton variant="text" width="40%" height={32} /></CardContent></Card>
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rectangular" width="100%" height={280} sx={{ mt: 3, borderRadius: 2 }} />
      </Box>
    );
  }
  if (error) return <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>;
  if (!data) return null;

  const budgetUtil = data.budgetUtilization;

  return (
    <>
      {/* Summary Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: '1px solid', borderColor: 'divider', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 } }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>Departments</Typography>
                <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 2, backgroundColor: 'rgba(26,115,232,0.12)' }}>
                  <BusinessCenter />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>{data.prsByDepartment.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: '1px solid', borderColor: 'divider', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 } }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>Top Requester</Typography>
                <Box sx={{ color: 'warning.main', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 2, backgroundColor: 'rgba(249,171,0,0.12)' }}>
                  <Group />
                </Box>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'warning.main', noWrap: true, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {data.topRequesters[0]?.name || 'N/A'}
              </Typography>
              <Typography variant="caption" color="text.secondary">{data.topRequesters[0]?.requests || 0} requests</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: '1px solid', borderColor: 'divider', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 } }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>Budget Utilization</Typography>
                <Box sx={{ color: 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 2, backgroundColor: 'rgba(46,125,50,0.12)' }}>
                  <AttachMoney />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'success.main' }}>
                {budgetUtil.average !== null ? `${budgetUtil.average}%` : 'N/A'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {budgetUtil.quotedCount} of {budgetUtil.totalQuotedPRs} quoted PRs
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: '1px solid', borderColor: 'divider', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 } }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>Statuses</Typography>
                <Box sx={{ color: 'secondary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 2, backgroundColor: 'rgba(147,52,230,0.12)' }}>
                  <CheckCircle />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'secondary.main' }}>{data.statusDistribution.length}</Typography>
              <Typography variant="caption" color="text.secondary">unique request statuses</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Department Breakdown + Top Requesters */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Requests by Department</Typography>
              {data.prsByDepartment.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <ReBarChart data={data.prsByDepartment} margin={{ top: 5, right: 20, left: 10, bottom: 5 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis type="number" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} axisLine={{ stroke: theme.palette.divider }} allowDecimals={false} />
                    <YAxis dataKey="department" type="category" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} axisLine={{ stroke: theme.palette.divider }} width={100} />
                    <RechartsTooltip
                      formatter={(value, name) => [value, name === 'requests' ? 'Requests' : 'Budget']}
                      contentStyle={{ borderRadius: 8, border: `1px solid ${theme.palette.divider}` }} />
                    <Bar dataKey="requests" fill="#3b82f6" radius={[0, 6, 6, 0]} name="requests">
                      {data.prsByDepartment.map((_, i) => (
                        <Cell key={i} fill={`url(#obg${i % CHART_COLORS.length})`} />
                      ))}
                    </Bar>
                  </ReBarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                  <BusinessCenter sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
                  <Typography>No department data yet</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Top Requesters</Typography>
              {data.topRequesters.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Dept</TableCell>
                        <TableCell align="right">Requests</TableCell>
                        <TableCell align="right">Budget</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.topRequesters.map((r, i) => (
                        <TableRow key={i} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{r.name}</Typography>
                          </TableCell>
                          <TableCell><Typography variant="caption" color="text.secondary">{r.department}</Typography></TableCell>
                          <TableCell align="right">
                            <Chip label={r.requests} size="small" color="primary" variant="outlined" sx={{ minWidth: 32 }} />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={500}>${r.budget.toLocaleString()}</Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                  <Group sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
                  <Typography>No requesters yet</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Status Distribution + Monthly Trend */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Status Distribution</Typography>
              {data.statusDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <defs>
                      {data.statusDistribution.map((entry) => {
                        const color = STATUS_COLORS[entry.status] || '#999';
                        return (
                          <linearGradient key={entry.status} id={`rs-${entry.status}`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={1} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.65} />
                          </linearGradient>
                        );
                      })}
                    </defs>
                    <Pie data={data.statusDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={95}
                      paddingAngle={4} dataKey="count" nameKey="status"
                      label={({ status, count }) => `${count}`} stroke="none">
                      {data.statusDistribution.map((entry) => (
                        <Cell key={entry.status} fill={`url(#rs-${entry.status})`} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>No data yet</Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Monthly Request Trend</Typography>
              {data.monthlyTrend?.some(m => m.count > 0) ? (
                <ResponsiveContainer width="100%" height={280}>
                  <ReBarChart id="rt-monthly" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="rt-requests" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} axisLine={{ stroke: theme.palette.divider }} />
                    <YAxis tick={{ fontSize: 12, fill: theme.palette.text.secondary }} axisLine={{ stroke: theme.palette.divider }} allowDecimals={false} />
                    <RechartsTooltip contentStyle={{ borderRadius: 8, border: `1px solid ${theme.palette.divider}` }} />
                    <Bar dataKey="count" fill="url(#rt-requests)" radius={[6, 6, 0, 0]} name="Requests" />
                  </ReBarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                  <TrendingUp sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
                  <Typography>Not enough data yet</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}

function VendorsTab({ data, loading, error, theme, navigate }) {
  if (!data && !error) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <CircularProgress size={36} sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">Loading vendor analytics...</Typography>
      </Box>
    );
  }
  if (loading) {
    return (
      <Box sx={{ py: 4 }}>
        <Grid container spacing={2.5}>
          {[1,2,3,4].map(i => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Card><CardContent><Skeleton variant="text" width="60%" /><Skeleton variant="text" width="40%" height={32} /></CardContent></Card>
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rectangular" width="100%" height={300} sx={{ mt: 3, borderRadius: 2 }} />
      </Box>
    );
  }
  if (error) return <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>;
  if (!data) return null;

  const perf = data.performanceSummary;

  return (
    <>
      {/* Performance Summary Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: '1px solid', borderColor: 'divider', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 } }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>Total Vendors</Typography>
                <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 2, backgroundColor: 'rgba(26,115,232,0.12)' }}>
                  <People />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>{perf.totalVendors}</Typography>
              <Typography variant="caption" color="text.secondary">{perf.activeVendors} active (have quotes)</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: '1px solid', borderColor: 'divider', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 } }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>Avg Rating</Typography>
                <Box sx={{ color: 'warning.main', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 2, backgroundColor: 'rgba(249,171,0,0.12)' }}>
                  <Star />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'warning.main' }}>{perf.avgRating}</Typography>
              <Typography variant="caption" color="text.secondary">out of 5.0</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: '1px solid', borderColor: 'divider', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 } }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>On-Time Delivery</Typography>
                <Box sx={{ color: 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 2, backgroundColor: 'rgba(46,125,50,0.12)' }}>
                  <LocalShipping />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'success.main' }}>{perf.avgOnTimeDelivery}%</Typography>
              <Typography variant="caption" color="text.secondary">average across all vendors</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: '1px solid', borderColor: 'divider', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 } }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>Avg Defect Rate</Typography>
                <Box sx={{ color: 'error.main', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 2, backgroundColor: 'rgba(198,40,40,0.12)' }}>
                  <Warning />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'error.main' }}>{perf.avgDefectRate}%</Typography>
              <Typography variant="caption" color="text.secondary">average defect rate</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Vendors by Category + Top Vendors */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Vendors by Category</Typography>
              {data.vendorCountByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <ReBarChart data={data.vendorCountByCategory} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="category" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} axisLine={{ stroke: theme.palette.divider }} />
                    <YAxis tick={{ fontSize: 12, fill: theme.palette.text.secondary }} axisLine={{ stroke: theme.palette.divider }} allowDecimals={false} />
                    <RechartsTooltip
                      formatter={(value, name) => {
                        if (name === 'count') return [value, 'Vendors'];
                        if (name === 'avgRating') return [value, 'Avg Rating'];
                        return [value, name];
                      }}
                      contentStyle={{ borderRadius: 8, border: `1px solid ${theme.palette.divider}` }} />
                    <Legend />
                    <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} name="count" />
                  </ReBarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                  <Category sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
                  <Typography>No vendors yet</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Top Rated Vendors</Typography>
              {data.topVendors.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {data.topVendors.map((v, i) => (
                    <Box
                      key={v.id}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2,
                        bgcolor: 'action.hover', cursor: 'pointer', transition: 'background 0.2s',
                        '&:hover': { bgcolor: 'action.selected' },
                      }}
                      onClick={() => navigate(`/manage-vendors?id=${v.id}`)}
                    >
                      <Box sx={{
                        width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem',
                        background: `linear-gradient(135deg, ${CHART_COLORS[i % CHART_COLORS.length]}, ${CHART_COLORS[(i + 2) % CHART_COLORS.length]})`,
                        color: '#fff',
                      }}>
                        {i + 1}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{v.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{v.category}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" fontWeight={700} color="warning.main">{v.rating}</Typography>
                        <Typography variant="caption" color="text.secondary">⭐ rating</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                  <Star sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
                  <Typography>No vendors yet</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Category Performance + Quote Activity */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Category Performance</Typography>
              {data.vendorCountByCategory.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Category</TableCell>
                        <TableCell align="right">Vendors</TableCell>
                        <TableCell align="right">Rating</TableCell>
                        <TableCell align="right">OTD%</TableCell>
                        <TableCell align="right">Defect%</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.vendorCountByCategory.map((c, i) => (
                        <TableRow key={i} hover>
                          <TableCell><Typography variant="body2" fontWeight={600}>{c.category}</Typography></TableCell>
                          <TableCell align="right"><Chip label={c.count} size="small" color="primary" variant="outlined" /></TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                              <Star sx={{ fontSize: 14, color: 'warning.main' }} />
                              <Typography variant="body2">{c.avgRating}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ color: c.avgOnTimeDelivery >= 90 ? 'success.main' : c.avgOnTimeDelivery >= 75 ? 'warning.main' : 'error.main' }}>
                              {c.avgOnTimeDelivery}%
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ color: c.avgDefectRate <= 1 ? 'success.main' : c.avgDefectRate <= 3 ? 'warning.main' : 'error.main' }}>
                              {c.avgDefectRate}%
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                  <BarChart sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
                  <Typography>No data yet</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Vendor Quote Activity</Typography>
              {data.vendorQuoteActivity.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Vendor</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell align="right">Quotes</TableCell>
                        <TableCell align="right">Avg Price</TableCell>
                        <TableCell align="right">Avg Days</TableCell>
                        <TableCell>Last Quote</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.vendorQuoteActivity.map((v) => (
                        <TableRow key={v.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/manage-vendors?id=${v.id}`)}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{v.name}</Typography>
                          </TableCell>
                          <TableCell><Typography variant="caption">{v.category}</Typography></TableCell>
                          <TableCell align="right">
                            <Chip label={v.quotesCount} size="small" color={v.quotesCount > 0 ? 'success' : 'default'} variant="outlined" />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={500}>${v.avgPrice.toLocaleString()}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">{v.avgDeliveryDays}d</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {v.lastQuoteDate ? new Date(v.lastQuoteDate).toLocaleDateString() : '—'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                  <LocalShipping sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
                  <Typography>No quote activity yet</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}

// ─── Main Analytics Component ───

export default function Analytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { showToast } = useToast();

  const [tabValue, setTabValue] = useState(0);

  // Overview data
  const [overviewData, setOverviewData] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState('');

  // Requests data
  const [requestsData, setRequestsData] = useState(null);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState('');

  // Vendors data
  const [vendorsData, setVendorsData] = useState(null);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [vendorsError, setVendorsError] = useState('');

  // Fetch overview on mount
  useEffect(() => {
    let cancelled = false;
    const fetchOverview = async () => {
      try {
        const res = await api.get('/analytics/dashboard');
        if (!cancelled) setOverviewData(res.data);
      } catch (err) {
        if (!cancelled) setOverviewError('Failed to load analytics data');
      } finally {
        if (!cancelled) setOverviewLoading(false);
      }
    };
    fetchOverview();
    return () => { cancelled = true; };
  }, []);

  // Fetch requests data when tab changes to Requests (lazy)
  useEffect(() => {
    if (tabValue !== 1 || requestsData) return;
    setRequestsLoading(true);
    let cancelled = false;
    const fetchRequests = async () => {
      try {
        const res = await api.get('/analytics/requests');
        if (!cancelled) setRequestsData(res.data);
      } catch (err) {
        if (!cancelled) setRequestsError('Failed to load request analytics');
      } finally {
        if (!cancelled) setRequestsLoading(false);
      }
    };
    fetchRequests();
    return () => { cancelled = true; };
  }, [tabValue, requestsData]);

  // Fetch vendors data when tab changes to Vendors (lazy)
  useEffect(() => {
    if (tabValue !== 2 || vendorsData) return;
    setVendorsLoading(true);
    let cancelled = false;
    const fetchVendors = async () => {
      try {
        const res = await api.get('/analytics/vendors');
        if (!cancelled) setVendorsData(res.data);
      } catch (err) {
        if (!cancelled) setVendorsError('Failed to load vendor analytics');
      } finally {
        if (!cancelled) setVendorsLoading(false);
      }
    };
    fetchVendors();
    return () => { cancelled = true; };
  }, [tabValue, vendorsData]);

  // Auto-dismiss errors
  useEffect(() => {
    if (!overviewError && !requestsError && !vendorsError) return;
    const t = setTimeout(() => {
      setOverviewError('');
      setRequestsError('');
      setVendorsError('');
    }, 8000);
    return () => clearTimeout(t);
  }, [overviewError, requestsError, vendorsError]);

  const handleTabChange = (_, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ animation: 'fadeInUp 0.35s ease' }}>
      {/* Header Banner */}
      <Box sx={{
        background: (theme) => theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, rgba(138,180,248,0.08) 0%, rgba(100,181,246,0.04) 100%)'
          : 'linear-gradient(135deg, rgba(26,115,232,0.06) 0%, rgba(100,181,246,0.03) 100%)',
        borderRadius: 3, p: 3, mb: 3,
        border: '1px solid', borderColor: 'divider',
      }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, letterSpacing: '-0.02em' }}>
          Analytics
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {user?.role === 'manager'
            ? 'Your procurement analytics and insights'
            : 'Organization-wide procurement analytics and insights'}
        </Typography>
      </Box>

      {/* Tab Bar */}
      <Paper sx={{
        mb: 3, borderRadius: 2, overflow: 'hidden',
        border: '1px solid', borderColor: 'divider',
      }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant={isMobile ? 'fullWidth' : 'standard'}
          sx={{
            minHeight: 48,
            '& .MuiTab-root': {
              textTransform: 'none', fontWeight: 600, fontSize: '0.9rem',
              minHeight: 48, py: 1,
            },
          }}
        >
          <Tab icon={<BarChart sx={{ fontSize: 18 }} />} iconPosition="start" label="Overview" />
          <Tab icon={<Inventory sx={{ fontSize: 18 }} />} iconPosition="start" label="Requests" />
          <Tab icon={<Storefront sx={{ fontSize: 18 }} />} iconPosition="start" label="Vendors" />
        </Tabs>
      </Paper>

      {/* Error banners */}
      {(overviewError || requestsError || vendorsError) && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {tabValue === 0 && overviewError}
          {tabValue === 1 && requestsError}
          {tabValue === 2 && vendorsError}
        </Alert>
      )}

      {/* Tab Content — each tab manages its own loading state internally */}
      <TabPanel value={tabValue} index={0}>
        {overviewLoading ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">Loading analytics...</Typography>
          </Box>
        ) : (
          <OverviewTab data={overviewData} error={overviewError} navigate={navigate}
            theme={theme} isMobile={isMobile} showToast={showToast} />
        )}
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <RequestsTab data={requestsData} loading={requestsLoading} error={requestsError} theme={theme} />
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        <VendorsTab data={vendorsData} loading={vendorsLoading} error={vendorsError} theme={theme} navigate={navigate} />
      </TabPanel>
    </Box>
  );
}
