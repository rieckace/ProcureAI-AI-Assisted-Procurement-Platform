import { Drawer, Box, Typography, Button, IconButton, Chip, Avatar } from '@mui/material';
import {
  Close, OpenInNew, CompareArrows, LocalShipping,
} from '@mui/icons-material';
import StatusChip from './StatusChip';
import ProcurementLifecycleStepper from './ProcurementLifecycleStepper';
import { URGENCY_COLORS } from '../constants';
import { getAvatarUrl } from '../utils/avatar';

export default function PRQuickDrawer({ open, onClose, pr, onOpenFull, onCompare }) {
  if (!pr) return null;

  const isCompleted = pr.status === 'ordered' || pr.status === 'delivered';
  const isCancelled = pr.status === 'rejected' || pr.status === 'cancelled';
  // Guard against null entries (defensive: older/padded API responses)
  const quotes = (pr.quotes || []).filter(Boolean);

  const handleAction = (fn) => {
    onClose();
    if (fn) fn();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      ModalProps={{
        slotProps: { backdrop: { sx: { backdropFilter: 'blur(3px)', bgcolor: 'rgba(15,23,42,0.4)' } } },
      }}
      PaperProps={{ sx: { width: { xs: '100%', sm: 400 }, maxWidth: '100%', borderRadius: 0 } }}
    >
      {/* Accent bar */}
      <Box
        sx={{
          height: 3,
          background: 'linear-gradient(90deg, #6366f1 0%, #0ea5e9 100%)',
        }}
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box sx={{ p: 2.5, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography
              sx={{
                fontSize: '0.6rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: 'text.disabled',
              }}
            >
              Quick preview
            </Typography>
            <IconButton size="small" onClick={onClose} aria-label="Close preview">
              <Close fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
            <StatusChip status={pr.status} />
            <Chip
              label={pr.urgency}
              size="small"
              sx={{
                backgroundColor: URGENCY_COLORS[pr.urgency]?.bg || 'action.hover',
                color: URGENCY_COLORS[pr.urgency]?.text || 'text.primary',
                fontWeight: 600,
                textTransform: 'capitalize',
                fontSize: '0.7rem',
              }}
            />
          </Box>

          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.015em', lineHeight: 1.3, mb: 0.5 }}>
            {pr.itemName}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              src={getAvatarUrl(pr.user?.name, 24)}
              alt={pr.user?.name || 'Requester'}
              sx={{ width: 24, height: 24, fontSize: '0.7rem' }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
              {pr.user?.name || 'Unknown requester'}
            </Typography>
            <Typography variant="caption" color="text.disabled">·</Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(pr.createdAt).toLocaleDateString()}
            </Typography>
          </Box>
        </Box>

        {/* Facts */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1,
            p: 2.5,
            pb: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          {[
            { label: 'Quantity', value: `${pr.quantity} ${pr.unit || 'units'}` },
            { label: 'Budget', value: `₹${pr.budget.toLocaleString('en-IN')}` },
            { label: 'Quotes', value: quotes.length },
          ].map((f) => (
            <Box key={f.label}>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.62rem', display: 'block' }}>
                {f.label}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.3 }}>
                {f.value}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Stepper */}
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography
            sx={{
              fontSize: '0.6rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: 'text.disabled',
              mb: 0.5,
            }}
          >
            Progress
          </Typography>
          <ProcurementLifecycleStepper status={pr.status} quoteCount={quotes.length} compact />
        </Box>

        {/* Quote preview */}
        <Box sx={{ flex: 1, overflow: 'auto', px: 2.5, py: 2 }}>
          {quotes.length > 0 ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Quotes received</Typography>
                <Chip label={`${quotes.length} total`} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {quotes.slice(0, 3).map((q, i) => (
                  <Box
                    key={q.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: i === 0 ? 'primary.main' : 'divider',
                      backgroundColor: i === 0 ? 'rgba(99,102,241,0.06)' : 'action.hover',
                    }}
                  >
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: i === 0 ? 'primary.main' : 'action.selected',
                        color: i === 0 ? 'primary.contrastText' : 'text.secondary',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        flexShrink: 0,
                      }}
                    >
                      #{i + 1}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {q.vendor?.name || 'Vendor'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {q.deliveryDays}d delivery
                        {i === 0 && (
                          <span style={{ color: '#10b981', fontWeight: 700 }}> · Best price</span>
                        )}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
                      ₹{q.price.toLocaleString('en-IN')}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </>
          ) : isCancelled ? (
            <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>No quotes collected</Typography>
              <Typography variant="caption">This request was cancelled.</Typography>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
              <LocalShipping sx={{ fontSize: 28, opacity: 0.4, mb: 0.5 }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>No quotes yet</Typography>
              <Typography variant="caption">Vendor quotes will appear here once received.</Typography>
            </Box>
          )}
        </Box>

        {/* Actions */}
        <Box sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {!isCompleted && !isCancelled && quotes.length > 0 && (
            <Button
              fullWidth
              variant="outlined"
              color="success"
              startIcon={<CompareArrows />}
              onClick={() => handleAction(onCompare)}
              sx={{ borderRadius: 2, fontWeight: 600 }}
            >
              Compare Vendors
            </Button>
          )}
          <Button
            fullWidth
            variant="contained"
            startIcon={<OpenInNew />}
            onClick={() => handleAction(onOpenFull)}
            sx={{ borderRadius: 2, fontWeight: 600 }}
          >
            Open Request
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}