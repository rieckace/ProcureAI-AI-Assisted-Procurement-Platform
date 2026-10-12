import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CircularProgress, Box, Typography, Button, Card, CardContent } from '@mui/material';
import { GppBad, Home } from '@mui/icons-material';

function AccessDenied({ destination }) {
  const navigate = useNavigate();
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 3,
        animation: 'fadeInUp 0.4s ease',
      }}
    >
      <Card
        sx={{
          maxWidth: 420,
          width: '100%',
          textAlign: 'center',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: 'action.hover',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
              animation: 'float 3s ease-in-out infinite',
            }}
          >
            <GppBad sx={{ fontSize: 34, color: 'text.secondary' }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            You don't have access
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
            This area is limited to specific roles. Head back to your dashboard to continue where you left off.
          </Typography>
          <Button
            variant="contained"
            startIcon={<Home />}
            onClick={() => navigate(destination)}
            sx={{ borderRadius: 2, px: 4, py: 1.2 }}
          >
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        sx={{
          animation: 'fadeIn 0.3s ease',
          gap: 2,
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          Loading your session...
        </Typography>
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    const roleRedirect = { admin: '/admin', officer: '/officer-dashboard', manager: '/manager-dashboard' };
    return <AccessDenied destination={roleRedirect[user.role] || '/manager-dashboard'} />;
  }

  return children;
}