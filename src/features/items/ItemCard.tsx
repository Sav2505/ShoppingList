import { memo, useState } from 'react';
import { Box, Card, Chip, IconButton, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { motion } from 'framer-motion';
import type { ShoppingItem } from '@/types/item';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/types/item';

interface ItemCardProps {
  item: ShoppingItem;
  onMarkBought: (id: number) => void;
  onDelete: (id: number) => void;
}

export const ItemCard = memo(function ItemCard({ item, onMarkBought, onDelete }: ItemCardProps) {
  const [pressing, setPressing] = useState(false);
  const color = CATEGORY_COLORS[item.category];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10, scale: 0.97 }}
      animate={{ opacity: item.completed ? 0.55 : 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
    >
      <Card
        elevation={0}
        sx={{
          mb: 1.5,
          borderRadius: 4,
          bgcolor: item.completed ? '#FAFAFA' : '#FFFFFF',
          border: '1px solid',
          borderColor: item.completed ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.07)',
          // stylis-plugin-rtl auto-flips borderLeft → borderRight in RTL
          // so the accent appears on the visual-right (leading edge in Hebrew)
          borderLeft: `4px solid ${item.completed ? 'rgba(0,0,0,0.08)' : color}`,
          boxShadow: item.completed ? 'none' : `0 2px 14px rgba(0,0,0,0.055)`,
          transform: pressing ? 'scale(0.982)' : 'scale(1)',
          transition: 'transform 0.12s ease, box-shadow 0.22s ease',
          cursor: 'default',
        }}
        onPointerDown={() => setPressing(true)}
        onPointerUp={() => setPressing(false)}
        onPointerLeave={() => setPressing(false)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.4 }}>

          {/* Check — leading side (right in RTL) */}
          <IconButton
            size="small"
            onClick={() => !item.completed && onMarkBought(item.id)}
            sx={{
              p: 0.4,
              color: item.completed ? 'success.main' : 'rgba(0,0,0,0.18)',
              transition: 'all 0.2s',
              '&:hover': { color: 'success.main', bgcolor: 'rgba(16,185,129,0.08)', transform: 'scale(1.12)' },
            }}
          >
            {item.completed
              ? <CheckCircleIcon sx={{ fontSize: 27 }} />
              : <CheckCircleOutlineIcon sx={{ fontSize: 27 }} />
            }
          </IconButton>

          {/* Text + chip */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontWeight: 600,
                  fontSize: '1rem',
                  lineHeight: 1.3,
                  textDecoration: item.completed ? 'line-through' : 'none',
                  color: item.completed ? 'text.disabled' : 'text.primary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {item.name}
              </Typography>
              {item.quantity !== undefined && item.quantity > 1 && (
                <Box
                  sx={{
                    flexShrink: 0,
                    bgcolor: 'rgba(79,70,229,0.1)',
                    color: '#4F46E5',
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    borderRadius: 99,
                    px: 1,
                    py: 0.2,
                    lineHeight: 1.6,
                    border: '1px solid rgba(79,70,229,0.2)',
                  }}
                >
                  x{item.quantity}
                </Box>
              )}
            </Box>
            <Chip
              label={CATEGORY_LABELS[item.category]}
              size="small"
              sx={{
                mt: 0.5,
                height: 19,
                fontSize: '0.68rem',
                fontWeight: 700,
                borderRadius: 99,
                background: `${color}18`,
                color: color,
                border: `1px solid ${color}28`,
                '& .MuiChip-label': { px: 1 },
              }}
            />
          </Box>

          {/* Delete — trailing side (left in RTL) */}
          <IconButton
            size="small"
            onClick={() => onDelete(item.id)}
            sx={{
              p: 0.4,
              color: 'rgba(0,0,0,0.14)',
              transition: 'all 0.2s',
              '&:hover': { color: '#EF4444', bgcolor: 'rgba(239,68,68,0.07)', transform: 'scale(1.12)' },
            }}
          >
            <DeleteOutlineIcon sx={{ fontSize: 19 }} />
          </IconButton>
        </Box>
      </Card>
    </motion.div>
  );
});

