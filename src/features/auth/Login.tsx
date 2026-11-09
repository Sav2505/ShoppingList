import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Box, Button, CircularProgress, Container, Paper, TextField, Typography } from '@mui/material';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import axios from 'axios';
import { login } from '@/services/auth';
import type { User } from '@/services/auth';

export function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      onLogin(await login(username, password));
    } catch (err) {
      setError(axios.isAxiosError(err) && err.response?.status === 401
        ? 'שם המשתמש או הסיסמה שגויים'
        : 'לא ניתן להתחבר כרגע. נסו שוב.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="xs">
        <Paper elevation={0} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <ShoppingCartOutlinedIcon color="primary" sx={{ fontSize: 36, mb: 1 }} />
          <Typography variant="h5" fontWeight={800} component="h1">רשימת הקניות שלי</Typography>
          <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>התחברות לחשבון</Typography>
          <Box component="form" onSubmit={submit} sx={{ display: 'grid', gap: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label="שם משתמש" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required fullWidth />
            <TextField label="סיסמה" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required fullWidth />
            <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ mt: 1, minHeight: 48 }}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'התחברות'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}