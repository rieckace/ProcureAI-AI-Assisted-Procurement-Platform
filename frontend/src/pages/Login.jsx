import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Tabs, Tab,
  Alert, InputAdornment, IconButton, Chip, CircularProgress, LinearProgress
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock, Person, Business } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import PasswordStrength from '../components/PasswordStrength';

const demoCredentials = [
  { role: 'Admin', email: 'admin@demo.com', color: 'rgba(26,115,232,0.15)', textColor: 'primary.main' },
  { role: 'Officer', email: 'officer@demo.com', color: 'rgba(52,168,83,0.15)', textColor: 'success.main' },
  { role: 'Manager', email: 'manager@demo.com', color: 'rgba(249,171,0,0.15)', textColor: 'warning.main' },
];

const ROLE_REDIRECTS = {
  admin: '/admin',
  officer: '/officer-dashboard',
  manager: '/manager-dashboard',
};

const FIELD_ANIMATION = { animation: 'fadeInUp 0.35s ease' };
const FIELD_DELAYS = [0, 0.05, 0.1, 0.15, 0.2];

export default function Login() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [tab, setTab] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    organizationName: '', organizationSlug: '',
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let userData;
      if (tab === 0) {
        userData = await login(form.email, form.password);
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
  };

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
      <Card
        sx={{
          maxWidth: 460,
          width: '100%',
          overflow: 'visible',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.97)',
          transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: visible
            ? (theme) => theme.palette.mode === 'dark'
              ? '0 8px 32px rgba(0,0,0,0.4)'
              : '0 8px 32px rgba(0,0,0,0.1)'
            : 'none',
        }}
      >
        {/* Logo Header */}
        <Box sx={{ textAlign: 'center', pt: 4, pb: 2, px: 3 }}>
          <Box
            sx={{
              width: 64, height: 64, borderRadius: 3,
              background: 'linear-gradient(135deg, #1a73e8 0%, #1557b0 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              mx: 'auto', mb: 2,
              boxShadow: '0 4px 12px rgba(26,115,232,0.3)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'scale(1.08) rotate(-3deg)',
                boxShadow: '0 8px 25px rgba(26,115,232,0.4)',
              },
              animation: visible ? 'float 3s ease-in-out infinite' : 'none',
            }}
          >
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>P</Typography>
          </Box>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, mb: 0.5, animation: visible ? 'fadeInUp 0.4s ease' : 'none' }}
          >
            Welcome to ProcureAI
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ animation: visible ? 'fadeInUp 0.4s ease 0.1s both' : 'none' }}
          >
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

            <TextField
              fullWidth
              label="Email"
              type="email"
              value={form.email}
              onChange={handleChange('email')}
              required
              autoFocus
              sx={{
                mb: 2,
                animation: visible ? 'fadeInUp 0.35s ease 0.25s both' : 'none',
              }}
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
              sx={{
                mb: tab === 1 ? 1 : 3,
                animation: visible ? 'fadeInUp 0.35s ease 0.3s both' : 'none',
              }}
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

            {/* Role redirect preview chip */}
            {tab === 0 && (
              <Box sx={{ mb: 2, textAlign: 'center', animation: visible ? 'fadeInUp 0.35s ease 0.35s both' : 'none' }}>
                {demoCredentials.map((cred) => (
                  <Box
                    key={cred.role}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mx: 0.5,
                      mb: 0.5,
                      px: 1,
                      py: 0.3,
                      borderRadius: 1,
                      backgroundColor: cred.color,
                      fontSize: '0.65rem',
                      color: cred.textColor,
                      fontWeight: 500,
                    }}
                  >
                    {cred.role}: {ROLE_REDIRECTS[cred.role.toLowerCase()]}
                  </Box>
                ))}
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.3 }}>
                  You'll be redirected to your dashboard after signing in
                </Typography>
              </Box>
            )}

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
                animation: visible ? 'fadeInUp 0.35s ease 0.4s both' : 'none',
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
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
