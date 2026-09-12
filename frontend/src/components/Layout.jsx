import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { updatePageTitle } from '../utils/pageTitle';
import {
  Box, Typography, Button, IconButton, Drawer, AppBar, Toolbar,
  List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Avatar, Menu, MenuItem, Divider, Chip, Tooltip, Badge, Breadcrumbs, Link
} from '@mui/material';
import {
  Menu as MenuIcon, Dashboard, Add, Store, AdminPanelSettings, Logout, History,
  DarkMode, LightMode, BarChart, SmartToy, Person,
  ChevronLeft, ChevronRight, NavigateNext,
  Inventory2, Receipt, LocalShipping
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { ROLE_COLORS } from '../constants';
import api from '../api';
import ChatWidget from './ChatWidget';
import ProcuraTips from './ProcuraTips';
import NotificationBell from './NotificationBell';
import ScrollToTop from './ScrollToTop';
import GlobalSearch from './GlobalSearch';
import KeyboardShortcuts from './KeyboardShortcuts';
import PageTransition from './PageTransition';
import OnboardingTour from './OnboardingTour';
import Logo from './Logo';
import { getAvatarUrl } from '../utils/avatar';

const DRAWER_EXPANDED = 220;
const DRAWER_COLLAPSED = 56;

const PAGE_TITLES = {
  '/manager-dashboard': 'My Purchase Requests',
  '/officer-dashboard': 'All Purchase Requests',
  '/new-request': 'New Purchase Request',
  '/manage-vendors': 'Vendor Management',
  '/add-vendor': 'Add Vendor',
  '/manage-vendors/:id': 'Vendor Catalog',
  '/analytics': 'Analytics',
  '/activity-log': 'Activity Log',
  '/admin': 'Admin Panel',
  '/profile': 'My Profile',
  '/avatar-studio': 'Avatar Studio',
  '/inventory': 'Inventory Management',
  '/purchase-orders': 'Purchase Orders',
  '/deliveries': 'Delivery Tracking',
  '/agent': 'Procura Agent',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [themeSpinning, setThemeSpinning] = useState(false);
  const [shortcutHint, setShortcutHint] = useState('');
  const spinTimerRef = useRef(null);
  const navBufferRef = useRef('');

  // Update page title and auto-scroll to top on navigation
  useEffect(() => {
    updatePageTitle(location.pathname);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    };
  }, []);

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Fetch pending count
  useEffect(() => {
    if (!user) return;
    const fetchPendingCount = async () => {
      try {
        const endpoint = user?.role === 'manager'
          ? '/purchase-requests/my-requests?status=pending&limit=1'
          : '/purchase-requests?status=pending&limit=1';
        const res = await api.get(endpoint);
        setPendingCount(res.data.pagination?.total || 0);
      } catch { /* silent */ }
    };
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        if (user?.role === 'manager' || user?.role === 'admin') {
          e.preventDefault();
          navigate('/new-request');
          setShortcutHint('Navigated to New Request');
          setTimeout(() => setShortcutHint(''), 2000);
        }
        return;
      }
      if (e.key === 'r' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        window.location.reload();
        return;
      }
      if (e.key === 'b' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setSidebarCollapsed(prev => !prev);
        return;
      }
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        navBufferRef.current = 'g';
        setTimeout(() => { navBufferRef.current = ''; }, 1000);
        return;
      }
      if (navBufferRef.current === 'g') {
        navBufferRef.current = '';
        const path = e.key === 'd' ? (user?.role === 'manager' || user?.role === 'admin' ? '/manager-dashboard' : '/officer-dashboard') :
                     e.key === 'o' ? '/officer-dashboard' :
                     e.key === 'a' && user?.role === 'admin' ? '/admin' :
                     e.key === 'v' ? '/manage-vendors' :
                     e.key === 'l' ? '/activity-log' :
                     e.key === 'y' ? '/analytics' : null;
        if (path) { e.preventDefault(); navigate(path); }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, user]);

  const [hoverSidebar, setHoverSidebar] = useState(false);
  const effectiveWidth = sidebarCollapsed && !hoverSidebar ? DRAWER_COLLAPSED : DRAWER_EXPANDED;
  const drawerWidth = effectiveWidth;

  const isCollapsed = sidebarCollapsed && !hoverSidebar;

  const handleLogout = () => { logout(); navigate('/login'); };

  const toggleSidebar = () => setSidebarCollapsed(prev => !prev);

  const getPageTitle = () => {
    const title = PAGE_TITLES[location.pathname];
    if (title) return title;
    if (location.pathname.startsWith('/manage-vendors/')) return 'Vendor Catalog';
    if (location.pathname.startsWith('/pr/')) return 'Request Details';
    if (location.pathname.startsWith('/pr/') && location.pathname.endsWith('/compare')) return 'Vendor Comparison';
    if (location.pathname.startsWith('/accept-invite')) return 'Accept Invitation';
    return 'ProcureAI';
  };

  const getBreadcrumbs = () => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    if (pathParts.length <= 1) return null;
    const crumbs = [{ label: 'Home', path: '/' }];
    if (pathParts[0] === 'pr') {
      crumbs.push({ label: 'Request Details', path: null });
    } else if (pathParts[0] === 'accept-invite') {
      crumbs.push({ label: 'Accept Invitation', path: null });
    } else {
      const pageTitle = PAGE_TITLES[location.pathname];
      if (pageTitle) crumbs.push({ label: pageTitle, path: null });
    }
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  // Time-based greeting for the header
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] || '';
  const greetingEmoji = hour < 12 ? '☀️' : hour < 18 ? '🌤️' : '🌙';

  const navSections = [];
  if (user?.role === 'manager') {
    navSections.push({
      title: 'Procurement',
      tagline: 'Plan, source & finalize',
      items: [
        { text: 'My Requests', icon: <Dashboard />, path: '/manager-dashboard', badge: true },
        { text: 'New Request', icon: <Add />, path: '/new-request', tour: 'new-request' },
      ],
    });
    navSections.push({
      title: 'Intelligence',
      tagline: 'AI, data & insights',
      items: [
        { text: 'Analytics', icon: <BarChart />, path: '/analytics' },
      ],
    });
  }
  if (user?.role === 'officer') {
    navSections.push({
      title: 'Procurement',
      tagline: 'Plan, source & finalize',
      items: [
        { text: 'All Requests', icon: <Dashboard />, path: '/officer-dashboard', badge: true },
        { text: 'Purchase Orders', icon: <Receipt />, path: '/purchase-orders' },
        { text: 'Deliveries', icon: <LocalShipping />, path: '/deliveries' },
      ],
    });
    navSections.push({
      title: 'Operations',
      tagline: 'Vendors, stock & orders',
      items: [
        { text: 'Vendors', icon: <Store />, path: '/manage-vendors' },
        { text: 'Inventory', icon: <Inventory2 />, path: '/inventory' },
      ],
    });
    navSections.push({
      title: 'Intelligence',
      tagline: 'AI, data & insights',
      items: [
        { text: 'Procura Agent', icon: <SmartToy />, path: '/agent' },
        { text: 'Activity Log', icon: <History />, path: '/activity-log' },
        { text: 'Analytics', icon: <BarChart />, path: '/analytics' },
      ],
    });
  }
  if (user?.role === 'admin') {
    navSections.push({
      title: 'Administration',
      tagline: 'Workspace & access',
      items: [
        { text: 'Admin Panel', icon: <AdminPanelSettings />, path: '/admin' },
        { text: 'Manager View', icon: <Dashboard />, path: '/manager-dashboard', badge: true },
        { text: 'Officer View', icon: <Store />, path: '/officer-dashboard', badge: true },
      ],
    });
    navSections.push({
      title: 'Operations',
      tagline: 'Vendors, stock & orders',
      items: [
        { text: 'Inventory', icon: <Inventory2 />, path: '/inventory' },
        { text: 'Purchase Orders', icon: <Receipt />, path: '/purchase-orders' },
        { text: 'Deliveries', icon: <LocalShipping />, path: '/deliveries' },
      ],
    });
    navSections.push({
      title: 'Intelligence',
      tagline: 'AI, data & insights',
      items: [
        { text: 'Procura Agent', icon: <SmartToy />, path: '/agent' },
        { text: 'Avatar Studio', icon: <SmartToy />, path: '/avatar-studio' },
        { text: 'Activity Log', icon: <History />, path: '/activity-log' },
        { text: 'Analytics', icon: <BarChart />, path: '/analytics' },
      ],
    });
  }
  const navItems = navSections.flatMap((s) => s.items);

  const drawer = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        overflow: 'hidden',
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Gradient Accent Bar */}
      <Box
        sx={{
          height: 3,
          background: (theme) => theme.palette.mode === 'dark'
            ? 'linear-gradient(90deg, #818cf8 0%, #6366f1 50%, #818cf8 100%)'
            : 'linear-gradient(90deg, #6366f1 0%, #4f46e5 50%, #6366f1 100%)',
          flexShrink: 0,
        }}
      />          {/* Logo Area — ProcureAI brand only, premium look */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          px: isCollapsed ? 0 : 2,
          height: 68,
          minHeight: 68,
        }}
      >
        {!isCollapsed && (
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', flex: 1, minWidth: 0 }}
            onClick={() => navigate('/')}
            data-tour="logo"
          >
            <Logo size={36} withWordmark wordmarkSize="1.05rem" />
          </Box>
        )}
        {isCollapsed && (
          <Box sx={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            <Logo size={36} />
          </Box>
        )}
        {!isCollapsed && (
          <Tooltip title="Collapse sidebar" arrow>
            <IconButton
              size="small"
              aria-label="Collapse sidebar"
              onClick={toggleSidebar}
              sx={{
                color: 'text.secondary',
                opacity: 0.5,
                transition: 'all 0.2s ease',
                '&:hover': { opacity: 1, color: 'text.primary' },
              }}
            >
              <ChevronLeft fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Subtle divider line under logo */}
      <Box sx={{
        mx: 1.5,
        height: '1px',
        background: (theme) => `linear-gradient(90deg, ${theme.palette.divider}, transparent)`,
        mb: 0.5,
      }} />

      {/* Section Label */}
      {!isCollapsed && (
        <Typography
          sx={{
            px: 2.5,
            pt: 2,
            pb: 0.5,
            fontSize: '0.6rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'text.disabled',
          }}
        >
          Navigation
        </Typography>
      )}

      {/* Navigation */}
      <List sx={{
        flex: 1,
        px: isCollapsed ? 0.5 : 1,
        pt: isCollapsed ? 1 : 0.3,
        pb: 0.5,
        overflow: 'auto',
        '&::-webkit-scrollbar': { width: 3 },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': { background: 'rgba(0,0,0,0.08)', borderRadius: 2 },
      }}>
        {navSections.map((section, si) => (
          <Box key={section.title}>
            {si > 0 && <Box sx={{ my: 0.6, mx: isCollapsed ? 1.2 : 1.5, height: '1px', borderRadius: 1, background: (theme) => `linear-gradient(90deg, ${theme.palette.divider}, transparent)` }} />}
            {!isCollapsed && (
              <Typography
                sx={{
                  px: 1.8,
                  pt: si === 0 ? 0 : 1.4,
                  pb: 0.4,
                  fontSize: '0.55rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  color: 'text.disabled',
                }}
              >
                {section.title}
              </Typography>
            )}
            {!isCollapsed && (
              <Typography
                sx={{
                  display: 'block',
                  pl: 1.8,
                  pb: 0.6,
                  fontSize: '0.6rem',
                  color: 'text.disabled',
                }}
              >
                {section.tagline}
              </Typography>
            )}
            {section.items.map((item, idx) => (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.2, animation: isCollapsed ? 'none' : `fadeIn 0.2s ease ${idx * 0.03}s both` }}>
                <Tooltip title={isCollapsed ? item.text : ''} arrow placement="right">
                  <ListItemButton
                    selected={location.pathname === item.path}
                    onClick={() => {
                      navigate(item.path);
                      setMobileOpen(false);
                    }}
                    {...(item.tour ? { 'data-tour': item.tour } : {})}
                    sx={{
                      borderRadius: 1.5,
                      mx: isCollapsed ? 0.3 : 0.5,
                      py: 1,
                      px: isCollapsed ? 0 : 1.5,
                      justifyContent: isCollapsed ? 'center' : 'flex-start',
                      minHeight: 42,
                      transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&.Mui-selected': {
                        backgroundColor: (theme) => theme.palette.mode === 'dark'
                          ? 'rgba(129,140,248,0.16)'
                          : 'rgba(79,70,229,0.12)',
                        color: 'primary.main',
                        '&:hover': {
                          backgroundColor: (theme) => theme.palette.mode === 'dark'
                            ? 'rgba(129,140,248,0.24)'
                            : 'rgba(79,70,229,0.16)',
                        },
                        '& .MuiListItemIcon-root': { color: 'primary.main' },
                      },
                      '&:hover:not(.Mui-selected)': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: isCollapsed ? 0 : 34,
                        color: location.pathname === item.path ? 'primary.main' : 'text.secondary',
                        justifyContent: 'center',
                        fontSize: isCollapsed ? '1.2rem' : '1rem',
                      }}
                    >
                      {item.badge ? (
                        <Badge
                          badgeContent={pendingCount}
                          color="error"
                          overlap="circular"
                          sx={{
                            '& .MuiBadge-badge': {
                              fontSize: '0.45rem',
                              minWidth: 10,
                              height: 10,
                              fontWeight: 700,
                            },
                          }}
                        >
                          {item.icon}
                        </Badge>
                      ) : (
                        item.icon
                      )}
                    </ListItemIcon>
                    {!isCollapsed && (
                      <ListItemText
                        primary={item.text}
                        primaryTypographyProps={{
                          fontSize: '0.8rem',
                          fontWeight: location.pathname === item.path ? 600 : 500,
                        }}
                      />
                    )}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            ))}
          </Box>
        ))}
      </List>

      {/* Bottom: User + Theme */}
      {isCollapsed ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1.5, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Tooltip title="Expand sidebar" arrow placement="right">
            <IconButton size="small" aria-label="Expand sidebar" onClick={toggleSidebar} sx={{ color: 'text.secondary', opacity: 0.6, '&:hover': { opacity: 1 } }}>
              <ChevronRight fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={user?.name || 'User'} arrow placement="right">
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small" aria-label="Account menu">
              <Avatar src={getAvatarUrl(user?.name, 26)} alt={user?.name || 'User avatar'} sx={{ width: 26, height: 26 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ) : (
        <Box sx={{ p: 1.5, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          {/* User card */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              cursor: 'pointer',
              p: 0.8,
              borderRadius: 1,
              mb: 0.8,
              transition: 'all 0.15s ease',
              '&:hover': { bgcolor: 'action.hover' },
            }}
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            <Avatar src={getAvatarUrl(user?.name, 28)} alt={user?.name || 'User avatar'} sx={{ width: 28, height: 28 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.8rem', lineHeight: 1.3 }}>
                {user?.name}
              </Typography>
              <Typography noWrap sx={{ fontSize: '0.65rem', color: 'text.secondary', lineHeight: 1.3 }}>
                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
              </Typography>
            </Box>
          </Box>

          {/* Theme toggle row */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 1,
              py: 0.6,
              borderRadius: 1,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              '&:hover': { bgcolor: 'action.hover' },
            }}
            onClick={() => {
              setThemeSpinning(true);
              toggleTheme();
              spinTimerRef.current = setTimeout(() => setThemeSpinning(false), 400);
            }}
          >
            <Box
              component="span"
              sx={{
                display: 'flex',
                fontSize: 14,
                color: mode === 'dark' ? '#ffb74d' : '#5f6368',
                animation: themeSpinning ? 'spin 0.4s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
              }}
            >
              {mode === 'dark' ? <LightMode sx={{ fontSize: 15 }} /> : <DarkMode sx={{ fontSize: 15 }} />}
            </Box>
            <Typography
              sx={{ flex: 1, fontSize: '0.7rem', fontWeight: 500, color: 'text.secondary' }}
            >
              {mode === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </Typography>
          </Box>

          {/* Sign out */}
          <Button
            fullWidth
            size="small"
            variant="text"
            startIcon={<Logout />}
            onClick={handleLogout}
            sx={{
              borderRadius: 1,
              mt: 0.3,
              color: 'text.disabled',
              fontSize: '0.7rem',
              fontWeight: 400,
              justifyContent: 'flex-start',
              px: 1,
              py: 0.4,
              minHeight: 32,
              transition: 'all 0.15s ease',
              '&:hover': { color: 'error.main', bgcolor: 'rgba(217,48,37,0.06)' },
            }}
          >
            Sign out
          </Button>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default', position: 'relative', overflow: 'hidden' }}>
      {/* Header */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: (theme) => theme.palette.mode === 'dark'
            ? 'rgba(32,33,36,0.82)'
            : 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(16px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(16px) saturate(1.5)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          borderRadius: 0,
          transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1), width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          ml: { md: `${drawerWidth}px` },
          width: { md: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar sx={{ minHeight: '56px !important', px: { xs: 1, sm: 2 } }}>
          {/* Mobile hamburger */}
          <IconButton
            edge="start"
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ display: { md: 'none' }, mr: 1, color: 'text.secondary' }}
          >
            <MenuIcon />
          </IconButton>

          {/* Desktop sidebar toggle */}
          <IconButton
            edge="start"
            aria-label="Toggle sidebar"
            onClick={toggleSidebar}
            sx={{ display: { xs: 'none', md: 'flex' }, mr: 1, color: 'text.secondary', width: 36, height: 36 }}
          >
            {isCollapsed ? <ChevronRight fontSize="small" /> : <ChevronLeft fontSize="small" />}
          </IconButton>

          {/* Page title + breadcrumbs — clean centered layout */}
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            {/* Organization name — primary in header */}
            <Typography
              noWrap
              sx={{
                fontWeight: 700,
                fontSize: { xs: '0.85rem', sm: '0.95rem', md: '1.05rem' },
                color: 'text.primary',
                letterSpacing: '-0.01em',
                lineHeight: 1.3,
              }}
            >
              {user?.organizationName || getPageTitle()}
            </Typography>
            {/* Page title — smaller, secondary */}
            <Typography
              noWrap
              sx={{
                fontWeight: 500,
                fontSize: { xs: '0.65rem', sm: '0.72rem' },
                color: 'text.disabled',
                lineHeight: 1.2,
                mt: -0.1,
              }}
            >
              {getPageTitle()}
            </Typography>
            {breadcrumbs ? (
              <Breadcrumbs
                separator={<NavigateNext sx={{ fontSize: 12 }} />}
                aria-label="breadcrumb"
                sx={{ justifyContent: 'center', display: 'flex', mt: -0.2 }}
              >
                {breadcrumbs.map((crumb, i) => (
                  crumb.path ? (
                    <Link
                      key={i}
                      underline="hover"
                      color="text.secondary"
                      href={crumb.path}
                      onClick={(e) => { e.preventDefault(); navigate(crumb.path); }}
                      sx={{ fontSize: '0.7rem', cursor: 'pointer' }}
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <Typography key={i} color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                      {crumb.label}
                    </Typography>
                  )
                ))}
              </Breadcrumbs>
            ) : (
              <Typography
                noWrap
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: '0.65rem', sm: '0.72rem' },
                  background: (theme) => theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, #a5b4fc, #34d399)'
                    : 'linear-gradient(135deg, #6366f1, #10b981)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  lineHeight: 1.2,
                  mt: -0.1,
                }}
              >
                {greeting}{firstName ? `, ${firstName}` : ''} {greetingEmoji}
              </Typography>
            )}
          </Box>

          {/* Right actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title="New request" arrow>
              <IconButton
                size="small"
                aria-label="New request"
                onClick={() => navigate('/new-request')}
                sx={{ display: { xs: 'inline-flex', md: 'none' }, color: 'text.secondary', mr: 0.25 }}
              >
                <Add fontSize="small" />
              </IconButton>
            </Tooltip>
            <NotificationBell />
            <Tooltip title="Toggle theme" arrow>
              <IconButton
                size="small"
                aria-label="Toggle theme"
                data-tour="theme"
                onClick={() => {
                  setThemeSpinning(true);
                  toggleTheme();
                  spinTimerRef.current = setTimeout(() => setThemeSpinning(false), 400);
                }}
                sx={{
                  color: 'text.secondary',
                  animation: themeSpinning ? 'spin 0.4s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                }}
              >
                {mode === 'dark' ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title={user?.name || 'Account'} arrow>
              <IconButton
                size="small"
                aria-label="Account menu"
                onClick={(e) => setAnchorEl(e.currentTarget)}
                sx={{ ml: 0.3 }}
              >
                <Avatar
                  src={getAvatarUrl(user?.name, 28)}
                  alt={user?.name || 'User avatar'}
                  sx={{ width: 28, height: 28 }}
                />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar — collapsible on desktop */}
      <Box
        component="nav"
        sx={{
          width: { md: `${drawerWidth}px` },
          flexShrink: { md: 0 },
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{
            keepMounted: true,
            slotProps: { backdrop: { sx: { backdropFilter: 'blur(4px)', bgcolor: 'rgba(0,0,0,0.3)' } } },
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_EXPANDED,
              border: 'none',
              borderRadius: 0,
            },
          }}
        >
          {/* Only render user menu in desktop drawer to avoid duplicates */}
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', overflow: 'hidden' }}>
            {/* Logo Area — Mobile: ProcureAI only */}
            <Box sx={{ display: 'flex', alignItems: 'center', px: 2, height: 56, borderBottom: '1px solid', borderColor: 'divider', minHeight: 56 }}>
              <Logo size={28} withWordmark wordmarkSize="0.9rem" />
            </Box>
            <List sx={{ flex: 1, px: 1, pt: 0.5, overflow: 'auto' }}>
              {navItems.map((item) => (
                <ListItem key={item.text} disablePadding sx={{ mb: 0.2 }}>
                  <ListItemButton
                    selected={location.pathname === item.path}
                    onClick={() => { navigate(item.path); setMobileOpen(false); }}
                    sx={{ borderRadius: 1.5, mx: 0.5, py: 1, px: 1.5, minHeight: 44,
                      transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&.Mui-selected': {
                        backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(129,140,248,0.16)' : 'rgba(79,70,229,0.12)',
                        color: 'primary.main',
                        '&:hover': { backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(129,140,248,0.24)' : 'rgba(79,70,229,0.16)' },
                        '& .MuiListItemIcon-root': { color: 'primary.main' },
                      },
                      '&:hover:not(.Mui-selected)': { bgcolor: 'action.hover' } }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>
                      {item.badge ? (
                        <Badge badgeContent={pendingCount} color="error" overlap="circular"
                          sx={{ '& .MuiBadge-badge': { fontSize: '0.5rem', minWidth: 12, height: 12, fontWeight: 600 } }}>
                          {item.icon}
                        </Badge>
                      ) : item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 500 }} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
            {/* Mobile bottom section */}
            <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1.2, cursor: 'pointer', p: 0.6, '&:hover': { bgcolor: 'action.hover' } }}
                onClick={(e) => { setAnchorEl(e.currentTarget); setMobileOpen(false); }}
              >
                <Avatar src={getAvatarUrl(user?.name, 28)} alt={user?.name || 'User avatar'} sx={{ width: 28, height: 28 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap sx={{ lineHeight: 1.2, fontSize: '0.8rem' }}>{user?.name}</Typography>
                  <Chip label={user?.role} size="small" sx={{ height: 16, fontSize: '0.6rem', borderRadius: 0, backgroundColor: ROLE_COLORS[user?.role]?.bg || 'action.hover', color: ROLE_COLORS[user?.role]?.color || 'text.primary', mt: 0.1 }} />
                </Box>
              </Box>
              <Button
                fullWidth size="small" variant="text" startIcon={<Logout />} onClick={handleLogout}
                sx={{ borderRadius: 0, mt: 0.5, color: 'text.secondary', fontSize: '0.75rem', justifyContent: 'flex-start', px: 0.6 }}
              >
                Sign out
              </Button>
            </Box>
          </Box>
        </Drawer>

        {/* Desktop drawer — collapsible with hover-to-expand */}
        <Drawer
          variant="permanent"
          onMouseEnter={() => setHoverSidebar(true)}
          onMouseLeave={() => setHoverSidebar(false)}
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              borderRadius: 0,
              overflow: 'hidden',
              transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>      {/* Ambient background effect - subtle animated gradient */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.3,
          background: (theme) => theme.palette.mode === 'dark'
            ? 'radial-gradient(ellipse at 20% 50%, rgba(129,140,248,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(129,140,248,0.05) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(129,140,248,0.04) 0%, transparent 50%)'
            : 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(99,102,241,0.04) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(99,102,241,0.03) 0%, transparent 50%)',
          animation: 'gradientShift 20s ease-in-out infinite',
          backgroundSize: '200% 200%',
        }}
      />

      {/* Main Content */}
      <Box
        component="main"
        id="main-content"
        sx={{
          flexGrow: 1,
          p: 3,
          pt: { xs: '72px', md: '80px' }, // Clear fixed header
          width: { md: `calc(100% - ${drawerWidth}px)` },
          maxWidth: 1200,
          mx: 'auto',
          position: 'relative',
          zIndex: 1,
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
    >
      <PageTransition>
        <Outlet />
      </PageTransition>
    </Box>

      {/* User Menu — at layout level so it works on mobile + desktop */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
        PaperProps={{ sx: { borderRadius: 12, minWidth: 180, mt: 0.5, boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 30px rgba(0,0,0,0.5)' : '0 12px 32px rgba(15,23,42,0.12)' } }}
      >
        <MenuItem disabled sx={{ opacity: 0.7 }}>
          <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { setAnchorEl(null); navigate('/profile'); }}>
          <Person sx={{ mr: 1.5, fontSize: 18 }} /> My Profile
        </MenuItem>
        <MenuItem onClick={() => { setAnchorEl(null); navigate('/avatar-studio'); }}>
          <SmartToy sx={{ mr: 1.5, fontSize: 18 }} /> Avatar Studio
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <Logout sx={{ mr: 1.5, fontSize: 18 }} /> Sign Out
        </MenuItem>
      </Menu>

      {/* Floating elements */}
      <GlobalSearch />
      <ChatWidget />
      <KeyboardShortcuts />
      {shortcutHint && (
        <Box sx={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1500, bgcolor: 'grey.900', color: 'grey.100', px: 2, py: 1, borderRadius: 1,
          fontSize: '0.8rem', fontWeight: 500, boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          animation: 'fadeInUp 0.2s ease', pointerEvents: 'none',
        }}>
          {shortcutHint}
        </Box>
      )}
      <ProcuraTips />
      <ScrollToTop />
      <OnboardingTour />
      <Box
        id="skip-to-content"
        component="a"
        href="#main-content"
        sx={{
          position: 'fixed',
          top: -100,
          left: 16,
          zIndex: 9999,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          p: 1.5,
          borderRadius: 1,
          fontWeight: 600,
          fontSize: '0.8rem',
          textDecoration: 'none',
          '&:focus': {
            top: 16,
          },
        }}
      >
        Skip to main content
      </Box>
    </Box>
  );
}
