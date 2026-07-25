import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, CardContent,
  Tooltip, CircularProgress, Alert
} from '@mui/material';
import { Email, OpenInNew, Refresh } from '@mui/icons-material';
import api from '../api';

export default function EmailPreview() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadEmails = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('sentEmails') || '[]');
      setEmails(stored);
    } catch {
      setEmails([]);
    }
  };

  useEffect(() => {
    loadEmails();
  }, []);

  const sendTestEmail = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/email/test');
      const email = {
        id: Date.now(),
        subject: '🧪 ProcureAI Test Email',
        previewUrl: res.data.previewUrl,
        sentAt: new Date().toISOString(),
      };
      const existing = JSON.parse(localStorage.getItem('sentEmails') || '[]');
      existing.unshift(email);
      localStorage.setItem('sentEmails', JSON.stringify(existing.slice(0, 20)));
      setEmails(existing.slice(0, 20));
    } catch (err) {
      setError('Failed to send test email. Are you logged in as admin?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Email color="primary" />
            <Typography variant="h6">Email History</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              startIcon={<Refresh />}
              onClick={loadEmails}
              sx={{ borderRadius: 2 }}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
              onClick={sendTestEmail}
              disabled={loading}
              sx={{ borderRadius: 2 }}
            >
              Send Test Email
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {emails.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            No emails sent yet. Actions that send emails (adding quotes, issuing POs, inviting users) will appear here.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {emails.map((email) => (
              <Box
                key={email.id}
                sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  p: 1.5, bgcolor: 'action.hover', borderRadius: 2,
                  border: '1px solid', borderColor: 'divider',
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={500}>
                    {email.subject}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(email.sentAt).toLocaleString()}
                  </Typography>
                </Box>
                <Tooltip title="View in Ethereal">
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    endIcon={<OpenInNew />}
                    href={email.previewUrl}
                    target="_blank"
                    rel="noopener"
                    sx={{ borderRadius: 2, ml: 1, whiteSpace: 'nowrap' }}
                  >
                    View Email
                  </Button>
                </Tooltip>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
