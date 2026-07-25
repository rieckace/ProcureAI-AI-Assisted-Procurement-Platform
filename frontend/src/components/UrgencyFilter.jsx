import { Box, Chip, Tooltip } from '@mui/material';
import { PriorityHigh } from '@mui/icons-material';
import { URGENCY_COLORS } from '../constants';

const URGENCIES = ['all', 'low', 'medium', 'high', 'critical'];

const URGENCY_HINTS = {
  all: 'Show all urgency levels',
  low: 'Non-urgent — can be scheduled flexibly',
  medium: 'Moderate priority — standard processing',
  high: 'Urgent — needs prompt attention',
  critical: 'Critical — immediate action required',
};

export default function UrgencyFilter({ urgencyFilter, onUrgencyChange }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5, flexWrap: 'wrap' }}>
      <PriorityHigh sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
      {URGENCIES.map((urgency) => (
        <Tooltip key={urgency} title={URGENCY_HINTS[urgency]} arrow>
          <Chip
            label={urgency === 'all' ? 'All Urgency' : urgency.charAt(0).toUpperCase() + urgency.slice(1)}
            size="small"
            onClick={() => onUrgencyChange(urgency)}
            variant={urgencyFilter === urgency ? 'filled' : 'outlined'}
            sx={{
              fontWeight: 500,
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              ...(urgencyFilter === urgency
                ? {
                    bgcolor: urgency === 'all' ? 'primary.main' : (URGENCY_COLORS[urgency]?.bg || 'primary.main'),
                    color: urgency === 'all' ? 'white' : (URGENCY_COLORS[urgency]?.text || 'white'),
                    borderColor: 'transparent',
                    '&:hover': { opacity: 0.85 },
                  }
                : {
                    borderColor: urgency === 'all' ? 'divider' : (URGENCY_COLORS[urgency]?.bg || 'divider'),
                    color: urgency === 'all' ? 'text.secondary' : (URGENCY_COLORS[urgency]?.text || 'text.secondary'),
                    '&:hover': {
                      bgcolor: URGENCY_COLORS[urgency]?.bg || 'action.hover',
                      borderColor: urgency === 'all' ? 'text.secondary' : (URGENCY_COLORS[urgency]?.text || 'text.secondary'),
                    },
                  }),
            }}
          />
        </Tooltip>
      ))}
    </Box>
  );
}
