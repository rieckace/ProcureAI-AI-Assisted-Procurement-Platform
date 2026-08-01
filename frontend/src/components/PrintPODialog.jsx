import { Box, Typography, Button, Dialog, DialogContent, DialogActions, Divider, Chip } from '@mui/material';
import { Print } from '@mui/icons-material';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmt(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/**
 * PrintPODialog — displays a clean, print-ready Purchase Order document.
 * The Print button triggers window.print(); a print stylesheet hides
 * everything on the page except this document.
 */
export default function PrintPODialog({ open, onClose, po }) {
  if (!po) return null;

  const pr = po.purchaseRequest || {};
  const vendor = po.vendor || {};
  const delivery = po.delivery || {};

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #po-doc, #po-doc * { visibility: visible !important; }
          #po-doc { position: absolute !important; left: 0; top: 0; width: 100%; box-shadow: none !important; }
        }
      `}</style>
      <DialogContent sx={{ p: 0 }}>
        <Box id="po-doc" sx={{ p: { xs: 3, sm: 5 }, bgcolor: 'background.paper' }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                Procure<span style={{ color: '#1a73e8' }}>AI</span>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                AI-Powered Procurement System
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                {po.poNumber}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Purchase Order
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Parties */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3, mb: 3 }}>
            <Box>
              <Typography variant="overline" sx={{ color: 'text.disabled', fontSize: '0.6rem' }}>Buyer</Typography>
              <Typography variant="body1" fontWeight={600}>{pr.user?.name || 'Procurement Team'}</Typography>
              <Typography variant="body2" color="text.secondary">{pr.user?.email || ''}</Typography>
              <Typography variant="body2" color="text.secondary">Requested by: {pr.user?.name || '—'}</Typography>
            </Box>
            <Box>
              <Typography variant="overline" sx={{ color: 'text.disabled', fontSize: '0.6rem' }}>Vendor</Typography>
              <Typography variant="body1" fontWeight={600}>{vendor.name || '—'}</Typography>
              <Typography variant="body2" color="text.secondary">{vendor.email || ''}</Typography>
              <Typography variant="body2" color="text.secondary">Rating: {vendor.rating ? `${vendor.rating} ★` : '—'}</Typography>
            </Box>
          </Box>

          {/* Line item table */}
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', mb: 3 }}>
            <Box sx={{ px: 2.5, py: 1.5, bgcolor: 'action.hover', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" fontWeight={700}>Order Details</Typography>
              <Chip label={po.status?.replace(/_/g, ' ')} size="small" color="primary" sx={{ fontSize: '0.6rem' }} />
            </Box>
            <Box sx={{ p: 2.5, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr 1fr' }, gap: 1.5 }}>
              <Box>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>ITEM</Typography>
                <Typography variant="body2" fontWeight={600}>{pr.itemName || '—'}</Typography>
                <Typography variant="caption" color="text.secondary">{pr.category}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>QUANTITY</Typography>
                <Typography variant="body2" fontWeight={600}>{pr.quantity || '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>UNIT PRICE</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {po.totalAmount && pr.quantity ? `$${(po.totalAmount / pr.quantity).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>TOTAL</Typography>
                <Typography variant="body1" fontWeight={800} sx={{ color: 'primary.main' }}>
                  ${po.totalAmount?.toLocaleString() || '0'}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Delivery */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, mb: 4 }}>
            <Box>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>ORDER DATE</Typography>
              <Typography variant="body2">{fmt(po.createdAt)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>EXPECTED DELIVERY</Typography>
              <Typography variant="body2">{fmt(po.expectedDelivery)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>TRACKING</Typography>
              <Typography variant="body2">{delivery.trackingNumber || 'Not assigned yet'}</Typography>
            </Box>
          </Box>

          <Box sx={{ borderTop: '2px solid', borderColor: 'divider', pt: 2, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="caption" color="text.disabled">
              Generated by ProcureAI · {new Date().toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              {po.approvedBy ? `Approved by ${po.approvedBy}` : 'Pending approval'}
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, bgcolor: 'background.paper' }}>
        <Button onClick={onClose} sx={{ borderRadius: 2, textTransform: 'none' }}>Close</Button>
        <Button
          variant="contained"
          startIcon={<Print />}
          onClick={() => window.print()}
          sx={{ borderRadius: 2, textTransform: 'none' }}
        >
          Print / Save PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
}
