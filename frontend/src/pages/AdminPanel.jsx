import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Button, Card, CardContent, TextField, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Alert, Snackbar, Chip, Grid, IconButton, Tooltip,
  Avatar, Skeleton, InputAdornment
} from '@mui/material';
import {
  PersonAdd, People, OpenInNew, Refresh, Send, Email, Shield
} from '@mui/icons-material';
import api from '../api';
import EmailPreview from '../components/EmailPreview';
import { ROLE_COLORS } from '../constants';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');

  // Invite form
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'officer' });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteResult, setInviteResult] = useState(null);

  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const cancelledRef = useRef(false);

  const fetchUsers = useCallback(async () => {
    cancelledRef.current = false;
    try {
      const res = await api.get('/auth/users');
      if (!cancelledRef.current) setUsers(res.data);
    } catch (err) {
      if (!cancelledRef.current) setUsersError('Failed to load users');
    } finally {
      if (!cancelledRef.current) setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    return () => { cancelledRef.current = true; };
  }, [fetchUsers]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteForm.email || !inviteForm.role) return;

    setInviteLoading(true);
    setInviteError('');
    setInviteResult(null);

    try {
      const res = await api.post('/auth/invite', inviteForm);
      // Store email in localStorage for EmailPreview
      if (res.data.etherealUrl) {
        const email = { id: Date.now(), subject: 'Invitation: ' + inviteForm.email, previewUrl: res.data.etherealUrl, sentAt: new Date().toISOString() };
        const existing = JSON.parse(localStorage.getItem('sentEmails') || '[]');
        existing.unshift(email);
        localStorage.setItem('sentEmails', JSON.stringify(existing.slice(0, 20)));
      }
      setInviteResult(res.data);
      setToast({
        open: true,
        message: `Invitation sent to ${inviteForm.email}!`,
        severity: 'success',
        etherealUrl: res.data.etherealUrl,
      });
      setInviteForm({ email: '', role: 'officer' });
      fetchUsers();
    } catch (err) {
      setInviteError(err.response?.data?.error || 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        Admin Panel
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage users, send invitations, and test email functionality
      </Typography>

      {/* Invite User */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <PersonAdd color="primary" />
            <Typography variant="h6">Invite New User</Typography>
          </Box>

          {inviteError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{inviteError}</Alert>
          )}

          {inviteResult && (
            <Alert
              severity="success"
              sx={{ mb: 2, borderRadius: 2 }}
              action={
                <Tooltip title="View in Ethereal">
                  <IconButton size="small" color="inherit" href={inviteResult.etherealUrl} target="_blank">
                    <OpenInNew fontSize="small" />
                  </IconButton>
                </Tooltip>
              }
            >
              Invitation sent! {inviteResult.etherealUrl && (
                <a href={inviteResult.etherealUrl} target="_blank" rel="noopener" style={{ color: 'inherit' }}>View Email</a>
              )}
            </Alert>
          )}

          <Box component="form" onSubmit={handleInvite}>
            <Grid container spacing={2} alignItems="flex-end">
              <Grid item xs={12} sm={5}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  size="small"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(p => ({ ...p, email: e.target.value }))}
                  required
                  placeholder="user@example.com"
                  autoFocus
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Email fontSize="small" color="action" /></InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  select
                  label="Role"
                  size="small"
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm(p => ({ ...p, role: e.target.value }))}
                  required
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Shield fontSize="small" color="action" /></InputAdornment>,
                  }}
                >
                  <MenuItem value="manager">Manager</MenuItem>
                  <MenuItem value="officer">Officer</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  disabled={inviteLoading}
                  startIcon={inviteLoading ? <CircularProgress size={18} /> : <Send />}
                  sx={{ borderRadius: 2, height: 40 }}
                >
                  {inviteLoading ? 'Sending...' : 'Send Invitation'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, pb: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <People color="primary" />
              <Typography variant="h6">Users</Typography>
            </Box>
            <Button size="small" startIcon={<Refresh />} onClick={fetchUsers} sx={{ borderRadius: 2 }}>
              Refresh
            </Button>
          </Box>

          {usersLoading ? (
            <Box sx={{ p: 2 }}>
              {[1,2,3,4].map(i => (
                <Box key={i} sx={{ display: 'flex', gap: 2, mb: 2, p: 1.5, alignItems: 'center' }}>
                  <Skeleton variant="circular" width={32} height={32} />
                  <Box sx={{ flex: 1 }}><Skeleton variant="text" width="40%" height={20} /><Skeleton variant="text" width="20%" height={14} /></Box>
                  <Skeleton variant="rectangular" width={70} height={24} sx={{ borderRadius: 1 }} />
                  <Skeleton variant="text" width={80} height={16} />
                </Box>
              ))}
            </Box>
          ) : usersError ? (
            <Alert severity="error" sx={{ m: 2, borderRadius: 2 }}>{usersError}</Alert>
          ) : users.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <People sx={{ fontSize: 48, color: 'text.secondary', mb: 1, opacity: 0.4 }} />
              <Typography color="text.secondary">No users found</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Joined</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            src={`https://api.dicebear.com/9.x/big-smile/svg?seed=${encodeURIComponent(u.name)}&backgroundColor=b6e3f4,c0aede,d1d4f9`}
                            sx={{ width: 32, height: 32 }}
                          />
                          <Typography variant="body2" fontWeight={600}>{u.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={u.role}
                          size="small"
                          sx={{
                            textTransform: 'capitalize',
                            backgroundColor: ROLE_COLORS[u.role]?.bg || 'action.hover',
                            color: ROLE_COLORS[u.role]?.color || 'text.primary',
                            fontWeight: 500,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Email Preview */}
      <EmailPreview />

      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast.severity}
          sx={{ borderRadius: 2, minWidth: 300 }}
          action={
            toast.etherealUrl ? (
              <Tooltip title="View in Ethereal">
                <IconButton size="small" color="inherit" href={toast.etherealUrl} target="_blank">
                  <OpenInNew fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null
          }
        >
          {toast.message}
          {toast.etherealUrl && (
            <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
              <a href={toast.etherealUrl} target="_blank" rel="noopener" style={{ color: 'inherit' }}>View in Ethereal</a>
            </Typography>
          )}
        </Alert>
      </Snackbar>
    </Box>
  );
}
