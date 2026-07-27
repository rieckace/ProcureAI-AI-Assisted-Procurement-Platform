import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { Home, ArrowBack, SearchOff } from '@mui/icons-material';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeInUp 0.4s ease',
      }}
    >
      <Card sx={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <CardContent sx={{ p: 4 }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: 'action.hover',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
            }}
          >
            <SearchOff sx={{ fontSize: 40, color: 'text.secondary' }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            404
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            Page Not Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
            The page you're looking for doesn't exist or has been moved.
            Check the URL or navigate back to a familiar page.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<Home />}
              onClick={() => navigate('/')}
              sx={{ borderRadius: 2 }}
            >
              Go Home
            </Button>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => navigate(-1)}
              sx={{ borderRadius: 2 }}
            >
              Go Back
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
