import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Box, Typography, Card, CardContent, Chip, IconButton, Tooltip, Badge, Avatar, useTheme
} from '@mui/material';
import { Visibility, CalendarToday } from '@mui/icons-material';
import api from '../api';
import { URGENCY_COLORS } from '../constants';
import { useToast } from '../context/ToastContext';
import { getAvatarUrl } from '../utils/avatar';

const COLUMN_ORDER = ['pending', 'quoted', 'ordered', 'delivered', 'rejected'];

function getColumnColors(theme, status) {
  const colorMap = {
    pending: { color: theme.palette.warning.main, bg: theme.palette.warning.main },
    quoted: { color: theme.palette.info.main, bg: theme.palette.info.main },
    ordered: { color: theme.palette.primary.main, bg: theme.palette.primary.main },
    delivered: { color: theme.palette.success.main, bg: theme.palette.success.main },
    rejected: { color: theme.palette.error.main, bg: theme.palette.error.main },
  };
  return colorMap[status] || { color: theme.palette.text.secondary, bg: theme.palette.text.secondary };
}

const MemoizedPRCard = memo(function PRCard({ pr, index, readOnly, theme }) {
  const navigate = useNavigate();
  const daysAgo = Math.floor((Date.now() - new Date(pr.createdAt).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Draggable draggableId={pr.id} index={index} isDragDisabled={readOnly}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          sx={{
            mb: 1.5,
            cursor: readOnly ? 'pointer' : 'grab',
            transition: 'box-shadow 0.2s ease, transform 0.2s ease',
            boxShadow: snapshot.isDragging
              ? '0 8px 24px rgba(0,0,0,0.25)'
              : '0 1px 3px rgba(0,0,0,0.08)',
            transform: snapshot.isDragging ? 'rotate(2deg)' : 'none',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            },
          }}
          onClick={() => navigate(`/pr/${pr.id}`)}
        >
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Typography variant="body2" fontWeight={600} sx={{ flex: 1, lineHeight: 1.3 }}>
                {pr.itemName}
              </Typography>
              <Tooltip title="View Details">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/pr/${pr.id}`);
                  }}
                  aria-label="View details"
                >
                  <Visibility fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
              <Avatar
                src={getAvatarUrl(pr.user?.name, 18)}
                alt={pr.user?.name || 'Requester'}
                sx={{ width: 18, height: 18, fontSize: '0.6rem' }}
              />
              <Typography variant="caption" color="text.secondary">
                {pr.user?.name || 'Unknown'}
              </Typography>
              <Typography variant="caption" color="text.secondary">·</Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                ${pr.budget.toLocaleString()}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Chip
                  label={pr.urgency}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 500,
                    textTransform: 'capitalize',
                    bgcolor: URGENCY_COLORS[pr.urgency]?.bg || 'action.hover',
                    color: URGENCY_COLORS[pr.urgency]?.text || 'text.primary',
                  }}
                />
                {pr.quotes?.length > 0 && (
                  <Chip
                    label={`${pr.quotes.length} quote${pr.quotes.length > 1 ? 's' : ''}`}
                    size="small"
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.65rem' }}
                  />
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                <CalendarToday sx={{ fontSize: 12, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {daysAgo === 0 ? 'Today' : daysAgo === 1 ? '1d' : `${daysAgo}d`}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
});

export default function KanbanBoard({ prs, onStatusChange, readOnly = false }) {
  const theme = useTheme();
  const { showToast } = useToast();
  const prevPrsRef = useRef(prs);
  const [columns, setColumns] = useState(() => {
    const cols = {};
    COLUMN_ORDER.forEach((status) => {
      cols[status] = prs.filter((pr) => pr.status === status);
    });
    return cols;
  });

  useEffect(() => {
    if (prevPrsRef.current !== prs) {
      const cols = {};
      COLUMN_ORDER.forEach((status) => {
        cols[status] = prs.filter((pr) => pr.status === status);
      });
      setColumns(cols);
      prevPrsRef.current = prs;
    }
  }, [prs]);

  const handleDragEnd = useCallback(async (result) => {
    if (readOnly) return;
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newStatus = destination.droppableId;

    // Optimistic update
    setColumns((prev) => {
      const cols = { ...prev };
      const sourceCol = [...cols[source.droppableId]];
      const destCol = source.droppableId === destination.droppableId
        ? sourceCol
        : [...cols[destination.droppableId]];

      const [moved] = sourceCol.splice(source.index, 1);
      destCol.splice(destination.index, 0, moved);

      cols[source.droppableId] = sourceCol;
      if (source.droppableId !== destination.droppableId) {
        cols[destination.droppableId] = destCol;
      }
      return cols;
    });

    // Try the status update
    try {
      await api.patch(`/purchase-requests/${draggableId}/status`, { status: newStatus });
      showToast(`Status updated to "${newStatus}"`, 'success', {
        label: 'Undo',
        onClick: async () => {
          try {
            await api.patch(`/purchase-requests/${draggableId}/status`, { status: source.droppableId });
            showToast('Status reverted', 'info');
            if (onStatusChange) onStatusChange();
          } catch {
            showToast('Failed to undo', 'error');
          }
        },
      });
      if (onStatusChange) onStatusChange();
    } catch (err) {
      // Revert optimistic update on failure
      setColumns(() => {
        const cols = {};
        COLUMN_ORDER.forEach((status) => {
          cols[status] = prs.filter((pr) => pr.status === status);
        });
        return cols;
      });
      showToast(err.response?.data?.error || 'Failed to update status', 'error');
    }
  }, [readOnly, prs, onStatusChange]);

  const colColors = useMemo(() => {
    const colors = {};
    COLUMN_ORDER.forEach((status) => {
      colors[status] = getColumnColors(theme, status);
    });
    return colors;
  }, [theme]);

  return (
    <Box>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2, minHeight: 400 }}>
          {COLUMN_ORDER.map((status) => {
            const col = colColors[status];
            const items = columns[status] || [];
            const labelMap = { pending: 'Pending', quoted: 'Quoted', ordered: 'Ordered', delivered: 'Delivered', rejected: 'Cancelled' };
            return (
              <Box
                key={status}
                sx={{
                  minWidth: 280,
                  maxWidth: 320,
                  flex: '1 1 280px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Column Header */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 1.5,
                    px: 0.5,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: col.color }} />
                    <Typography variant="subtitle2" fontWeight={600}>
                      {labelMap[status]}
                    </Typography>
                  </Box>
                  <Badge
                    badgeContent={items.length}
                    sx={{
                      '& .MuiBadge-badge': {
                        bgcolor: col.bg,
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        opacity: 0.9,
                      },
                    }}
                  />
                </Box>

                {/* Droppable Area */}
                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      sx={{
                        flex: 1,
                        minHeight: 100,
                        borderRadius: 2,
                        p: 1,
                        bgcolor: snapshot.isDraggingOver ? `rgba(${status === 'pending' ? '255,152,0' : status === 'quoted' ? '33,150,243' : status === 'ordered' ? '26,115,232' : '76,175,80'},0.06)` : 'transparent',
                        border: snapshot.isDraggingOver
                          ? `2px dashed ${col.color}`
                          : '2px solid transparent',
                        transition: 'background-color 0.2s ease, border-color 0.2s ease',
                      }}
                    >
                      {items.map((pr, index) => (
                        <MemoizedPRCard key={pr.id} pr={pr} index={index} readOnly={readOnly} theme={theme} />
                      ))}
                      {provided.placeholder}
                      {items.length === 0 && !snapshot.isDraggingOver && (
                        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                          <Typography variant="caption">No requests</Typography>
                        </Box>
                      )}
                    </Box>
                  )}
                </Droppable>
              </Box>
            );
          })}
        </Box>
      </DragDropContext>
    </Box>
  );
}
