import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import { prefixer } from 'stylis';
import App from './App';
import './index.css';

// Emotion cache with RTL stylis plugin — auto-flips border-left↔right, margin, padding etc.
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

const theme = createTheme({
  direction: 'rtl',
  typography: {
    fontFamily: '"Heebo", sans-serif',
  },
  palette: {
    primary: { main: '#4F46E5' },
    success: { main: '#10B981' },
    error: { main: '#EF4444' },
    background: { default: '#F4F6FB', paper: '#FFFFFF' },
    text: { primary: '#111827', secondary: '#6B7280' },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 700, borderRadius: 14 },
      },
    },
    MuiCard: {
      styleOverrides: { root: { borderRadius: 16 } },
    },
    MuiChip: {
      styleOverrides: { root: { fontFamily: '"Heebo", sans-serif' } },
    },
    MuiDialog: {
      defaultProps: { dir: 'rtl' },
      styleOverrides: { paper: { borderRadius: 24 } },
    },
    MuiTextField: {
      defaultProps: { dir: 'rtl' },
    },
  },
});

document.documentElement.setAttribute('lang', 'he');
document.documentElement.setAttribute('dir', 'rtl');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CacheProvider value={cacheRtl}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </CacheProvider>
  </StrictMode>,
);
