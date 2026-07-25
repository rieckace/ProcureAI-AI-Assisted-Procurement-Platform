import { Component } from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
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
              maxWidth: 480,
              width: '100%',
              textAlign: 'center',
              border: '1px solid',
              borderColor: 'error.light',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: 'error.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              >
                <ErrorOutline sx={{ fontSize: 40, color: 'white' }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                Something went wrong
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                An unexpected error occurred. Please try refreshing the page.
                {this.state.error?.message && (
                  <Box component="span" sx={{ display: 'block', mt: 1, fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.disabled' }}>
                    {this.state.error.message}
                  </Box>
                )}
              </Typography>
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={this.handleReload}
                sx={{
                  borderRadius: 2,
                  px: 4,
                  py: 1.2,
                  transition: 'all 0.2s ease',
                  '&:hover': { transform: 'translateY(-1px)' },
                }}
              >
                Reload Page
              </Button>
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}
