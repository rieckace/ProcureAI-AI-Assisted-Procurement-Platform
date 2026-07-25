import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, Fab, Paper, Typography, TextField, IconButton, Avatar, Chip,
  CircularProgress, Tooltip, Badge, Zoom
} from '@mui/material';
import {
  SmartToy, Close, Send, DeleteSweep
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const CHAT_WIDTH = 380;
const CHAT_HEIGHT = 520;
const MAX_MESSAGE_LENGTH = 2000;

let messageCounter = 0;
const nextId = () => `msg_${Date.now()}_${++messageCounter}`;

/**
 * Safely render simple markdown without exposing XSS.
 * Only allows: **bold**, *italic*, and \n→<br/>.
 * Everything else is HTML-escaped.
 */
function renderSimpleMarkdown(text) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const formatted = escaped
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');

  return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
}

const STORAGE_KEY = 'procura_chat';

function getStorageKey(userId) {
  return `procura_chat_${userId}`;
}

/** Individual chat message bubble */
function ChatMessage({ msg, formatTime }) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        animation: 'fadeInUp 0.3s ease',
        '@keyframes fadeInUp': {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      {msg.role === 'assistant' && (
        <Avatar
          sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: '0.8rem', mt: 0.5, flexShrink: 0 }}
        >
          <SmartToy sx={{ fontSize: 16 }} />
        </Avatar>
      )}

      <Box
        sx={{
          maxWidth: '80%',
          px: 1.5,
          py: 1,
          borderRadius: 2,
          bgcolor: msg.role === 'user'
            ? 'primary.main'
            : (theme) => theme.palette.mode === 'dark'
              ? 'rgba(255,255,255,0.08)'
              : 'grey.100',
          color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
          borderBottomRightRadius: msg.role === 'user' ? 0.5 : 2,
          borderBottomLeftRadius: msg.role === 'assistant' ? 0.5 : 2,
          wordBreak: 'break-word',
          '& strong': { fontWeight: 700 },
          '& em': { fontStyle: 'italic' },
        }}
      >
        <Typography variant="body2" sx={{ lineHeight: 1.6, fontSize: '0.85rem' }}>
          {renderSimpleMarkdown(msg.content)}
          {msg.isStreaming && (
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                width: 6,
                height: 14,
                bgcolor: 'primary.main',
                ml: 0.3,
                animation: 'blink 0.8s step-end infinite',
                '@keyframes blink': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0 },
                },
              }}
            />
          )}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            display: 'block', mt: 0.3, opacity: 0.6, fontSize: '0.65rem',
            textAlign: msg.role === 'user' ? 'right' : 'left',
          }}
        >
          {formatTime(msg.timestamp)}
          {msg.isStreaming && ' • typing...'}
        </Typography>
      </Box>
    </Box>
  );
}

/** Load chat history from localStorage (only if from today) */
function loadChatHistory(userId) {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return null;
    const saved = JSON.parse(raw);
    const today = new Date().toDateString();
    if (saved.date !== today) return null;
    const hasWelcome = saved.messages?.some(m => m.role === 'assistant' && m.type === 'welcome');
    return {
      messages: saved.messages || [],
      hasEverOpened: saved.hasEverOpened || false,
      hasWelcome,
    };
  } catch {
    return null;
  }
}

/** Save chat history to localStorage */
function saveChatHistory(userId, messages, hasEverOpened) {
  try {
    const trimmed = messages.slice(-50);
    localStorage.setItem(getStorageKey(userId), JSON.stringify({
      date: new Date().toDateString(),
      hasEverOpened,
      messages: trimmed.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        fallback: m.fallback,
      })),
    }));
  } catch {
    // localStorage might be full — silently fail
  }
}

const KEYBOARD_SHORTCUT = 'The keyboard shortcut Cmd+K (Mac) or Ctrl+K (Windows) toggles Procura. It is registered on a global keydown listener.';

export default function ChatWidget() {
  const { user } = useAuth();
  const [initialLoading, setInitialLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [streamingMessage, setStreamingMessage] = useState(null); // { id, fullContent, displayIndex }
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isFirstOpen, setIsFirstOpen] = useState(true);
  const [hasEverOpened, setHasEverOpened] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const fabRef = useRef(null);
  const mountedRef = useRef(true);
  const streamTimerRef = useRef(null);

  // Load chat history on mount
  useEffect(() => {
    if (!user) return;
    const history = loadChatHistory(user.id);
    if (history) {
      setMessages(history.messages);
      setHasEverOpened(history.hasEverOpened);
      setIsFirstOpen(!history.hasWelcome);
      setShowSuggestions(!history.messages.length || history.messages[history.messages.length - 1]?.role === 'assistant');
      if (history.messages.length > 1) {
        setUnreadCount(1);
      }
    }
    setInitialLoading(false);
  }, [user]);

  const openRef = useRef(open);
  openRef.current = open;

  // Keyboard shortcut: Cmd+K (Mac) / Ctrl+K (Windows) to toggle chat
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        e.stopPropagation();
        if (!openRef.current) {
          // Opening via shortcut - trigger FAB click behavior via handleOpen
          setOpen(true);
          setHasEverOpened(true);
        } else {
          setOpen(false);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Typewriter streaming effect for assistant messages

  // Typewriter streaming effect for assistant messages
  useEffect(() => {
    if (!streamingMessage) return;

    const { id, fullContent, displayIndex } = streamingMessage;

    if (displayIndex >= fullContent.length) {
      // Streaming complete — add final message to messages array
      setMessages(prev => {
        // Don't add if already present
        if (prev.some(m => m.id === id)) return prev;
        return [...prev, {
          id,
          role: 'assistant',
          content: fullContent,
          timestamp: new Date(),
        }];
      });
      setStreamingMessage(null);
      return;
    }

    // Show next batch of characters (3-5 at a time for smooth feel)
    const charsToAdd = Math.min(4, fullContent.length - displayIndex);
    streamTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setStreamingMessage(prev =>
          prev?.id === id
            ? { ...prev, displayIndex: displayIndex + charsToAdd }
            : prev
        );
      }
    }, 12); // ~12ms per batch = smooth ~250 chars/sec

    return () => {
      if (streamTimerRef.current) clearTimeout(streamTimerRef.current);
    };
  }, [streamingMessage]);

  // Cleanup stream timer on unmount
  useEffect(() => {
    return () => {
      if (streamTimerRef.current) clearTimeout(streamTimerRef.current);
    };
  }, []);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (!initialLoading && user) {
      saveChatHistory(user.id, messages, hasEverOpened);
    }
  }, [messages, hasEverOpened, initialLoading, user]);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  useEffect(() => {
    if (user && !messages.length && !initialLoading) {
      loadSuggestions();
    }
  }, [user, initialLoading]);

  const loadSuggestions = async () => {
    try {
      const res = await api.get('/chat/suggestions');
      setSuggestions(res.data.suggestions || []);
    } catch {
      setSuggestions([
        { text: 'How can you help me?', action: 'help' },
      ]);
    }
  };

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    const roleMessages = {
      admin: `👋 ${greeting}, **${user?.name}**! I'm **Procura**, your AI procurement assistant. I can help you manage your organization, look up data, and guide you through any procurement task. What would you like to know?`,
      officer: `👋 ${greeting}, **${user?.name}**! I'm **Procura**, your AI procurement assistant. Need to check pending requests, find vendors, or get procurement guidance? I'm here to help!`,
      manager: `👋 ${greeting}, **${user?.name}**! I'm **Procura**, your AI procurement assistant. Ask me about your requests, get help creating new ones, or learn how procurement works. What can I help with?`,
    };

    return roleMessages[user?.role] || roleMessages.manager;
  };

  /** Shared helper — sends a message string through the chat API */
  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading) return;

    const userMsg = { id: nextId(), role: 'user', content: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setShowSuggestions(false);
    setLoading(true);

    try {
      const res = await api.post('/chat', {
        message: text.trim(),
        context: { page: window.location.pathname },
      });

      if (!mountedRef.current) return;

      // Start typewriter streaming for the assistant response
      const streamId = nextId();
      setStreamingMessage({
        id: streamId,
        fullContent: res.data.message,
        displayIndex: 0,
      });

      // Meanwhile, show suggestions and handle navigation from the get-go
      if (res.data.suggestions?.length) {
        setSuggestions(res.data.suggestions);
        setShowSuggestions(true);
      }

      if (res.data.navigate) {
        setTimeout(() => { window.location.href = res.data.navigate.path; }, 1500);
      }
    } catch {
      if (!mountedRef.current) return;
      setMessages(prev => [...prev, {
        id: nextId(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again in a moment. 🙏',
        timestamp: new Date(),
        fallback: true,
      }]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [loading]);

  const handleOpen = () => {
    setOpen(true);
    setHasEverOpened(true);
    if (isFirstOpen && !messages.length) {
      const welcomeId = nextId();
      setStreamingMessage({
        id: welcomeId,
        fullContent: getWelcomeMessage(),
        displayIndex: 0,
        type: 'welcome',
      });
      setIsFirstOpen(false);
      setShowSuggestions(true);
      setUnreadCount(0);
    }
    if (messages.length > 1) setUnreadCount(0);
  };

  const handleClose = () => {
    setOpen(false);
    if (messages.length > 1 || streamingMessage) setUnreadCount(1);
  };

  const handleSend = () => {
    sendMessage(input);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setShowSuggestions(false);
    sendMessage(suggestion.text);
  };

  const handleClearChat = () => {
    setMessages([]);
    setIsFirstOpen(true);
    setHasEverOpened(false);
    setShowSuggestions(true);
    setSuggestions([]);
    if (user) localStorage.removeItem(getStorageKey(user.id));
    loadSuggestions();
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Floating Action Button */}
      <Zoom in={!open} unmountOnExit>
        <Tooltip title="Ask Procura" placement="left">
          <Fab
            ref={fabRef}
            color="primary"
            aria-label="Open chat"
            onClick={handleOpen}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1200,
              width: 56,
              height: 56,
              background: (theme) => theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #8ab4f8 0%, #669df6 100%)'
                : 'linear-gradient(135deg, #1a73e8 0%, #1557b0 100%)',
              boxShadow: '0 4px 20px rgba(26,115,232,0.4)',
              '&:hover': {
                transform: 'scale(1.08)',
                boxShadow: '0 6px 28px rgba(26,115,232,0.5)',
              },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              ...(!hasEverOpened && !open ? {
                '@keyframes pulse': {
                  '0%, 100%': { boxShadow: '0 4px 20px rgba(26,115,232,0.4)' },
                  '50%': { boxShadow: '0 4px 30px rgba(26,115,232,0.7)' },
                },
                animation: 'pulse 2s ease-in-out infinite',
              } : {}),
            }}
          >
            <Badge
              badgeContent={unreadCount}
              color="error"
              overlap="circular"
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.65rem',
                  minWidth: 16,
                  height: 16,
                  fontWeight: 600,
                },
              }}
            >
              <SmartToy sx={{ fontSize: 28 }} />
            </Badge>
          </Fab>
        </Tooltip>
      </Zoom>

      {/* Chat Panel — Slide-up Drawer */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1200,
          pointerEvents: open ? 'auto' : 'none',
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.93)',
          transformOrigin: 'bottom right',
          transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Paper
          ref={panelRef}
          elevation={12}
          sx={{
            width: CHAT_WIDTH,
            height: CHAT_HEIGHT,
            maxWidth: 'calc(100vw - 48px)',
            maxHeight: 'calc(100vh - 100px)',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              px: 2,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
              background: (theme) => theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
                : 'linear-gradient(135deg, #f0f4ff 0%, #e8edf5 100%)',
            }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: 'primary.main',
                background: 'linear-gradient(135deg, #1a73e8 0%, #1557b0 100%)',
              }}
            >
              <SmartToy sx={{ fontSize: 20 }} />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                Procura
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                AI Procurement Assistant
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {messages.length > 1 && (
                <Tooltip title="Clear chat">
                  <IconButton size="small" onClick={handleClearChat} sx={{ color: 'text.secondary' }}>
                    <DeleteSweep fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Close">
                <IconButton size="small" onClick={handleClose} sx={{ color: 'text.secondary' }}>
                  <Close fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Messages */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              px: 2,
              py: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              bgcolor: 'background.default',
              '&::-webkit-scrollbar': { width: 6 },
              '&::-webkit-scrollbar-track': { background: 'transparent' },
              '&::-webkit-scrollbar-thumb': {
                background: (theme) => theme.palette.mode === 'dark'
                  ? 'rgba(255,255,255,0.1)'
                  : 'rgba(0,0,0,0.1)',
                borderRadius: 3,
              },
            }}
          >
            {/* Completed messages */}
            {messages.map((msg) => (
              <ChatMessage key={msg.id} msg={msg} formatTime={formatTime} />
            ))}

            {/* Currently streaming assistant message */}
            {streamingMessage && !messages.some(m => m.id === streamingMessage.id) && (
              <ChatMessage
                key={streamingMessage.id}
                msg={{
                  id: streamingMessage.id,
                  role: 'assistant',
                  type: streamingMessage.type,
                  content: streamingMessage.fullContent.slice(0, streamingMessage.displayIndex),
                  timestamp: new Date(),
                  isStreaming: streamingMessage.displayIndex < streamingMessage.fullContent.length,
                }}
                formatTime={formatTime}
              />
            )}

            {/* Typing Indicator */}
            {loading && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', animation: 'fadeInUp 0.3s ease' }}>
                <Avatar
                  sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: '0.8rem', mt: 0.5, flexShrink: 0 }}
                >
                  <SmartToy sx={{ fontSize: 16 }} />
                </Avatar>
                <Box
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderRadius: 2,
                    bgcolor: (theme) => theme.palette.mode === 'dark'
                      ? 'rgba(255,255,255,0.08)'
                      : 'grey.100',
                    borderBottomLeftRadius: 0.5,
                    display: 'flex',
                    gap: 0.5,
                    alignItems: 'center',
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <Box
                      key={i}
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: 'text.disabled',
                        animation: 'bounce 1.4s ease-in-out infinite',
                        animationDelay: `${i * 0.16}s`,
                        '@keyframes bounce': {
                          '0%, 80%, 100%': { transform: 'translateY(0)' },
                          '40%': { transform: 'translateY(-6px)' },
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Suggestions */}
            {showSuggestions && !loading && suggestions.length > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 0.8,
                  mt: 0.5,
                  animation: 'fadeInUp 0.4s ease',
                }}
              >
                {suggestions.map((s, i) => (
                  <Chip
                    key={i}
                    label={s.text}
                    size="small"
                    onClick={() => handleSuggestionClick(s)}
                    sx={{
                      borderRadius: 2,
                      fontWeight: 500,
                      fontSize: '0.75rem',
                      bgcolor: (theme) => theme.palette.mode === 'dark'
                        ? 'rgba(138,180,248,0.12)'
                        : 'rgba(26,115,232,0.08)',
                      color: 'primary.main',
                      border: '1px solid',
                      borderColor: 'primary.main',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 2px 8px rgba(26,115,232,0.3)',
                      },
                      '&:active': { transform: 'translateY(0)' },
                    }}
                  />
                ))}
              </Box>
            )}

            <div ref={messagesEndRef} />
          </Box>

          {/* Input */}
          <Box
            sx={{
              p: 1.5,
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <Box sx={{ position: 'relative', flex: 1 }}>
              <TextField
                inputRef={inputRef}
                fullWidth
                multiline
                maxRows={3}
                placeholder="Ask Procura anything..."
                value={input}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_MESSAGE_LENGTH) {
                    setInput(e.target.value);
                  }
                }}
                onKeyDown={handleKeyDown}
                disabled={loading}
                variant="outlined"
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    bgcolor: (theme) => theme.palette.mode === 'dark'
                      ? 'rgba(255,255,255,0.05)'
                      : 'grey.50',
                    '& fieldset': { borderColor: 'divider' },
                    '&:hover fieldset': { borderColor: 'primary.light' },
                    '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                  },
                  '& .MuiInputBase-input': { fontSize: '0.85rem', py: 1.2 },
                }}
              />
              <Tooltip title={loading ? 'Processing...' : 'Send'}>
                <span>
                  <IconButton
                    color="primary"
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: input.trim() ? 'primary.main' : 'action.disabledBackground',
                      color: input.trim() ? 'primary.contrastText' : 'text.disabled',
                      borderRadius: 2,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: input.trim() ? 'primary.dark' : 'action.disabledBackground',
                        transform: input.trim() ? 'scale(1.05)' : 'none',
                      },
                      '&.Mui-disabled': { bgcolor: 'action.disabledBackground' },
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={18} sx={{ color: 'primary.contrastText' }} />
                    ) : (
                      <Send sx={{ fontSize: 18 }} />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
            {/* Character count */}
              <Typography
                variant="caption"
                color={input.length > MAX_MESSAGE_LENGTH * 0.9 ? 'error.main' : 'text.disabled'}
                sx={{ position: 'absolute', right: 8, bottom: -16, fontSize: '0.6rem', pointerEvents: 'none' }}
              >
                {input.length}/{MAX_MESSAGE_LENGTH}
              </Typography>
            </Box>
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ display: 'block', mt: 0.5, textAlign: 'right', fontSize: '0.6rem' }}
            >
              Powered by Groq AI
            </Typography>
          </Box>
        </Paper>
      </Box>
    </>
  );
}


