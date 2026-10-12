import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Alert, CircularProgress, InputAdornment, IconButton
} from '@mui/material';
import { HowToReg, Lock, Person, Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import PasswordStrength from '../components/PasswordStrength';
import CapsLockHint, { getCapsLock } from '../components/CapsLockHint';
import Logo from '../components/Logo';

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { acceptInvite } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', password: '', confirmPassword: '' });

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      setError('Password must include uppercase, lowercase, and a number');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userData = await acceptInvite(form.name, form.password, token);
      if (userData.role === 'admin') navigate('/admin');
      else if (userData.role === 'officer') navigate('/officer-dashboard');
      else navigate('/manager-dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to accept invitation. The link may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: (theme) => theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, #0b0f19 0%, #141b2e 100%)'
          : 'linear-gradient(135deg, #f6f7fb 0%, #eef1fb 100%)',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 440, width: '100%' }}>
        <Box sx={{ textAlign: 'center', pt: 4, pb: 2, px: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Logo size={64} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            Accept Invitation
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Set up your account to join ProcureAI
          </Typography>
        </Box>

        <CardContent sx={{ px: 3, pb: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Full Name"
              value={form.name}
              onChange={handleChange('name')}
              required
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><Person color="action" /></InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={handleChange('password')}
              onKeyDown={(e) => setCapsLock(getCapsLock(e))}
              onKeyUp={(e) => setCapsLock(getCapsLock(e))}
              required
              helperText="At least 6 characters"
              sx={{ mb: 1 }}
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
            <CapsLockHint active={capsLock} />

            <PasswordStrength password={form.password} />

            <TextField
              fullWidth
              label="Confirm Password"
              type={showPassword ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={handleChange('confirmPassword')}
              onKeyDown={(e) => setCapsLock(getCapsLock(e))}
              onKeyUp={(e) => setCapsLock(getCapsLock(e))}
              required
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><Lock color="action" /></InputAdornment>
                ),
              }}
            />
            <CapsLockHint active={capsLock} />

            <Button
              fullWidth
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={18} /> : <HowToReg />}
              sx={{
                py: 1.5,
                borderRadius: 2,
                fontSize: '0.95rem',
                fontWeight: 600,
                background: (theme) => theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)'
                  : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                '&:hover': {
                  background: (theme) => theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, #a5b4fc 0%, #818cf8 100%)'
                    : 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                },
              }}
            >
              {loading ? 'Setting up...' : 'Accept & Join'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
