import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Avatar, Button,
  TextField, Chip, Switch, FormControlLabel, Divider,
  CircularProgress, Alert, IconButton, Tooltip, InputAdornment
} from '@mui/material';
import {
  Person, Notifications, Save, Info, CheckCircle, SmartToy, ArrowBack
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getAvatarUrl } from '../utils/avatar';
import api from '../api';

export default function Profile() {
  const { user, setUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: '',
    department: '',
    bio: '',
    notifyOnQuote: true,
    notifyOnPO: true,
    notifyOnStatus: true,
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        department: user.department || '',
        bio: user.bio || '',
        notifyOnQuote: user.notifyOnQuote !== false,
        notifyOnPO: user.notifyOnPO !== false,
        notifyOnStatus: user.notifyOnStatus !== false,
      });
    }
  }, [user]);

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setSaved(false);
  };

  const handleToggle = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.checked }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Name cannot be empty', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await api.patch('/auth/profile', {
        name: form.name,
        department: form.department,
        bio: form.bio,
        notifyOnQuote: form.notifyOnQuote,
        notifyOnPO: form.notifyOnPO,
        notifyOnStatus: form.notifyOnStatus,
      });
      // Update the auth context with new user data
      if (setUser) {
        setUser(prev => ({ ...prev, ...res.data.user }));
      }
      // Also update localStorage
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, ...res.data.user }));
      setSaved(true);
      showToast('Profile updated successfully!', 'success');
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const currentStyle = localStorage.getItem('procura_avatar_style') || 'big-smile';

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', animation: 'fadeInUp 0.35s ease' }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 2, color: 'text.secondary', '&:hover': { bgcolor: 'action.hover' } }}>
        Back
      </Button>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Person sx={{ fontSize: 32, color: 'primary.main' }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            My Profile
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your personal information and notification preferences
          </Typography>
        </Box>
      </Box>

      {/* Profile Info Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3, flexWrap: 'wrap' }}>
            <Avatar
              src={getAvatarUrl(user?.name, 80, currentStyle)}
              sx={{ width: 80, height: 80, border: '3px solid', borderColor: 'primary.main' }}
            />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight={600}>{user?.name}</Typography>
              <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                <Chip label={user?.role} size="small" color="primary" sx={{ textTransform: 'capitalize' }} />
                <Chip label={user?.department || 'No Department'} size="small" variant="outlined" />
              </Box>
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<SmartToy />}
              onClick={() => navigate('/avatar-studio')}
              sx={{ borderRadius: 2 }}
            >
              Change Avatar
            </Button>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Full Name"
                value={form.name}
                onChange={handleChange('name')}
                size="small"
                autoFocus
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Person fontSize="small" color="action" /></InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Department"
                value={form.department}
                onChange={handleChange('department')}
                size="small"
                placeholder="e.g., Engineering, Marketing, Finance"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Bio"
                value={form.bio}
                onChange={handleChange('bio')}
                size="small"
                multiline
                rows={3}
                placeholder="Tell us a little about yourself..."
              />
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : saved ? <CheckCircle /> : <Save />}
              onClick={handleSave}
              disabled={saving}
              color={saved ? 'success' : 'primary'}
              sx={{ borderRadius: 2, minWidth: 140 }}
            >
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <Notifications color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Notification Preferences
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.notifyOnQuote}
                  onChange={handleToggle('notifyOnQuote')}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight={500}>Quote Received</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Get notified when a vendor submits a quote for your requests
                  </Typography>
                </Box>
              }
            />
            <Divider />
            <FormControlLabel
              control={
                <Switch
                  checked={form.notifyOnPO}
                  onChange={handleToggle('notifyOnPO')}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight={500}>Purchase Order Issued</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Get notified when a purchase order is issued to a vendor
                  </Typography>
                </Box>
              }
            />
            <Divider />
            <FormControlLabel
              control={
                <Switch
                  checked={form.notifyOnStatus}
                  onChange={handleToggle('notifyOnStatus')}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight={500}>Status Changes</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Get notified when a request status changes (pending → quoted → ordered → delivered)
                  </Typography>
                </Box>
              }
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Info color="info" sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="caption" color="text.secondary">
              Email notifications are sent via the configured email service
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Export Data */}
      <Card sx={{ mt: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Save color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Export My Data
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Download a JSON file with your profile info, purchase requests, quotes, and recent activity logs.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Info />}
            onClick={async () => {
              try {
                const res = await api.get('/auth/export-data');
                const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `procureai-export-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                showToast('Data exported successfully!', 'success');
              } catch {
                showToast('Failed to export data', 'error');
              }
            }}
            sx={{ borderRadius: 2 }}
          >
            Export as JSON
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
