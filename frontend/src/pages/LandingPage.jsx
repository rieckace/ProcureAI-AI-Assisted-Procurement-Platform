import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Grid, Chip, Avatar,
  Menu, MenuItem, Divider, useTheme, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import {
  SmartToy, Speed, Security, ArrowForward,
  ShoppingCart, BarChart, Logout, Person,
  CheckCircle, Store, Inventory2, LocalShipping, Insights, Lock, ExpandMore
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { getAvatarUrl } from '../utils/avatar';
import AnimatedCounter from '../components/AnimatedCounter';
import Logo from '../components/Logo';

const features = [
  {
    icon: <SmartToy sx={{ fontSize: 32 }} />,
    title: 'AI-Powered Recommendations',
    description: 'Get intelligent vendor suggestions based on price, delivery, and quality scoring.',
    hex: '#6366f1',
  },
  {
    icon: <Speed sx={{ fontSize: 32 }} />,
    title: 'Streamlined Workflow',
    description: 'From purchase request to delivery — manage the entire procurement lifecycle in one place.',
    hex: '#f59e0b',
  },
  {
    icon: <BarChart sx={{ fontSize: 32 }} />,
    title: 'Kanban Board & Analytics',
    description: 'Visualize your procurement pipeline with drag-and-drop boards and detailed analytics.',
    hex: '#10b981',
  },
  {
    icon: <Security sx={{ fontSize: 32 }} />,
    title: 'Role-Based Access',
    description: 'Secure multi-role system with Org Admin, Officer, and Manager views.',
    hex: '#ef4444',
  },
  {
    icon: <ShoppingCart sx={{ fontSize: 32 }} />,
    title: 'Multi-Organization',
    description: 'Create your organization, invite team members, and manage procurement together.',
    hex: '#818cf8',
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

const faqs = [
  { q: 'How does ProcureAI recommend vendors?', a: 'Procura AI scores vendors on price, delivery reliability, and quality, then suggests the strongest options for each purchase request.' },
  { q: 'Who can create purchase requests?', a: 'Managers can submit requests with budget and urgency. Officers review, compare quotes, approve, and manage purchase orders end to end.' },
  { q: 'Does ProcureAI support multiple teams?', a: 'Yes. Org Admins can spin up organizations, invite members with role-based access, and manage everything from a single admin panel.' },
  { q: 'Can I track deliveries live?', a: 'Absolutely. Delivery tracking updates statuses from order placement through delivery, with notifications along the way.' },
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
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
      setScrollProgress(progress);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', pt: `${topBarHeight}px` }}>
      {/* Scroll Progress Bar */}
      <Box
        sx={{
          position: 'fixed',
          top: user ? `${topBarHeight}px` : 0,
          left: 0,
          right: 0,
          height: 3,
          zIndex: 1200,
          background: 'transparent',
        }}
      >
        <Box
          sx={{
            height: '100%',
            background: 'linear-gradient(90deg, #6366f1, #10b981)',
            transformOrigin: 'left',
            transform: `scaleX(${scrollProgress})`,
            transition: 'transform 0.1s linear',
          }}
        />
      </Box>

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
            <Logo size={28} />
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
            ? 'linear-gradient(135deg, #0b0f19 0%, #141b2e 50%, #0b0f19 100%)'
            : 'linear-gradient(135deg, #eef1fb 0%, #f6f7fb 50%, #eef1fb 100%)',
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
              ? 'radial-gradient(circle, rgba(165,180,252,0.18) 0%, transparent 65%)'
              : 'radial-gradient(circle, rgba(99,102,241,0.16) 0%, transparent 65%)',
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
              ? 'radial-gradient(circle, rgba(52,211,153,0.14) 0%, transparent 65%)'
              : 'radial-gradient(circle, rgba(16,185,129,0.14) 0%, transparent 65%)',
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
              ? 'radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 65%)'
              : 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 65%)',
            animation: 'blob 26s ease-in-out infinite',
          }}
        />

        {/* Floating shapes */}
        <FloatingShape top="18%" left="6%" size={46} color="#818cf8" delay={0.5} />
        <FloatingShape top="62%" left="8%" size={34} color="#34d399" delay={1.4} type="square" />
        <FloatingShape top="24%" left="86%" size={40} color="#fbbf24" delay={2.2} />
        <FloatingShape top="68%" left="88%" size={52} color="#c58af9" delay={0.9} type="square" />
        <FloatingShape top="12%" left="45%" size={26} color="#ef4444" delay={3} />

        <Box sx={{ position: 'relative', maxWidth: 860, mx: 'auto' }}>
          <Chip
            label="AI-Powered Procurement"
            icon={
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: '#10b981',
                  boxShadow: '0 0 0 0 rgba(16,185,129,0.6)',
                  animation: 'pulse 2s ease-in-out infinite',
                  ml: '10px !important',
                }}
              />
            }
            sx={{
              mb: 3,
              bgcolor: isDark ? 'rgba(165,180,252,0.12)' : 'rgba(99,102,241,0.08)',
              color: 'primary.main',
              fontWeight: 600,
              fontSize: '0.8rem',
              px: 1.5,
              height: 34,
              border: '1px solid',
              borderColor: 'primary.light',
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
                  ? 'linear-gradient(135deg, #a5b4fc 0%, #34d399 100%)'
                  : 'linear-gradient(135deg, #6366f1 0%, #10b981 100%)',
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
                boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
                '&:hover': { boxShadow: '0 12px 32px rgba(99,102,241,0.45)' },
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

          {/* ─── Product Mockup Card ─── */}
          <Box sx={{ position: 'relative', maxWidth: 780, mx: 'auto', mt: 7 }}>
            <Card
              sx={{
                borderRadius: 4,
                border: '1px solid',
                borderColor: isDark ? 'rgba(165,180,252,0.18)' : 'rgba(99,102,241,0.18)',
                boxShadow: isDark
                  ? '0 30px 80px rgba(0,0,0,0.55)'
                  : '0 30px 80px rgba(99,102,241,0.18)',
                overflow: 'hidden',
                textAlign: 'left',
                background: (theme) => theme.palette.mode === 'dark' ? '#121826' : '#ffffff',
                animation: 'fadeInUp 0.7s ease 0.25s both',
              }}
            >
              {/* Browser chrome */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2.5, py: 1.5, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', gap: 0.6 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ef4444' }} />
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#10b981' }} />
                </Box>
                <Box sx={{ flex: 1, mx: 2, py: 0.6, px: 2, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <Lock sx={{ fontSize: 12, color: 'text.disabled' }} />
                  <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>procureai.app/officer-dashboard</Typography>
                </Box>
              </Box>

              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                {/* Mock stat tiles */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                  {[
                    { icon: <Store sx={{ fontSize: 20 }} />, label: 'Requests', value: '1,240', hex: '#6366f1' },
                    { icon: <CheckCircle sx={{ fontSize: 20 }} />, label: 'Delivered', value: '1,090', hex: '#10b981' },
                    { icon: <Inventory2 sx={{ fontSize: 20 }} />, label: 'Vendors', value: '180', hex: '#0ea5e9' },
                    { icon: <LocalShipping sx={{ fontSize: 20 }} />, label: 'On-time', value: '96%', hex: '#f59e0b' },
                  ].map((t) => (
                    <Box key={t.label} sx={{ p: 2, borderRadius: 2.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.8 }}>
                        <Box sx={{ width: 32, height: 32, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${t.hex}1f`, color: t.hex }}>{t.icon}</Box>
                        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 500 }}>{t.label}</Typography>
                      </Box>
                      <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', lineHeight: 1, letterSpacing: '-0.02em' }}>{t.value}</Typography>
                    </Box>
                  ))}
                </Box>

                {/* Mock Kanban lanes */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5, mt: 1.5 }}>
                  {[
                    { title: 'Requested', dot: '#f59e0b', cards: ['Kachi Ghani Mustard Oil', 'Sona Masoori Rice (50kg)'] },
                    { title: 'Quoted', dot: '#6366f1', cards: ['Whole Wheat Flour (25kg)', 'Refined Soybean Oil (15L)'] },
                    { title: 'Ordered', dot: '#10b981', cards: ['Iodized Salt (25kg)', 'Chana Dal (25kg)'] },
                  ].map((lane) => (
                    <Box key={lane.title} sx={{ p: 1.5, borderRadius: 2.5, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.2, px: 0.5 }}>
                        <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: lane.dot, boxShadow: `0 0 0 3px ${lane.dot}22` }} />
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{lane.title}</Typography>
                        <Box sx={{ ml: 'auto', px: 1, py: 0.2, borderRadius: 999, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', fontSize: '0.6rem', fontWeight: 700, color: 'text.secondary' }}>{lane.cards.length}</Box>
                      </Box>
                      {lane.cards.map((c) => (
                        <Box key={c} sx={{ mb: 1, p: 1.4, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(15,23,42,0.06)' }}>
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 0.6 }}>{c}</Typography>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Box sx={{ px: 1, py: 0.2, borderRadius: 999, fontSize: '0.55rem', fontWeight: 700, bgcolor: `${lane.dot}1f`, color: lane.dot }}>high</Box>
                            <Box sx={{ px: 1, py: 0.2, borderRadius: 999, fontSize: '0.55rem', fontWeight: 600, bgcolor: 'action.hover', color: 'text.secondary' }}>2 quotes</Box>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>

            {/* Floating AI badge */}
            <Box sx={{ position: 'absolute', top: -14, right: { xs: 12, md: -18 }, animation: 'float 3.5s ease-in-out infinite', zIndex: 1 }}>
              <Chip
                avatar={<SmartToy sx={{ color: '#a5b4fc' }} />}
                label="Procura AI · best deal found"
                sx={{
                  height: 34,
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  color: '#ffffff',
                  border: '1px solid rgba(165,180,252,0.4)',
                  bgcolor: isDark ? 'rgba(17,24,39,0.95)' : '#4f46e5',
                  boxShadow: '0 12px 30px rgba(99,102,241,0.4)',
                  backdropFilter: 'blur(8px)',
                }}
              />
            </Box>
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
                      `linear-gradient(90deg, ${theme.palette.mode === 'dark' ? '#818cf8' : '#6366f1'}, transparent)`,
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
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                    fontWeight: 800,
                    fontSize: '1.15rem',
                    boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
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

      {/* ─── FAQ Section ─── */}
      <Box sx={{ py: { xs: 7, md: 9 }, px: 3 }}>
        <Typography variant="h2" sx={{ textAlign: 'center', mb: 1 }}>
          Frequently asked questions
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mb: 4, fontWeight: 400 }}>
          Everything you need to know about ProcureAI
        </Typography>
        <Box sx={{ maxWidth: 760, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {faqs.map((faq, i) => (
            <Accordion
              key={i}
              disableGutters
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                boxShadow: 'none',
                bgcolor: 'background.paper',
                transition: 'box-shadow 0.2s ease',
                '&::before': { display: 'none' },
                '&.Mui-expanded': { boxShadow: '0 8px 24px rgba(15,23,42,0.08)' },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore sx={{ color: 'text.secondary' }} />}
                sx={{ px: 2.5, '&:hover': { bgcolor: 'action.hover' }, borderRadius: 2 }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                  {faq.q}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                  {faq.a}
                </Typography>
              </AccordionDetails>
            </Accordion>
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
              ? 'radial-gradient(circle, rgba(165,180,252,0.1) 0%, transparent 60%)'
              : 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />
        <Box
          sx={{
            maxWidth: 760,
            mx: 'auto',
            position: 'relative',
            overflow: 'hidden',
            py: { xs: 5, md: 6 },
            px: { xs: 3, md: 6 },
            borderRadius: 4,
            border: '1px solid',
            borderColor: isDark ? 'rgba(165,180,252,0.25)' : 'rgba(99,102,241,0.2)',
            background: isDark
              ? 'linear-gradient(135deg, rgba(129,140,248,0.14) 0%, rgba(52,211,153,0.1) 100%)'
              : 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(16,185,129,0.06) 100%)',
            backdropFilter: 'blur(8px)',
          }}
        >
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
                boxShadow: '0 12px 30px rgba(99,102,241,0.4)',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 16px 36px rgba(99,102,241,0.5)' },
              }}
            >
              {user ? 'Go to Dashboard' : "Start Now — It's Free"}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          background: isDark
            ? 'linear-gradient(180deg, rgba(99,102,241,0.04) 0%, transparent 100%)'
            : 'linear-gradient(180deg, rgba(99,102,241,0.03) 0%, transparent 100%)',
        }}
      >
        <Box
          sx={{
            maxWidth: 1200,
            mx: 'auto',
            px: { xs: 3, md: 6 },
            py: 4,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Logo size={34} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.1 }}>
                ProcureAI
              </Typography>
              <Typography variant="caption" color="text.secondary">
                AI-Powered Procurement Management System
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'success.main',
                animation: 'pulse 2s ease-in-out infinite',
              }}
            />
            <Typography variant="body2" color="text.secondary">
              All systems operational
            </Typography>
          </Box>
        </Box>

        <Box sx={{ borderTop: '1px dashed', borderColor: 'divider' }}>
          <Box
            sx={{
              maxWidth: 1200,
              mx: 'auto',
              px: { xs: 3, md: 6 },
              py: 2,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Typography variant="caption" color="text.disabled">
              © {new Date().getFullYear()} ProcureAI. Built for modern procurement teams.
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Requests · Quotes · Purchase Orders · Deliveries · Analytics
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
