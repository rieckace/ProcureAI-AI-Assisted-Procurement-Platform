import { Box, Typography, Button } from '@mui/material';
import {
  Send, CompareArrows, LocalShipping, CheckCircle, Cancel, TrendingUp,
} from '@mui/icons-material';
import { getAvatarUrl } from '../utils/avatar';

export default function NextActionBanner({
  pr,
  isOfficer,
  quoteCount = 0,
  onRequestQuotes,
  onCompare,
  onMarkDelivered,
}) {
  const status = pr?.status;

  const isCancelled = status === 'rejected' || status === 'cancelled';
  const isComplete = status === 'delivered';

  let tone;
  let icon;
  let title;
  let subtitle;
  let actions = [];

  const validQuotes = (pr?.quotes || []).filter(Boolean);
  if (isCancelled) {
    tone = 'error';
    icon = <Cancel />;
    title = 'Request cancelled';
    subtitle = 'No further action is required on this request.';
  } else if (isComplete) {
    tone = 'success';
    icon = <CheckCircle />;
    title = 'Delivered & completed';
    subtitle = 'This request has been fulfilled. Great work closing it out.';
  } else if (status === 'ordered') {
    tone = 'info';
    icon = <LocalShipping />;
    title = 'Order is in motion';
    subtitle = 'Purchase order issued — mark the delivery once the items arrive.';
    actions.push({
      label: 'Mark as Delivered',
      variant: 'contained',
      icon: <CheckCircle />,
      onClick: onMarkDelivered,
    });
  } else if (quoteCount === 0) {
    tone = 'primary';
    icon = <Send />;
    if (isOfficer) {
      title = 'No vendor quotes yet';
      subtitle = 'Reach out to vendors to collect pricing and move this request forward.';
      actions.push({
        label: 'Request Quotes',
        variant: 'contained',
        icon: <Send />,
        onClick: onRequestQuotes,
      });
    } else {
      title = 'Awaiting procurement review';
      subtitle = 'Your request is queued — the procurement officer will request vendor quotes next.';
    }
  } else {
    tone = 'success';
    icon = <TrendingUp />;
    title = `${quoteCount} quote${quoteCount > 1 ? 's' : ''} in — ready to evaluate`;
    subtitle = `Lowest offer ${validQuotes.length ? `₹${Math.min(...validQuotes.map(q => q.price)).toLocaleString('en-IN')}` : ''} • review vendors and pick the best fit.`;
    actions.push({
      label: 'Compare Vendors',
      variant: 'contained',
      icon: <CompareArrows />,
      onClick: onCompare,
    });
  }

  const accentColor =
    tone === 'error' ? '#ef4444'
    : tone === 'success' ? '#10b981'
    : tone === 'info' ? '#0ea5e9'
    : '#6366f1';

  if (pr?.user?.name) {
    actions.push({
      label: (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            component="span"
            sx={{
              width: 18, height: 18, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
            }}
          >
            <img src={getAvatarUrl(pr.user.name, 36)} alt={pr.user.name} style={{ width: 18, height: 18 }} />
          </Box>
          <span style={{ maxWidth: 140, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {pr.user.name}
          </span>
        </Box>
      ),
      variant: 'text',
      icon: null,
      onClick: undefined,
    });
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flexWrap: 'wrap',
        p: 2,
        borderRadius: 3,
        border: '1px solid',
        borderColor: `${accentColor}55`,
        background: (theme) => `linear-gradient(135deg, ${accentColor}${theme.palette.mode === 'dark' ? '22' : '18'} 0%, ${accentColor}0a 100%)`,
        position: 'relative',
        overflow: 'hidden',
        mb: 3,
      }}
    >
      {/* Left rail */}
      <Box
        sx={{
          width: 4,
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          borderRadius: 2,
          background: accentColor,
        }}
      />

      <Box
        sx={{
          width: 38,
          height: 38,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          backgroundColor: tone === 'error' ? 'rgba(239,68,68,0.12)' : tone === 'success' ? 'rgba(16,185,129,0.12)' : tone === 'info' ? 'rgba(14,165,233,0.12)' : 'rgba(99,102,241,0.12)',
          color: accentColor,
        }}
      >
        {icon}
      </Box>

      <Box sx={{ flex: 1, minWidth: 220 }}>
        <Typography
          sx={{
            fontSize: '0.58rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: accentColor,
            mb: 0.3,
          }}
        >
          Next step
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3, letterSpacing: '-0.01em' }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', lineHeight: 1.4, mt: 0.2 }}>
          {subtitle}
        </Typography>
      </Box>

      {actions.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', pl: 0.5 }}>
          {actions.slice(0, 2).map((a, i) => (
            a.variant === 'text' && a.onClick === undefined ? (
              <Typography key={i} variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.6 }}>
                {a.label}
              </Typography>
            ) : (
              <Button
                key={i}
                size="small"
                variant={a.variant}
                startIcon={a.icon}
                onClick={a.onClick}
                sx={{ borderRadius: 2, fontWeight: 600 }}
              >
                {a.label}
              </Button>
            )
          ))}
        </Box>
      )}
    </Box>
  );
}