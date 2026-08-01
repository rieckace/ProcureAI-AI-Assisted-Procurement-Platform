import { useLocation } from 'react-router-dom';
import { Box } from '@mui/material';

/**
 * PageTransition — wraps routed content with a smooth fade + slide
 * animation that replays on every route change.
 *
 * Usage:
 *   <PageTransition><Outlet /></PageTransition>
 */
export default function PageTransition({ children }) {
  const location = useLocation();
  return (
    <Box key={location.key} sx={{ animation: 'pageEnter 0.45s cubic-bezier(0.22, 1, 0.36, 1) both' }}>
      {children}
    </Box>
  );
}
