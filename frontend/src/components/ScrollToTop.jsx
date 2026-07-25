import { useState, useEffect } from 'react';
import { Box, Fade } from '@mui/material';
import { KeyboardArrowUp } from '@mui/icons-material';

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Fade in={visible}>
      <Box
        onClick={scrollToTop}
        sx={{
          position: 'fixed',
          bottom: 90,
          right: 72,
          zIndex: 1100,
          width: 36,
          height: 36,
          borderRadius: 1,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: 'primary.dark',
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          },
        }}
        role="button"
        aria-label="Scroll to top"
      >
        <KeyboardArrowUp sx={{ fontSize: 20 }} />
      </Box>
    </Fade>
  );
}
