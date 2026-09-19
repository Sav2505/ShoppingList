import { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogContent,
    MenuItem,
    Select,
    TextField,
    Typography,
    type SelectChangeEvent,
} from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import type { Category, NewItemPayload } from '@/types/item';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/types/item';

interface AddItemDialogProps {
    open: boolean;
    defaultCategory: Category;
    onClose: () => void;
    onSubmit: (payload: NewItemPayload) => Promise<void>;
}

const CATEGORIES = Object.entries(CATEGORY_LABELS) as [Category, string][];

export function AddItemDialog({ open, defaultCategory, onClose, onSubmit }: AddItemDialogProps) {
    const [name, setName] = useState('');
    const [category, setCategory] = useState<Category>(defaultCategory);
    const [quantity, setQuantity] = useState<number>(1);
    const [submitting, setSubmitting] = useState(false);
    const [nameError, setNameError] = useState('');

    useEffect(() => {
        if (open) {
            setCategory(defaultCategory);
        }
    }, [open, defaultCategory]);

    const handleSubmit = async () => {
        const trimmed = name.trim();
        if (!trimmed) {
            setNameError('נא להזין שם פריט');
            return;
        }
        setSubmitting(true);
        try {
            await onSubmit({ name: trimmed, category, quantity });
            handleClose();
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setName('');
        setQuantity(1);
        setNameError('');
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="xs"
            dir="rtl"
            PaperProps={{
                sx: {
                    borderRadius: { xs: '16px 16px 0 0', sm: 2 },
                    position: { xs: 'fixed', sm: 'relative' },
                    bottom: { xs: 0, sm: 'auto' },
                    m: { xs: 0, sm: 'auto' },
                    width: { xs: '100%', sm: 400 },
                    maxWidth: '100%',
                    direction: 'ltr',
                },
            }}
        >
            {/* Pull-handle (mobile) */}
            <Box sx={{ display: { xs: 'flex', sm: 'none' }, justifyContent: 'center', pt: 1.5 }}>
                <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.12)' }} />
            </Box>

            {/* Title */}
            <Box sx={{ px: 3, pt: { xs: 1.5, sm: 3 }, pb: 0 }}>
                <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.1rem' }}>
                    הוסף פריט לרשימה
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3, fontSize: '0.82rem' }}>
                    מה צריך לקנות נונו ?
                </Typography>
            </Box>

            <DialogContent sx={{ pt: '20px !important', pb: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>

                {/* ── שם הפריט ── */}
                <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.75, fontSize: '0.78rem', letterSpacing: 0.2 }}>
                        שם הפריט
                    </Typography>
                    <TextField
                        autoFocus
                        value={name}
                        placeholder="שם הפריט..."
                        dir="rtl"
                        onChange={(e) => { setName(e.target.value); if (nameError) setNameError(''); }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        error={!!nameError}
                        helperText={nameError}
                        fullWidth
                        inputProps={{ maxLength: 80, dir: 'rtl', style: { textAlign: 'right' } }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 3,
                                fontSize: '1rem',
                                '& input': { textAlign: 'right', padding: '12px 14px' },
                                '& fieldset': { borderColor: nameError ? 'error.main' : 'rgba(0,0,0,0.14)' },
                                '&:hover fieldset': { borderColor: 'rgba(0,0,0,0.3)' },
                                '&.Mui-focused fieldset': { borderColor: '#4F46E5' },
                            },
                        }}
                    />
                </Box>

                {/* ── קטגוריה ── */}
                <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.75, fontSize: '0.78rem', letterSpacing: 0.2 }}>
                        קטגוריה
                    </Typography>
                    <Select
                        value={category}
                        onChange={(e: SelectChangeEvent) => setCategory(e.target.value as Category)}
                        fullWidth
                        displayEmpty
                        renderValue={(val) => (
                            <span style={{ display: 'block', textAlign: 'right', direction: 'rtl', width: '100%' }}>
                                {CATEGORY_LABELS[val as Category]}
                            </span>
                        )}
                        inputProps={{ dir: 'rtl' }}
                        sx={{
                            borderRadius: 3,
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.14)' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.3)' },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#4F46E5' },
                            '& .MuiSelect-select': { padding: '12px 14px 12px 32px' },
                            '& .MuiSelect-icon': { left: 7, right: 'auto' },
                        }}
                    >
                        {CATEGORIES.map(([val, label]) => (
                            <MenuItem key={val} value={val} sx={{ justifyContent: 'flex-end', gap: 1.5, direction: 'rtl' }}>
                                {label}
                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: CATEGORY_COLORS[val], flexShrink: 0 }} />
                            </MenuItem>
                        ))}
                    </Select>
                </Box>

                {/* ── כמות ── */}
                <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.75, fontSize: '0.78rem', letterSpacing: 0.2 }}>
                        כמות
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0, borderRadius: 3, border: '1px solid rgba(0,0,0,0.14)', overflow: 'hidden', '&:hover': { borderColor: 'rgba(0,0,0,0.3)' } }}>
                        <Box
                            component="button"
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            sx={{ width: 46, height: 46, border: 'none', bgcolor: 'transparent', fontSize: '1.3rem', cursor: 'pointer', color: 'text.secondary', '&:hover': { bgcolor: 'rgba(0,0,0,0.04)', color: 'text.primary' }, flexShrink: 0, transition: 'all 0.15s' }}
                        >
                            −
                        </Box>
                        <Typography sx={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: '1.05rem', userSelect: 'none' }}>
                            {quantity}
                        </Typography>
                        <Box
                            component="button"
                            onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                            sx={{ width: 46, height: 46, border: 'none', bgcolor: 'transparent', fontSize: '1.3rem', cursor: 'pointer', color: 'text.secondary', '&:hover': { bgcolor: 'rgba(0,0,0,0.04)', color: 'text.primary' }, flexShrink: 0, transition: 'all 0.15s' }}
                        >
                            +
                        </Box>
                    </Box>
                </Box>
            </DialogContent>

            {/* ── כפתורים ── */}
            <Box sx={{ display: 'flex', gap: 1.5, px: 3, pb: 3, pt: 1.5 }}>
                <Button
                    onClick={handleClose}
                    disabled={submitting}
                    sx={{ flex: 1, py: 1.35, borderRadius: 3, color: 'text.secondary', fontWeight: 600 }}
                >
                    ביטול
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={submitting}
                    endIcon={<AddShoppingCartIcon sx={{ fontSize: 20 }} />}
                    sx={{
                        flex: 2,
                        py: 1.35,
                        borderRadius: 3,
                        fontWeight: 700,
                        fontSize: '1rem',
                        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                        boxShadow: '0 4px 16px rgba(79,70,229,0.3)',
                        '&:hover': { background: 'linear-gradient(135deg, #4338CA 0%, #6D28D9 100%)' },
                        '&:disabled': { opacity: 0.6 },
                    }}
                >
                    הוסף
                </Button>
            </Box>
        </Dialog>
    );
}

