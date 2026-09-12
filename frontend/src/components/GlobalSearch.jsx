import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, Dialog, DialogContent, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, Chip, CircularProgress,
  InputAdornment
} from '@mui/material';
import { Search, SearchOff, Dashboard, Store, History, BarChart, Inventory, Add, Person, SmartToy } from '@mui/icons-material';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { label: 'My Requests', path: '/manager-dashboard', icon: <Dashboard />, keywords: 'requests dashboard all', roles: ['manager', 'admin'] },
  { label: 'All Requests', path: '/officer-dashboard', icon: <Dashboard />, keywords: 'requests dashboard all officer', roles: ['officer', 'admin'] },
  { label: 'New Request', path: '/new-request', icon: <Add />, keywords: 'create new purchase request pr', roles: ['manager', 'admin'] },
  { label: 'Vendors', path: '/manage-vendors', icon: <Store />, keywords: 'vendors supplier list manage', roles: ['officer', 'admin'] },
  { label: 'Activity Log', path: '/activity-log', icon: <History />, keywords: 'activity log audit history', roles: ['officer', 'admin'] },
  { label: 'Analytics', path: '/analytics', icon: <BarChart />, keywords: 'analytics stats reports charts', roles: ['manager', 'officer', 'admin'] },
  { label: 'Admin Panel', path: '/admin', icon: <Inventory />, keywords: 'admin settings organization', roles: ['admin'] },
  { label: 'Profile', path: '/profile', icon: <Person />, keywords: 'profile settings account user', roles: ['manager', 'officer', 'admin'] },
  { label: 'Avatar Studio', path: '/avatar-studio', icon: <SmartToy />, keywords: 'avatar dicebear customize', roles: ['admin'] },
];

export default function GlobalSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchHistory, setSearchHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('global_search_history') || '[]'); }
    catch { return []; }
  });
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Persist search history to localStorage
  useEffect(() => {
    localStorage.setItem('global_search_history', JSON.stringify(searchHistory.slice(0, 10)));
  }, [searchHistory]);

  const addToHistory = (item) => {
    setSearchHistory(prev => {
      const filtered = prev.filter(h => h.path !== item.path);
      return [{ label: item.label, path: item.path, icon: item.icon, timestamp: Date.now() }, ...filtered].slice(0, 10);
    });
  };

  const clearHistory = () => {
    setSearchHistory([]);
  };

  // Filter nav items by role
  const navItems = NAV_ITEMS.filter(item => item.roles.includes(user?.role));

  // Keyboard shortcut: Cmd+Shift+K / Ctrl+Shift+K (not Cmd+K — that's reserved for ChatWidget)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'K') {
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        e.preventDefault();
        e.stopPropagation();
        setOpen(prev => !prev);
        return;
      }
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.shiftKey && !open) {
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults(navItems.slice(0, 5));
      setSelectedIndex(0);
    }
  }, [open]);

  // Show history when opening with empty query
  useEffect(() => {
    if (open && !query.trim() && searchHistory.length > 0) {
      setResults(searchHistory.slice(0, 5));
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults(navItems.slice(0, 5));
      setSearching(false);
      return;
    }
    setSearching(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const q = query.toLowerCase();
      // Filter nav items
      let filtered = navItems.filter(item =>
        item.label.toLowerCase().includes(q) ||
        item.keywords.includes(q) ||
        item.path.includes(q)
      );

      // Search PRs via API
      try {
        const res = await api.get(`/purchase-requests?search=${encodeURIComponent(q)}&limit=5`);
        const prs = res.data.data || [];
        filtered = [
          ...filtered,
          ...prs.map(pr => ({
            label: pr.itemName,
            path: `/pr/${pr.id}`,
            icon: <Dashboard />,
            subtitle: `₹${pr.budget.toLocaleString('en-IN')} · ${pr.status} · ${pr.category}`,
          })),
        ];
      } catch { /* silent */ }

      setResults(filtered.slice(0, 8));
      setSearching(false);
      setSelectedIndex(0);
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleSelect = (item) => {
    addToHistory(item);
    setOpen(false);
    navigate(item.path);
  };

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          mt: '-20vh',
          boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
        },
      }}
    >
      <DialogContent sx={{ p: 2 }}>
        <TextField
          inputRef={inputRef}
          fullWidth
          placeholder="Search requests, pages, vendors..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          variant="outlined"
          size="medium"
          autoComplete="off"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {searching ? <CircularProgress size={18} /> : <Search />}
              </InputAdornment>
            ),
            sx: { borderRadius: 2, fontSize: '0.95rem' },
          }}
        />
        {results.length > 0 && !searching && (
          <List sx={{ mt: 1, maxHeight: 360, overflow: 'auto' }} dense>
            {results.map((item, i) => (
              <ListItem key={`${item.path}-${i}`} disablePadding>
                <ListItemButton
                  selected={i === selectedIndex}
                  onClick={() => handleSelect(item)}
                  sx={{ borderRadius: 2, mb: 0.25 }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: 'primary.main' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight={500}>
                        {item.label}
                      </Typography>
                    }
                    secondary={
                      item.subtitle && (
                        <Typography variant="caption" color="text.secondary">
                          {item.subtitle}
                        </Typography>
                      )
                    }
                  />
                  <Chip label="Go" size="small" variant="outlined" sx={{ ml: 1, height: 20, fontSize: '0.65rem' }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
        {!searching && query.trim() && results.length === 0 && (
          <Box sx={{ py: 3.5, px: 2, textAlign: 'center', animation: 'fadeInUp 0.3s ease' }}>
            <SearchOff sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              No results found
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
              Nothing matches &quot;{query.trim()}&quot;. Try a different keyword or check the spelling.
            </Typography>
          </Box>
        )}
        {!searching && !query.trim() && searchHistory.length === 0 && (
          <Box sx={{ py: 3.5, px: 2, textAlign: 'center', animation: 'fadeInUp 0.3s ease' }}>
            <Search sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              Find anything fast
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
              Search requests, vendors, pages, and more
            </Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', gap: 2, mt: 1, px: 0.5, alignItems: 'center' }}>
          <Typography variant="caption" color="text.disabled">
            <Box component="span" sx={{ bgcolor: 'action.hover', px: 0.5, borderRadius: 0.5, fontFamily: 'monospace' }}>↑↓</Box> Navigate
          </Typography>
          <Typography variant="caption" color="text.disabled">
            <Box component="span" sx={{ bgcolor: 'action.hover', px: 0.5, borderRadius: 0.5, fontFamily: 'monospace' }}>⏎</Box> Open
          </Typography>
          <Typography variant="caption" color="text.disabled">
            <Box component="span" sx={{ bgcolor: 'action.hover', px: 0.5, borderRadius: 0.5, fontFamily: 'monospace' }}>Esc</Box> Close
          </Typography>
          {searchHistory.length > 0 && !query.trim() && (
            <Typography
              variant="caption"
              color="primary"
              onClick={(e) => { e.stopPropagation(); clearHistory(); }}
              sx={{
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' },
                ml: 'auto',
              }}
            >
              Clear history
            </Typography>
          )}
          {query.trim() && (
            <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto' }}>
              <Box component="span" sx={{ bgcolor: 'action.hover', px: 0.5, borderRadius: 0.5, fontFamily: 'monospace' }}>/</Box> or
              <Box component="span" sx={{ bgcolor: 'action.hover', px: 0.5, borderRadius: 0.5, fontFamily: 'monospace', ml: 0.5 }}>⌘⇧K</Box>
            </Typography>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
