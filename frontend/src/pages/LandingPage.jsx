import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Grid, Chip, Avatar
} from '@mui/material';
import {
  SmartToy, Speed, Security, TrendingUp, ArrowForward,
  ShoppingCart, Store, BarChart
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const features = [
  {
    icon: <SmartToy sx={{ fontSize: 32 }} />,
    title: 'AI-Powered Recommendations',
    description: 'Get intelligent vendor suggestions based on price, delivery, and quality scoring.',
  },
  {
    icon: <Speed sx={{ fontSize: 32 }} />,
    title: 'Streamlined Workflow',
    description: 'From purchase request to delivery — manage the entire procurement lifecycle in one place.',
  },
  {
    icon: <BarChart sx={{ fontSize: 32 }} />,
    title: 'Kanban Board & Analytics',
    description: 'Visualize your procurement pipeline with drag-and-drop boards and detailed analytics.',
  },
  {
    icon: <Security sx={{ fontSize: 32 }} />,
    title: 'Role-Based Access',
    description: 'Secure multi-role system with Org Admin, Officer, and Manager views.',
  },
  {
    icon: <ShoppingCart sx={{ fontSize: 32 }} />,
    title: 'Multi-Organization',
    description: 'Create your organization, invite team members, and manage procurement together.',
  },
];

const steps = [
  { step: '1', title: 'Create Request', description: 'Managers submit purchase requests with budget and urgency.' },
  { step: '2', title: 'Get Quotes', description: 'Officers collect and compare vendor quotes.' },
  { step: '3', title: 'AI Selection', description: 'AI recommends the best vendor based on scoring.' },
  { step: '4', title: 'Issue PO', description: 'Send purchase orders and track delivery.' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      const redirects = { admin: '/admin', officer: '/officer-dashboard', manager: '/manager-dashboard' };
      navigate(redirects[user.role] || '/manager-dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* Hero Section */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          py: { xs: 8, md: 12 },
          px: 3,
          textAlign: 'center',
          background: (theme) => theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #0d1b2a 0%, #1b2838 50%, #0d1b2a 100%)'
            : 'linear-gradient(135deg, #e8edf5 0%, #f5f7fa 50%, #e8edf5 100%)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: (theme) => theme.palette.mode === 'dark'
              ? 'rgba(138, 180, 248, 0.05)'
              : 'rgba(26, 115, 232, 0.08)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -80,
            left: -80,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: (theme) => theme.palette.mode === 'dark'
              ? 'rgba(129, 201, 149, 0.05)'
              : 'rgba(52, 168, 83, 0.08)',
          }}
        />

        <Box sx={{ position: 'relative', maxWidth: 800, mx: 'auto' }}>
          <Chip
            label="AI-Powered Procurement"
            sx={{
              mb: 3,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              fontWeight: 600,
              fontSize: '0.8rem',
              px: 1,
            }}
          />
          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              mb: 2,
              fontSize: { xs: '2.2rem', md: '3.5rem' },
              lineHeight: 1.1,
            }}
          >
            Procurement,
            <Box component="span" sx={{ color: 'primary.main' }}> Reimagined</Box>
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ mb: 4, maxWidth: 600, mx: 'auto', lineHeight: 1.6, fontWeight: 400 }}
          >
            Streamline your procurement process with AI-powered vendor recommendations,
            Kanban boards, and real-time analytics.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowForward />}
              onClick={handleGetStarted}
              sx={{
                py: 1.5,
                px: 4,
                borderRadius: 3,
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'none',
              }}
            >
              {user ? 'Go to Dashboard' : 'Get Started'}
            </Button>
            {!user && (
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/login')}
                sx={{
                  py: 1.5,
                  px: 4,
                  borderRadius: 3,
                  fontSize: '1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                }}
              >
                Sign In
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      {/* Features Section */}
      <Box sx={{ py: { xs: 6, md: 10 }, px: 3 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, textAlign: 'center', mb: 1 }}>
          Everything you need
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ textAlign: 'center', mb: 6, fontWeight: 400 }}>
          A complete procurement management solution for your organization
        </Typography>
        <Grid container spacing={3} sx={{ maxWidth: 1200, mx: 'auto' }}>
          {features.map((feature) => (
            <Grid item xs={12} sm={6} md={4} key={feature.title}
              sx={{ display: 'flex' }}>
              <Card sx={{ height: '100%', textAlign: 'center', transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
                <CardContent sx={{ p: 3 }}>
                  <Avatar
                    sx={{
                      width: 56,
                      height: 56,
                      mx: 'auto',
                      mb: 2,
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                    }}
                  >
                    {feature.icon}
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '1rem' }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* How It Works Section */}
      <Box
        sx={{
          py: { xs: 6, md: 10 },
          px: 3,
          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
        }}
      >
        <Typography variant="h3" sx={{ fontWeight: 700, textAlign: 'center', mb: 1 }}>
          How it works
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ textAlign: 'center', mb: 6, fontWeight: 400 }}>
          Four simple steps to smarter procurement
        </Typography>
        <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 1000, mx: 'auto' }}>
          {steps.map((step, i) => (
            <Card key={step.step} sx={{ flex: '1 1 200px', maxWidth: 240, textAlign: 'center' }}>
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                    fontWeight: 700,
                    fontSize: '1.1rem',
                  }}
                >
                  {step.step}
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '1rem' }}>
                  {step.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {step.description}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      {/* CTA Section */}
      <Box sx={{ py: { xs: 6, md: 10 }, px: 3, textAlign: 'center' }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
          Ready to get started?
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4, fontWeight: 400 }}>
          Start managing your procurement process today
        </Typography>
        <Button
          variant="contained"
          size="large"
          endIcon={<ArrowForward />}
          onClick={handleGetStarted}
          sx={{
            py: 1.5,
            px: 5,
            borderRadius: 3,
            fontSize: '1.1rem',
            fontWeight: 600,
            textTransform: 'none',
          }}
        >
          {user ? 'Go to Dashboard' : 'Start Now — It\'s Free'}
        </Button>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          py: 3,
          px: 3,
          textAlign: 'center',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          ProcureAI — AI-Powered Procurement Management System
        </Typography>
      </Box>
    </Box>
  );
}
