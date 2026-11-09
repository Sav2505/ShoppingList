import { useEffect, useState } from 'react';
import {
  Alert,
  AppBar,
  Badge,
  Box,
  Container,
  Button,
  CircularProgress,
  Fab,
  IconButton,
  Tooltip,
  Snackbar,
  Toolbar,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import axios from 'axios';
import type { Category } from '@/types/item';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import { motion, AnimatePresence } from 'framer-motion';
import { AddItemDialog } from './features/items/AddItemDialog';
import { ItemsList } from './features/items/ItemsList';
import { useItems } from './features/items/useItems';
import { useSocketStatus } from './hooks/useSocketStatus';
import { Login } from './features/auth/Login';
import { clearToken, getCurrentUser, getToken, invalidateAuthGeneration } from './services/auth';
import type { User } from './services/auth';
import { disconnectSocket } from './services/socket';
import { useItemsStore } from './store/itemsStore';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<'checking' | 'login' | 'ready' | 'offline'>(getToken() ? 'checking' : 'login');
  const [attempt, setAttempt] = useState(0);

  function logout() {
    clearToken();
    disconnectSocket();
    useItemsStore.setState({ items: [], loading: false, error: null });
    setUser(null);
    setStatus('login');
  }

  useEffect(() => {
    window.addEventListener('shopping:unauthorized', logout);
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'shopping_auth_token') {
        invalidateAuthGeneration();
        disconnectSocket();
        useItemsStore.setState({ items: [], loading: false, error: null });
        setUser(null);
        setStatus(getToken() ? 'checking' : 'login');
        setAttempt((value) => value + 1);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('shopping:unauthorized', logout);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    let active = true;
    setStatus('checking');
    getCurrentUser(token).then((currentUser) => {
      if (active && getToken() === token) {
        setUser(currentUser);
        setStatus('ready');
      }
    }).catch((error: unknown) => {
      if (!active || getToken() !== token) return;
      if (axios.isAxiosError(error) && error.response?.status === 401) logout();
      else setStatus('offline');
    });
    return () => { active = false; };
  }, [attempt]);

  if (status === 'login') return <Login onLogin={(currentUser) => { setUser(currentUser); setStatus('ready'); }} />;
  if (status === 'checking') return <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>;
  if (status === 'offline') return (
    <Container maxWidth="xs" sx={{ pt: 10, textAlign: 'center' }}>
      <Alert severity="error">לא ניתן להתחבר לשרת כרגע.</Alert>
      <Button onClick={() => setAttempt((value) => value + 1)} sx={{ mt: 2 }}>ניסיון חוזר</Button>
      <Button onClick={logout} sx={{ mt: 2 }}>החלפת חשבון</Button>
    </Container>
  );
  return user ? <ShoppingList user={user} onLogout={logout} /> : null;
}

function ShoppingList({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [activeCategory, setActiveCategory] = useState<'all' | Category>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const {
    items, loading, error, snackbar,
    addNewItem, increaseItemQuantity, markBought, undoBought, deleteItem, closeSnackbar,
  } = useItems();
  const connected = useSocketStatus();
  const activeCount = items.filter((i) => !i.completed).length;

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>

      {/* ── AppBar ── */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 55%, #0F3460 100%)' }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', py: 0.75 }}>
          {/* RTL right-side: cart + count badge */}
          <Badge
            badgeContent={activeCount || 0}
            max={99}
            sx={{
              '& .MuiBadge-badge': {
                background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
                color: '#fff',
                fontWeight: 800,
                fontSize: '0.6rem',
                minWidth: 17,
                height: 17,
              },
            }}
          >
            <ShoppingCartOutlinedIcon sx={{ color: 'rgba(255,255,255,0.85)', fontSize: 25 }} />
          </Badge>

          {/* Center title */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff', letterSpacing: '-0.3px', lineHeight: 1.2 }}
            >
              רשימת הקניות של {user.username}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>
              רשימת קניות משותפת
            </Typography>
          </Box>

          {/* RTL left-side: live dot */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 9, height: 9, borderRadius: '50%',
              background: connected ? '#10B981' : '#EF4444',
              boxShadow: connected ? '0 0 0 3px rgba(16,185,129,0.28)' : '0 0 0 3px rgba(239,68,68,0.28)',
              transition: 'all 0.4s',
            }}
          />
          <Tooltip title="התנתקות והחלפת חשבון">
            <IconButton aria-label="התנתקות והחלפת חשבון" onClick={onLogout} sx={{ color: 'white' }}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* ── Content ── */}
      <Container maxWidth="sm" sx={{ pt: 3, pb: 16, px: { xs: 2, sm: 3 } }}>
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }}>{error}</Alert>
            </motion.div>
          )}
        </AnimatePresence>
        <ItemsList
          items={items}
          loading={loading}
          onMarkBought={markBought}
          onDelete={deleteItem}
          filter={activeCategory}
          onFilterChange={setActiveCategory}
        />
      </Container>

      {/* ── Extended FAB ── */}
      <Fab
        variant="extended"
        aria-label="הוסף פריט"
        onClick={() => setDialogOpen(true)}
        component={motion.button}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.94 }}
        sx={{
          position: 'fixed',
          bottom: 28,
          right: 20,
          height: 52,
          px: 3,
          gap: 0.75,
          background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
          boxShadow: '0 8px 28px rgba(79,70,229,0.44)',
          fontWeight: 700,
          fontSize: '0.95rem',
          color: '#fff',
          border: 'none',
          borderRadius: 99,
          '&:hover': { background: 'linear-gradient(135deg, #4338CA 0%, #6D28D9 100%)' },
        }}
      >
        <AddIcon sx={{ fontSize: 20 }} />
        הוסף פריט
      </Fab>

      {/* ── Add Dialog ── */}
      <AddItemDialog
        open={dialogOpen}
        username={user.username}
        onClose={() => setDialogOpen(false)}
        onSubmit={addNewItem}
        onIncreaseExisting={increaseItemQuantity}
        items={items}
        defaultCategory={activeCategory === 'all' ? 'supermarket' : activeCategory}
      />
      {/* ── Undo Snackbar ── */}
      <Snackbar
        open={snackbar.open}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: { xs: 100, sm: 100 } }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={closeSnackbar}
          action={
            <Typography
              variant="button"
              onClick={() => undoBought(snackbar.itemId)}
              sx={{
                cursor: 'pointer', fontWeight: 700, px: 1.5, py: 0.4,
                borderRadius: 2, background: 'rgba(255,255,255,0.2)', fontSize: '0.82rem',
                '&:hover': { background: 'rgba(255,255,255,0.32)' },
              }}
            >
              בטל
            </Typography>
          }
          sx={{ borderRadius: 3, minWidth: 260, fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
        >
          &ldquo;{snackbar.itemName}&rdquo; סומן כנקנה ✓
        </Alert>
      </Snackbar>
    </Box>
  );
}
