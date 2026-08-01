import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Grid, Chip, Avatar,
  Menu, MenuItem, Divider, useTheme
} from '@mui/material';
import {
  SmartToy, Speed, Security, ArrowForward,
  ShoppingCart, BarChart, Logout, Person,
  CheckCircle, Store, Inventory2, LocalShipping, Insights
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { getAvatarUrl } from '../utils/avatar';
import AnimatedCounter from '../components/AnimatedCounter';

const features = [
  {
    icon: <SmartToy sx={{ fontSize: 32 }} />,
    title: 'AI-Powered Recommendations',
    description: 'Get intelligent vendor suggestions based on price, delivery, and quality scoring.',
    hex: '#1a73e8',
  },
  {
    icon: <Speed sx={{ fontSize: 32 }} />,
    title: 'Streamlined Workflow',
    description: 'From purchase request to delivery — manage the entire procurement lifecycle in one place.',
    hex: '#f9ab00',
  },
  {
    icon: <BarChart sx={{ fontSize: 32 }} />,
    title: 'Kanban Board & Analytics',
    description: 'Visualize your procurement pipeline with drag-and-drop boards and detailed analytics.',
    hex: '#34a853',
  },
  {
    icon: <Security sx={{ fontSize: 32 }} />,
    title: 'Role-Based Access',
    description: 'Secure multi-role system with Org Admin, Officer, and Manager views.',
    hex: '#ea4335',
  },
  {
    icon: <ShoppingCart sx={{ fontSize: 32 }} />,
    title: 'Multi-Organization',
    description: 'Create your organization, invite team members, and manage procurement together.',
    hex: '#8ab4f8',
  },
  {
    icon: <Insights sx={{ fontSize: 32 }} />,
    title: 'Autonomous Agent',
    description: 'Procura analyzes requests, checks inventory, finds vendors, and recommends the best deal.',
    hex: '#c58af9',
  },
];

const steps = [
  { step: '1', title: 'Create Request', description: 'Managers submit purchase requests with budget and urgency.' },
  { step: '2', title: 'Get Quotes', description: 'Officers collect and compare vendor quotes.' },
  { step: '3', title: 'AI Selection', description: 'AI recommends the best vendor based on scoring.' },
  { step: '4', title: 'Issue PO', description: 'Send purchase orders and track delivery.' },
];

const STATS = [
  { label: 'Requests Processed', value: 2500, icon: <Store />, suffix: '+' },
  { label: 'On-Time Delivery', value: 96, icon: <LocalShipping />, suffix: '%' },
  { label: 'Active Vendors', value: 180, icon: <Inventory2 />, suffix: '+' },
  { label: 'Cost Savings', value: 12, icon: <CheckCircle />, suffix: '%' },
];

function FloatingShape({ top, left, size, color, delay, type = 'circle' }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top,
        left,
        width: size,
        height: size,
        borderRadius: type === 'circle' ? '50%' : '24%',
        background: `linear-gradient(135deg, ${color}33, ${color}11)`,
        border: `1.5px solid ${color}44`,
        animation: `floatSlow ${8 + Math.random() * 6}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        pointerEvents: 'none',
        backdropFilter: 'blur(2px)',
      }}
    />
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const statsRef = useRef(null);
  const [statsInView, setStatsInView] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsInView(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  const handleGetStarted = () => {
    if (user) {
      const redirects = { admin: '/admin', officer: '/officer-dashboard', manager: '/manager-dashboard' };
      navigate(redirects[user.role] || '/manager-dashboard');
    } else {
      navigate('/login');
    }
  };

  const handleLogout = () => {
    setAnchorEl(null);
    logout();
    navigate('/login');
  };

  const topBarHeight = user ? 56 : 0;
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ minHeight: '100vh', pt: `${topBarHeight}px` }}>
      {/* Top Bar for logged-in users */}
      {user && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 3,
            py: 1.5,
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 28, height: 28, borderRadius: 0.7,
                background: 'linear-gradient(135deg, #1a73e8, #1557b0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '0.75rem' }}>P</Typography>
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'primary.main' }}>
              ProcureAI
            </Typography>
            {user?.organizationName && (
              <>
                <Typography sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>|</Typography>
                <Typography sx={{ fontWeight: 500, fontSize: '0.8rem', color: 'text.secondary' }}>
                  {user.organizationName}
                </Typography>
              </>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={handleGetStarted}
              sx={{ borderRadius: 2, fontSize: '0.8rem', textTransform: 'none' }}
            >
              Dashboard
            </Button>
            <Avatar
              src={getAvatarUrl(user?.name, 30)}
              alt={user?.name || 'User avatar'}
              sx={{ width: 30, height: 30, cursor: 'pointer' }}
              onClick={(e) => setAnchorEl(e.currentTarget)}
            />
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{ sx: { borderRadius: 2, minWidth: 160 } }}
          >
            <MenuItem disabled sx={{ opacity: 0.7 }}>
              <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { setAnchorEl(null); navigate('/profile'); }}>
              <Person sx={{ mr: 1.5, fontSize: 18 }} /> Profile
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1.5, fontSize: 18 }} /> Sign Out
            </MenuItem>
          </Menu>
        </Box>
      )}

      {/* ─── Hero Section — animated gradient + floating shapes ─── */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          py: { xs: 8, md: 12 },
          px: 3,
          textAlign: 'center',
          background: isDark
            ? 'linear-gradient(135deg, #0d1b2a 0%, #1b2838 50%, #0d1b2a 100%)'
            : 'linear-gradient(135deg, #e8edf5 0%, #f5f7fa 50%, #e8edf5 100%)',
        }}
      >
        {/* Animated gradient blobs */}
        <Box
          sx={{
            position: 'absolute',
            top: '-15%',
            right: '-10%',
            width: 520,
            height: 520,
            borderRadius: '50%',
            background: isDark
              ? 'radial-gradient(circle, rgba(138,180,248,0.18) 0%, transparent 65%)'
              : 'radial-gradient(circle, rgba(26,115,232,0.16) 0%, transparent 65%)',
            animation: 'blob 18s ease-in-out infinite',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '-20%',
            left: '-8%',
            width: 460,
            height: 460,
            borderRadius: '50%',
            background: isDark
              ? 'radial-gradient(circle, rgba(129,201,149,0.14) 0%, transparent 65%)'
              : 'radial-gradient(circle, rgba(52,168,83,0.14) 0%, transparent 65%)',
            animation: 'blob 22s ease-in-out infinite reverse',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: '30%',
            left: '12%',
            width: 240,
            height: 240,
            borderRadius: '50%',
            background: isDark
              ? 'radial-gradient(circle, rgba(246,173,85,0.12) 0%, transparent 65%)'
              : 'radial-gradient(circle, rgba(249,171,0,0.12) 0%, transparent 65%)',
            animation: 'blob 26s ease-in-out infinite',
          }}
        />

        {/* Floating shapes */}
        <FloatingShape top="18%" left="6%" size={46} color="#8ab4f8" delay={0.5} />
        <FloatingShape top="62%" left="8%" size={34} color="#81c995" delay={1.4} type="square" />
        <FloatingShape top="24%" left="86%" size={40} color="#fdd663" delay={2.2} />
        <FloatingShape top="68%" left="88%" size={52} color="#c58af9" delay={0.9} type="square" />
        <FloatingShape top="12%" left="45%" size={26} color="#ea4335" delay={3} />

        <Box sx={{ position: 'relative', maxWidth: 860, mx: 'auto' }}>
          <Chip
            label="🤖 AI-Powered Procurement"
            sx={{
              mb: 3,
              bgcolor: isDark ? 'rgba(138,180,248,0.12)' : 'rgba(26,115,232,0.08)',
              color: 'primary.main',
              fontWeight: 600,
              fontSize: '0.8rem',
              px: 1.5,
              border: '1px solid',
              borderColor: 'primary.main',
              backdropFilter: 'blur(6px)',
            }}
          />
          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              mb: 2,
              fontSize: { xs: '2.2rem', md: '3.6rem' },
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
            }}
          >
            Procurement,
            <Box
              component="span"
              sx={{
                background: isDark
                  ? 'linear-gradient(135deg, #aecbfa 0%, #81c995 100%)'
                  : 'linear-gradient(135deg, #1a73e8 0%, #34a853 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                display: 'inline-block',
              }}
            >
              {' '}Reimagined
            </Box>
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ mb: 4, maxWidth: 620, mx: 'auto', lineHeight: 1.6, fontWeight: 400 }}
          >
            Streamline your procurement process with AI-powered vendor recommendations,
            Kanban boards, real-time analytics, and an autonomous agent that works for you.
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
                boxShadow: '0 8px 24px rgba(26,115,232,0.35)',
                '&:hover': { boxShadow: '0 12px 32px rgba(26,115,232,0.45)' },
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
                  borderColor: 'divider',
                  backdropFilter: 'blur(6px)',
                  bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.6)',
                }}
              >
                Sign In
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      {/* ─── Animated Stats Bar ─── */}
      <Box ref={statsRef} sx={{ py: { xs: 4, md: 5 }, px: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Grid container spacing={3} sx={{ maxWidth: 1100, mx: 'auto' }}>
          {STATS.map((stat, i) => (
            <Grid item xs={6} md={3} key={stat.label} sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1.5,
                  opacity: statsInView ? 1 : 0,
                  transform: statsInView ? 'translateY(0)' : 'translateY(12px)',
                  transition: `all 0.5s ease ${i * 0.1}s`,
                }}
              >
                <Box sx={{ color: 'primary.main', display: 'flex' }}>{stat.icon}</Box>
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1 }}>
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} variant="h4" color="primary.main" />
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* ─── Features Section ─── */}
      <Box sx={{ py: { xs: 6, md: 10 }, px: 3 }}>
        <Typography variant="h3" sx={{ fontWeight: 800, textAlign: 'center', mb: 1, letterSpacing: '-0.02em' }}>
          Everything you need
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ textAlign: 'center', mb: 6, fontWeight: 400 }}>
          A complete procurement management solution for your organization
        </Typography>
        <Grid container spacing={3} sx={{ maxWidth: 1200, mx: 'auto' }}>
          {features.map((feature, i) => (
            <Grid item xs={12} sm={6} md={4} key={feature.title} sx={{ display: 'flex' }}>
              <Card
                sx={{
                  height: '100%',
                  width: '100%',
                  textAlign: 'center',
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'transform 0.25s, box-shadow 0.25s, border-color 0.25s',
                  '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: `0 16px 40px ${feature.hex}22`,
                    borderColor: `${feature.hex}66`,
                  },
                  animation: `fadeInUp 0.5s ease ${i * 0.08}s both`,
                }}
              >
                <CardContent sx={{ p: 3.5 }}>
                  <Avatar
                    sx={{
                      width: 64,
                      height: 64,
                      mx: 'auto',
                      mb: 2,
                      background: `linear-gradient(135deg, ${feature.hex}22, ${feature.hex}0d)`,
                      color: feature.hex,
                      border: `1px solid ${feature.hex}44`,
                    }}
                  >
                    {feature.icon}
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, fontSize: '1rem' }}>
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

      {/* ─── How It Works Section ─── */}
      <Box
        sx={{
          py: { xs: 6, md: 10 },
          px: 3,
          bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
        }}
      >
        <Typography variant="h3" sx={{ fontWeight: 800, textAlign: 'center', mb: 1, letterSpacing: '-0.02em' }}>
          How it works
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ textAlign: 'center', mb: 6, fontWeight: 400 }}>
          Four simple steps to smarter procurement
        </Typography>
        <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 1000, mx: 'auto' }}>
          {steps.map((step, i) => (
            <Card
              key={step.step}
              sx={{
                flex: '1 1 200px',
                maxWidth: 240,
                textAlign: 'center',
                border: '1px solid',
                borderColor: 'divider',
                position: 'relative',
                animation: `fadeInUp 0.5s ease ${0.15 + i * 0.1}s both`,
              }}
            >
              {i < steps.length - 1 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 36,
                    right: -24,
                    width: 24,
                    height: 2,
                    background: (theme) =>
                      `linear-gradient(90deg, ${theme.palette.mode === 'dark' ? '#8ab4f8' : '#1a73e8'}, transparent)`,
                    display: { xs: 'none', sm: 'block' },
                  }}
                />
              )}
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    width: 46,
                    height: 46,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1a73e8 0%, #1557b0 100%)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                    fontWeight: 800,
                    fontSize: '1.15rem',
                    boxShadow: '0 4px 14px rgba(26,115,232,0.35)',
                  }}
                >
                  {step.step}
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, fontSize: '1rem' }}>
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

      {/* ─── CTA Section ─── */}
      <Box
        sx={{
          py: { xs: 7, md: 10 },
          px: 3,
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 500,
            height: 500,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background: isDark
              ? 'radial-gradient(circle, rgba(138,180,248,0.1) 0%, transparent 60%)'
              : 'radial-gradient(circle, rgba(26,115,232,0.08) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />
        <Box sx={{ position: 'relative' }}>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, letterSpacing: '-0.02em' }}>
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
              boxShadow: '0 8px 24px rgba(26,115,232,0.35)',
            }}
          >
            {user ? 'Go to Dashboard' : "Start Now — It's Free"}
          </Button>
        </Box>
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
