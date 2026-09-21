import { useMemo } from 'react';
import { Box, Chip, Skeleton, Stack, Typography } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { AnimatePresence } from 'framer-motion';
import { ItemCard } from './ItemCard';
import type { Category, ShoppingItem } from '@/types/item';
import { CATEGORY_COLORS, CATEGORY_LABELS, CATEGORY_ORDER } from '@/types/item';

interface ItemsListProps {
  items: ShoppingItem[];
  loading: boolean;
  onMarkBought: (id: number) => void;
  onDelete: (id: number) => void;
  filter: 'all' | Category;
  onFilterChange: (category: 'all' | Category) => void;
}

const ALL_CATEGORIES: ('all' | Category)[] = ['all', 'supermarket', 'pharmacy', 'home', 'other'];

const FILTER_LABELS: Record<'all' | Category, string> = { all: 'הכל', ...CATEGORY_LABELS };

export function ItemsList({
  items,
  loading,
  onMarkBought,
  onDelete,
  filter,
  onFilterChange,
}: ItemsListProps) {
  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((i) => i.category === filter)),
    [items, filter],
  );

  const activeItems = filtered
    .filter((i) => !i.completed)
    .sort((a, b) => CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category]);
  const completedItems = filtered
    .filter((i) => i.completed)
    .sort((a, b) => CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category]);
  const totalActive = items.filter((i) => !i.completed).length;

  if (loading) {
    return (
      <Stack spacing={1.5} sx={{ mt: 1 }}>
        {[...Array(4)].map((_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={76}
            sx={{ borderRadius: 4, opacity: 1 - i * 0.18, transform: `scaleX(${1 - i * 0.015})` }}
          />
        ))}
      </Stack>
    );
  }

  return (
    <Box>
      {/* ── Category filter ── */}
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          mb: 3,
          overflowX: 'auto',
          pb: 0.5,
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }}
      >
        {ALL_CATEGORIES.map((cat) => {
          const active = filter === cat;
          const color = cat === 'all' ? '#4F46E5' : CATEGORY_COLORS[cat];
          return (
            <Chip
              key={cat}
              label={FILTER_LABELS[cat]}
              clickable
              onClick={() => onFilterChange(cat)}
              sx={{
                flexShrink: 0,
                fontWeight: active ? 700 : 500,
                fontSize: '0.82rem',
                height: 34,
                borderRadius: 99,
                background: active ? color : 'rgba(255,255,255,0.8)',
                color: active ? '#fff' : 'text.secondary',
                border: `1.5px solid ${active ? color : 'rgba(0,0,0,0.1)'}`,
                boxShadow: active ? `0 4px 14px ${color}44` : 'none',
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: active ? color : `${color}12`,
                  color: active ? '#fff' : color,
                  borderColor: color,
                },
              }}
            />
          );
        })}
      </Box>

      {/* ── Active count badge ── */}
      {totalActive > 0 && (
        <Box sx={{ mb: 2 }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.6,
              bgcolor: 'rgba(79,70,229,0.07)',
              color: 'primary.main',
              px: 1.5,
              py: 0.5,
              borderRadius: 99,
            }}
          >
            <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.8rem' }}>
              {totalActive} פריטים ברשימה
            </Typography>
          </Box>
        </Box>
      )}

      {/* ── Empty state ── */}
      {filtered.length === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10, gap: 2 }}>
          <Box
            sx={{
              width: 88,
              height: 88,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShoppingCartIcon sx={{ fontSize: 42, color: '#4F46E5', opacity: 0.65 }} />
          </Box>
          <Typography variant="h6" fontWeight={700} sx={{ opacity: 0.65 }}>
            {items.length === 0 ? 'הרשימה ריקה' : 'אין פריטים בקטגוריה'}
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ maxWidth: 220, lineHeight: 1.5 }}>
            {items.length === 0 ? 'לחצו על "הוסף פריט" כדי להתחיל' : 'בחר קטגוריה אחרת'}
          </Typography>
        </Box>
      )}

      {/* ── Active items ── */}
      <AnimatePresence mode="popLayout">
        {activeItems.map((item) => (
          <ItemCard key={item.id} item={item} onMarkBought={onMarkBought} onDelete={onDelete} />
        ))}
      </AnimatePresence>

      {/* ── Completed section ── */}
      {completedItems.length > 0 && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 2.5, opacity: 0.5 }}>
            <CheckCircleIcon sx={{ fontSize: 15, color: 'success.main' }} />
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              נקנו ({completedItems.length})
            </Typography>
            <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
          </Box>
          <AnimatePresence mode="popLayout">
            {completedItems.map((item) => (
              <ItemCard key={item.id} item={item} onMarkBought={onMarkBought} onDelete={onDelete} />
            ))}
          </AnimatePresence>
        </>
      )}
    </Box>
  );
}
