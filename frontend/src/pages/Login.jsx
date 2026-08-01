import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Tabs, Tab,
  Alert, InputAdornment, IconButton, Chip, CircularProgress, Paper, Grid, useTheme
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { Visibility, VisibilityOff, Email, Lock, Person, Business, Domain, ArrowBack, Search, SmartToy, Speed, Security } from '@mui/icons-material';
import { FormControlLabel, Checkbox } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import PasswordStrength from '../components/PasswordStrength';
import Logo from '../components/Logo';
import AnimatedCounter from '../components/AnimatedCounter';
import api from '../api';

const demoCredentials = [
  { role: 'Admin', email: 'pashupati@shivnathmill.com', color: 'rgba(26,115,232,0.15)', textColor: 'primary.main' },
  { role: 'Officer', email: 'ravi@shivnathmill.com', color: 'rgba(52,168,83,0.15)', textColor: 'success.main' },
  { role: 'Manager', email: 'rikesh@shivnathmill.com', color: 'rgba(249,171,0,0.15)', textColor: 'warning.main' },
];

const ROLE_REDIRECTS = {
  admin: '/admin',
  officer: '/officer-dashboard',
  manager: '/manager-dashboard',
};

const FIELD_ANIMATION = { animationName: 'fadeInUp', animationDuration: '0.35s', animationTimingFunction: 'ease', animationFillMode: 'both' };

export default function Login() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [tab, setTab] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  // loginStep: 0 = enter org slug, 1 = enter credentials
  const [loginStep, setLoginStep] = useState(0);
  const [orgName, setOrgName] = useState('');
  const [orgSlugLookupLoading, setOrgSlugLookupLoading] = useState(false);
  const [orgSearchLoading, setOrgSearchLoading] = useState(false);
  const [orgSuggestions, setOrgSuggestions] = useState([]);
  const [orgInputValue, setOrgInputValue] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const searchTimerRef = useRef(null);
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    organizationName: '', organizationSlug: '',
  });

  // Reset login step when switching tabs
  useEffect(() => {
    setLoginStep(0);
    setOrgName('');
    setOrgInputValue('');
  }, [tab]);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Auto-dismiss errors after 8 seconds
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 8000);
    return () => clearTimeout(t);
  }, [error]);

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  // Debounced search for organizations
  const searchOrganizations = useCallback(async (query) => {
    if (!query || query.length < 1) {
      setOrgSuggestions([]);
      return;
    }
    setOrgSearchLoading(true);
    try {
      const res = await api.get(`/auth/orgs/search?q=${encodeURIComponent(query)}`);
      setOrgSuggestions(res.data.organizations || []);
    } catch {
      setOrgSuggestions([]);
    } finally {
      setOrgSearchLoading(false);
    }
  }, []);

  // Separate useCallback for handleLookupOrg so it can be used in refs
  const handleLookupOrg = async (slug) => {
    const targetSlug = slug || form.organizationSlug.trim();
    // If slug is empty, allow proceeding without org verification (for demo accounts)
    if (!targetSlug) {
      setOrgName('');
      setLoginStep(1);
      return;
    }
    setOrgSlugLookupLoading(true);
    setError('');
    try {
      const res = await api.get(`/auth/org-by-slug/${targetSlug}`);
      setOrgName(res.data.name);
      setForm(prev => ({ ...prev, organizationSlug: targetSlug }));
      setLoginStep(1);
    } catch (err) {
      setError(err.response?.data?.error || 'Organization not found. Leave empty for demo accounts.');
    } finally {
      setOrgSlugLookupLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let userData;
      if (tab === 0) {
        userData = await login(form.email, form.password, form.organizationSlug || undefined, rememberMe);
      } else {
        if (!form.name.trim()) {
          setError('Name is required');
          setLoading(false);
          return;
        }
        userData = await register(
          form.name, form.email, form.password, 'admin',
          form.organizationName || undefined,
          form.organizationSlug || undefined
        );
      }
      navigate(ROLE_REDIRECTS[userData.role] || '/manager-dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (email) => {
    setForm(prev => ({ ...prev, email, password: 'password123' }));
    setTab(0);
    setOrgName('Shiv Nath Rice, flour and Oil Mill');
    setOrgInputValue('shivnath-mill');
    // Auto-advance past slug step so demo users go straight to login
    setLoginStep(1);
  };

  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const brandHighlights = [
    { icon: <SmartToy sx={{ fontSize: 20 }} />, title: 'AI Vendor Recommendations', desc: 'Smart scoring across price, delivery, and quality.' },
    { icon: <Speed sx={{ fontSize: 20 }} />, title: 'End-to-End Workflow', desc: 'Requests → quotes → PO → delivery, all in one place.' },
    { icon: <Security sx={{ fontSize: 20 }} />, title: 'Secure Role-Based Access', desc: 'Admins, officers, and managers — each with the right view.' },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: (theme) => theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, #121212 0%, #1a1a2e 50%, #16213e 100%)'
          : 'linear-gradient(135deg, #f5f7fa 0%, #e8edf5 50%, #e3eaf8 100%)',
        p: 2,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: (theme) => theme.palette.mode === 'dark'
            ? 'radial-gradient(circle at 30% 40%, rgba(138,180,248,0.06) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(138,180,248,0.04) 0%, transparent 50%)'
            : 'radial-gradient(circle at 30% 40%, rgba(26,115,232,0.08) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(26,115,232,0.05) 0%, transparent 50%)',
          animation: 'gradientShift 15s ease infinite',
          backgroundSize: '200% 200%',
          pointerEvents: 'none',
        },
      }}
    >
      <Grid
        container
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: 1100,
          minHeight: '100vh',
          mx: 'auto',
          alignItems: 'center',
          py: 4,
        }}
      >
        {/* ─── Brand Panel (desktop) ─── */}
        <Grid item xs={12} md={6} sx={{ display: { xs: 'none', md: 'block' }, px: { md: 3, lg: 6 } }}>
          <Box sx={{ maxWidth: 440, animation: visible ? 'fadeInUp 0.6s ease 0.05s both' : 'none' }}>
            <Logo size={48} withWordmark wordmarkSize="1.4rem" />
            <Typography
              variant="h2"
              sx={{ mt: 4, mb: 2, fontWeight: 800 }}
            >
              Procurement,
              <Box component="span" sx={{
                display: 'block',
                background: isDark
                  ? 'linear-gradient(135deg, #aecbfa 0%, #81c995 100%)'
                  : 'linear-gradient(135deg, #1a73e8 0%, #34a853 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                simplified & smart.
              </Box>
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400 }}>
              From purchase requests to delivered goods — let Procura, your AI procurement
              assistant, handle the busywork.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {brandHighlights.map((h, i) => (
                <Box
                  key={h.title}
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'flex-start',
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0)' : 'translateY(12px)',
                    transition: `all 0.5s ease ${0.15 + i * 0.1}s`,
                  }}
                >
                  <Box sx={{
                    width: 40, height: 40, borderRadius: 2, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'primary.main',
                    bgcolor: isDark ? 'rgba(138,180,248,0.1)' : 'rgba(26,115,232,0.08)',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}>
                    {h.icon}
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600}>{h.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{h.desc}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Mini stats strip */}
            <Box sx={{
              mt: 5, pt: 3, borderTop: '1px solid', borderColor: 'divider',
              display: 'flex', gap: 4, opacity: visible ? 1 : 0,
              transition: 'opacity 0.6s ease 0.5s',
            }}>
              <Box>
                <AnimatedCounter value={2500} suffix="+" variant="h6" color="primary.main" />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Requests</Typography>
              </Box>
              <Box>
                <AnimatedCounter value={180} suffix="+" variant="h6" color="success.main" />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Vendors</Typography>
              </Box>
              <Box>
                <AnimatedCounter value={96} suffix="%" variant="h6" color="warning.main" />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>On-time</Typography>
              </Box>
            </Box>
          </Box>
        </Grid>

        {/* ─── Auth Card ─── */}
        <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'center', px: { xs: 0, md: 2 } }}>
          <Card
            sx={{
              maxWidth: 460,
              width: '100%',
              overflow: 'visible',
              borderRadius: 3,
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.97)',
              transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: visible
                ? (theme) => theme.palette.mode === 'dark'
                  ? '0 16px 48px rgba(0,0,0,0.45)'
                  : '0 16px 48px rgba(26,115,232,0.12)'
                : 'none',
              backdropFilter: 'blur(12px)',
              bgcolor: (theme) => theme.palette.mode === 'dark'
                ? 'rgba(32,33,36,0.85)'
                : 'rgba(255,255,255,0.82)',
            }}
          >
        {/* Logo Header (mobile) */}
        <Box sx={{ textAlign: 'center', pt: 4, pb: 1.5, px: 3, display: { xs: 'block', md: 'none' } }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
            <Logo size={56} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            Welcome to ProcureAI
          </Typography>
          <Typography variant="body2" color="text.secondary">
            AI-Powered Procurement Management
          </Typography>
        </Box>

        <CardContent sx={{ px: 3, pb: 4 }}>
          {/* Tabs */}
          <Tabs
            value={tab}
            onChange={(e, v) => { setTab(v); setError(''); }}
            variant="fullWidth"
            sx={{
              mb: 3,
              animation: visible ? 'fadeInUp 0.35s ease 0.15s both' : 'none',
              '& .MuiTab-root': {
                textTransform: 'none', fontWeight: 600, fontSize: '0.9rem',
                transition: 'all 0.2s ease',
                '&:hover': { backgroundColor: 'action.hover', color: 'primary.main' },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: 'primary.main',
                height: 3,
                borderRadius: 2,
              },
            }}
          >
            <Tab label="Sign In" />
            <Tab label="Register" />
          </Tabs>

          {/* Demo Credentials */}
          {tab === 0 && (
            <Box
              sx={{
                mb: 3,
                animation: visible ? 'fadeInUp 0.35s ease 0.2s both' : 'none',
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, textAlign: 'center' }}>
                Demo Credentials
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                {demoCredentials.map((cred) => (
                  <Chip
                    key={cred.role}
                    label={`${cred.role}: ${cred.email}`}
                    size="small"
                    onClick={() => fillDemo(cred.email)}
                    sx={{
                      backgroundColor: cred.color,
                      color: cred.textColor,
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': { opacity: 0.8, transform: 'translateY(-1px)' },
                      fontSize: '0.75rem',
                    }}
                  />
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, textAlign: 'center' }}>
                Password: <strong>password123</strong>
              </Typography>
            </Box>
          )}

          {/* Error */}
          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 2, borderRadius: 2,
                animation: 'fadeInUp 0.3s ease',
              }}
            >
              {error}
            </Alert>
          )}

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit}>
            {tab === 1 && (
              <TextField
                fullWidth
                label="Full Name"
                value={form.name}
                onChange={handleChange('name')}
                required
                sx={{ mb: 2, ...FIELD_ANIMATION, animationDelay: '0.25s' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start"><Person color="action" /></InputAdornment>
                  ),
                }}
              />
            )}

            {/* Sign In — Step 1: Organization Slug (with autocomplete) */}
            {tab === 0 && loginStep === 0 && (
              <>
                <Autocomplete
                  freeSolo
                  autoHighlight
                  clearOnEscape
                  value={form.organizationSlug}
                  inputValue={orgInputValue}
                  onInputChange={(event, newInputValue) => {
                    setOrgInputValue(newInputValue);
                    setForm(prev => ({ ...prev, organizationSlug: newInputValue }));
                    setError('');
                    // Debounced search (300ms)
                    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                    searchTimerRef.current = setTimeout(() => {
                      searchOrganizations(newInputValue);
                    }, 300);
                  }}
                  onChange={(event, newValue) => {
                    if (newValue && typeof newValue === 'object') {
                      // User selected an option from the dropdown
                      setForm(prev => ({ ...prev, organizationSlug: newValue.slug }));
                      setOrgInputValue(newValue.slug);
                    }
                  }}
                  options={orgSuggestions}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    return `${option.name} (${option.slug})`;
                  }}
                  filterOptions={(x) => x} // We handle filtering on the backend
                  loading={orgSearchLoading}
                  noOptionsText={orgInputValue.length > 0 ? 'No organizations found' : 'Start typing...'}
                  renderOption={(props, option) => {
                    const { key, ...rest } = props;
                    return (
                      <Box component="li" key={key} {...rest} sx={{ py: 1.5, px: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                          <Domain sx={{ fontSize: 20, color: 'primary.main', opacity: 0.7 }} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={600} noWrap>
                              {option.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {option.slug}
                            </Typography>
                          </Box>
                          <Chip
                            label={option.slug}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', flexShrink: 0 }}
                          />
                        </Box>
                      </Box>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Your Organization"
                      placeholder="e.g., acme-corp"
                      helperText="Search for your organization or leave empty to skip"
                      required
                      autoFocus
                      sx={{
                        mb: 2,
                        animation: visible ? 'fadeInUp 0.35s ease 0.25s both' : 'none',
                      }}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search color="action" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                  PaperComponent={(props) => (
                    <Paper
                      {...props}
                      sx={{
                        ...props.sx,
                        mt: 0.5,
                        borderRadius: 2,
                        boxShadow: (theme) => theme.palette.mode === 'dark'
                          ? '0 4px 20px rgba(0,0,0,0.4)'
                          : '0 4px 20px rgba(0,0,0,0.1)',
                      }}
                    />
                  )}
                />
                <Button
                  type="button"
                  fullWidth
                  variant="contained"
                  onClick={() => handleLookupOrg(form.organizationSlug)}
                  disabled={orgSlugLookupLoading}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    animation: visible ? 'fadeInUp 0.35s ease 0.3s both' : 'none',
                    background: (theme) => theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, #8ab4f8 0%, #669df6 100%)'
                      : 'linear-gradient(135deg, #1a73e8 0%, #1557b0 100%)',
                  }}
                >
                  {orgSlugLookupLoading ? <CircularProgress size={24} sx={{ color: 'white' }} /> :
                   form.organizationSlug.trim() ? `Continue with ${form.organizationSlug}` : 'Skip & Continue'}
                </Button>
              </>
            )}

            {/* Sign In — Step 2: Credentials (shown after org slug is verified) */}
            {tab === 0 && loginStep === 1 && (
              <>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 2.5,
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'action.hover',
                    animation: visible ? 'fadeInUp 0.35s ease 0.15s both' : 'none',
                  }}
                >
                  <Domain sx={{ fontSize: 20, color: 'primary.main' }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={600}>{orgName}</Typography>
                    <Typography variant="caption" color="text.secondary">{form.organizationSlug}</Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<ArrowBack fontSize="small" />}
                    onClick={() => setLoginStep(0)}
                    sx={{ fontSize: '0.7rem', minWidth: 'auto' }}
                  >
                    Change
                  </Button>
                </Box>

                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  required
                  autoFocus
                  sx={{ mb: 2, animation: visible ? 'fadeInUp 0.35s ease 0.2s both' : 'none' }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start"><Email color="action" /></InputAdornment>
                    ),
                  }}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      size="small"
                      sx={{ '&.Mui-checked': { color: 'primary.main' } }}
                    />
                  }
                  label={
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      Remember me
                    </Typography>
                  }
                  sx={{
                    mb: 2,
                    animation: visible ? 'fadeInUp 0.35s ease 0.25s both' : 'none',
                  }}
                />

                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange('password')}
                  required
                  sx={{ mb: 3, animation: visible ? 'fadeInUp 0.35s ease 0.25s both' : 'none' }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start"><Lock color="action" /></InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </>
            )}

            {/* Register — Password field */}
            {tab === 1 && (
              <>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  required
                  sx={{ mb: 2, ...FIELD_ANIMATION, animationDelay: '0.3s' }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start"><Email color="action" /></InputAdornment>
                    ),
                  }}
                />
                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange('password')}
                  required
                  sx={{ mb: 1, animation: visible ? 'fadeInUp 0.35s ease 0.35s both' : 'none' }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start"><Lock color="action" /></InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </>
            )}

            {tab === 1 && (
              <>
                {/* Live password strength indicator */}
                <Box sx={{ mb: 0.5 }}>
                  <PasswordStrength password={form.password} />
                </Box>

                {/* Organization fields */}
                <TextField
                  fullWidth
                  label="Organization Name"
                  value={form.organizationName}
                  onChange={handleChange('organizationName')}
                  placeholder="e.g., Acme Corporation"
                  helperText="Create your organization on ProcureAI"
                  sx={{ mb: 2, animation: visible ? 'fadeInUp 0.35s ease 0.35s both' : 'none' }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start"><Business color="action" /></InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="Organization URL Slug"
                  value={form.organizationSlug}
                  onChange={handleChange('organizationSlug')}
                  placeholder="e.g., acme-corp"
                  helperText="Optional: unique identifier for your org URL"
                  sx={{ mb: 2, animation: visible ? 'fadeInUp 0.35s ease 0.4s both' : 'none' }}
                />

                <TextField
                  fullWidth
                  disabled
                  label="Your Role"
                  value="admin"
                  helperText="First user is always Org Admin. You can invite others with different roles."
                  sx={{ mb: 3, animation: visible ? 'fadeInUp 0.35s ease 0.45s both' : 'none' }}
                />
              </>
            )}

            {/* Submit button for Register OR Sign In step 2 */}
            {(tab === 1 || (tab === 0 && loginStep === 1)) && (
              <Button
                fullWidth
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  animation: visible ? 'fadeInUp 0.35s ease 0.3s both' : 'none',
                  background: (theme) => theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, #8ab4f8 0%, #669df6 100%)'
                    : 'linear-gradient(135deg, #1a73e8 0%, #1557b0 100%)',
                  '&:hover': {
                    background: (theme) => theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, #aecbfa 0%, #8ab4f8 100%)'
                      : 'linear-gradient(135deg, #1557b0 0%, #124896 100%)',
                  },
                }}
              >
                {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> :
                 tab === 0 ? 'Sign In' : 'Create Account'}
              </Button>
            )}
          </Box>
        </CardContent>
        </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
