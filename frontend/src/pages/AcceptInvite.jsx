import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Alert, CircularProgress, InputAdornment, IconButton
} from '@mui/material';
import { HowToReg, Lock, Person, Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import PasswordStrength from '../components/PasswordStrength';

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { acceptInvite } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
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
          ? 'linear-gradient(135deg, #121212 0%, #1a1a2e 100%)'
          : 'linear-gradient(135deg, #f5f7fa 0%, #e8edf5 100%)',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 440, width: '100%' }}>
        <Box sx={{ textAlign: 'center', pt: 4, pb: 2, px: 3 }}>
          <Box
            sx={{
              width: 64, height: 64, borderRadius: 3,
              background: 'linear-gradient(135deg, #1a73e8 0%, #1557b0 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              mx: 'auto', mb: 2, boxShadow: '0 4px 12px rgba(26,115,232,0.3)',
            }}
          >
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>P</Typography>
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

            <PasswordStrength password={form.password} />

            <TextField
              fullWidth
              label="Confirm Password"
              type={showPassword ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={handleChange('confirmPassword')}
              required
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><Lock color="action" /></InputAdornment>
                ),
              }}
            />

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
                  ? 'linear-gradient(135deg, #8ab4f8 0%, #669df6 100%)'
                  : 'linear-gradient(135deg, #1a73e8 0%, #1557b0 100%)',
                '&:hover': {
                  background: (theme) => theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, #aecbfa 0%, #8ab4f8 100%)'
                    : 'linear-gradient(135deg, #1557b0 0%, #124896 100%)',
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
