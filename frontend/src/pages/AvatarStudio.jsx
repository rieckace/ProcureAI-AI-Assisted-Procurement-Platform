import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Avatar, Button,
  Chip, Divider, Tooltip, Alert, CircularProgress, TextField, InputAdornment, IconButton
} from '@mui/material';
import {
  SmartToy, CheckCircle, ColorLens, Palette, Shuffle
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getAvatarUrl, AVATAR_STYLES, BG_COLORS } from '../utils/avatar';
import api from '../api';

const GROUP_NAMES = {
  happy: '😊 Happy & Friendly',
  cartoon: '🎨 Cartoon Characters',
  clean: '👤 Clean & Professional',
  fun: '🎪 Fun & Playful',
  tech: '🤖 Tech & Bots',
  abstract: '🔷 Abstract & Patterns',
};

const STYLE_GROUPS = [...new Set(AVATAR_STYLES.map(s => s.group))];

export default function AvatarStudio() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [selectedStyle, setSelectedStyle] = useState(
    () => localStorage.getItem('procura_avatar_style') || 'big-smile'
  );
  const [selectedBg, setSelectedBg] = useState(
    () => localStorage.getItem('procura_avatar_bg') || 'b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf,fab7b7,e8d5b7,ffd6e0,f0d5e8,d5e8d5'
  );
  const [saving, setSaving] = useState(false);
  const [customColor, setCustomColor] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSelectStyle = async (styleId) => {
    setSelectedStyle(styleId);
    localStorage.setItem('procura_avatar_style', styleId);
    setSaving(true);
    try {
      await api.patch('/auth/profile', { avatarStyle: styleId });
      showToast(`Avatar style changed!`, 'success');
    } catch (err) {
      showToast('Saved locally (backend sync pending)', 'info');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectBg = (hex) => {
    setSelectedBg(hex);
    localStorage.setItem('procura_avatar_bg', hex);
  };

  const handleCustomColor = () => {
    const hex = customColor.replace('#', '').trim();
    if (/^[0-9a-fA-F]{6}$/.test(hex)) {
      setSelectedBg(hex);
      localStorage.setItem('procura_avatar_bg', hex);
      setCustomColor('');
      showToast('Custom background color applied!', 'success');
    } else {
      showToast('Enter a valid 6-digit hex color (e.g., ff5733)', 'error');
    }
  };

  const handleRandomize = () => {
    const randomStyle = AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)];
    const randomBg = BG_COLORS[Math.floor(Math.random() * BG_COLORS.length)];
    setSelectedStyle(randomStyle.id);
    setSelectedBg(randomBg.hex);
    localStorage.setItem('procura_avatar_style', randomStyle.id);
    localStorage.setItem('procura_avatar_bg', randomBg.hex);
    showToast(`Randomized: ${randomStyle.name} + ${randomBg.name}!`);
  };

  const copyAvatarUrl = () => {
    const url = getAvatarUrl(user?.name, 120, selectedStyle, selectedBg);
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      showToast('Avatar URL copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const currentBgDisplay = selectedBg.includes(',')
    ? 'b6e3f4'
    : selectedBg;

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SmartToy sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
              Avatar Studio
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Customize your profile avatar — pick a style and background color
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Shuffle />}
            onClick={handleRandomize}
            sx={{ borderRadius: 2 }}
          >
            Randomize
          </Button>
          <Button
            variant="outlined"
            onClick={copyAvatarUrl}
            sx={{ borderRadius: 2 }}
          >
            {copied ? 'Copied!' : 'Copy URL'}
          </Button>
        </Box>
      </Box>

      {/* Current Preview */}
      <Card sx={{ mb: 3, textAlign: 'center', position: 'relative' }}>
        {saving && (
          <CircularProgress
            size={24}
            sx={{ position: 'absolute', top: 16, right: 16 }}
          />
        )}
        <CardContent sx={{ py: 4 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Your Avatar
          </Typography>
          <Avatar
            src={getAvatarUrl(user?.name, 120, selectedStyle, selectedBg)}
            sx={{
              width: 120,
              height: 120,
              mx: 'auto',
              mb: 2,
              border: '3px solid',
              borderColor: `#${currentBgDisplay}`,
              boxShadow: `0 4px 20px rgba(${parseInt(currentBgDisplay.slice(0,2), 16)}, ${parseInt(currentBgDisplay.slice(2,4), 16)}, ${parseInt(currentBgDisplay.slice(4,6), 16)}, 0.3)`,
            }}
          />
          <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
            {user?.name}
          </Typography>
          <Chip
            label={user?.role}
            size="small"
            color="primary"
            sx={{ textTransform: 'capitalize', mb: 1 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Style: {AVATAR_STYLES.find(s => s.id === selectedStyle)?.name || selectedStyle}
            {selectedBg.includes(',') ? ' · Multi-color background' : ` · Background: #${selectedBg}`}
          </Typography>
        </CardContent>
      </Card>

      {/* Style Selector by Group */}
      {STYLE_GROUPS.map((group) => {
        const styles = AVATAR_STYLES.filter(s => s.group === group);
        return (
          <Card key={group} sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                {GROUP_NAMES[group]}
              </Typography>
              <Grid container spacing={1.5}>
                {styles.map((style) => (
                  <Grid item xs={6} sm={4} md={3} lg={2} key={style.id}>
                    <Card
                      sx={{
                        cursor: 'pointer',
                        border: selectedStyle === style.id ? '2px solid' : '1px solid',
                        borderColor: selectedStyle === style.id ? 'primary.main' : 'divider',
                        transition: 'all 0.2s ease',
                        bgcolor: selectedStyle === style.id ? 'action.selected' : 'transparent',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        },
                      }}
                      onClick={() => handleSelectStyle(style.id)}
                    >
                      <CardContent sx={{ textAlign: 'center', py: 1.5, px: 1 }}>
                        <Avatar
                          src={getAvatarUrl(user?.name, 40, style.id, selectedBg)}
                          sx={{
                            width: 56,
                            height: 56,
                            mx: 'auto',
                            mb: 0.5,
                          }}
                        />
                        <Typography variant="caption" fontWeight={selectedStyle === style.id ? 700 : 500}>
                          {style.name}
                        </Typography>
                        {selectedStyle === style.id && (
                          <CheckCircle sx={{ fontSize: 14, color: 'primary.main', display: 'block', mx: 'auto', mt: 0.3 }} />
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        );
      })}

      {/* Background Color Picker */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Palette color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Background Color
            </Typography>
          </Box>
          <Grid container spacing={1}>
            {BG_COLORS.map((color) => (
              <Grid item key={color.hex}>
                <Tooltip title={color.name}>
                  <Box
                    onClick={() => handleSelectBg(color.hex)}
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: `#${color.hex}`,
                      cursor: 'pointer',
                      border: selectedBg === color.hex || selectedBg.includes(color.hex)
                        ? '3px solid'
                        : '2px solid transparent',
                      borderColor: selectedBg === color.hex || selectedBg.includes(color.hex)
                        ? 'primary.main'
                        : 'divider',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'scale(1.15)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      },
                    }}
                  />
                </Tooltip>
              </Grid>
            ))}
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <ColorLens color="action" />
            <TextField
              size="small"
              placeholder="Custom hex color (e.g., ff5733)"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomColor()}
              sx={{ flex: 1, maxWidth: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">#</InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={handleCustomColor}
              sx={{ borderRadius: 2 }}
            >
              Apply
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* All Styles Preview Grid */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Quick Preview ({AVATAR_STYLES.length} Styles)
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={1.5}>
            {AVATAR_STYLES.map((style) => (
              <Grid item xs={3} sm={2} md={1.5} key={style.id} sx={{ textAlign: 'center' }}>
                <Box
                  onClick={() => handleSelectStyle(style.id)}
                  sx={{ cursor: 'pointer' }}
                >
                  <Avatar
                    src={getAvatarUrl('Sample', 36, style.id, selectedBg)}
                    sx={{
                      width: 44,
                      height: 44,
                      mx: 'auto',
                      mb: 0.3,
                      border: selectedStyle === style.id ? '2px solid' : '2px solid transparent',
                      borderColor: selectedStyle === style.id ? 'primary.main' : 'transparent',
                      transition: 'all 0.15s ease',
                      '&:hover': { transform: 'scale(1.1)' },
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                    {style.name}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
