// Overdraft limit management component
import { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, TextField, Button, CircularProgress, Alert } from '@mui/material';
import { AlertCircle, Save } from 'lucide-react';
import { budgetApi } from '../services/api';

interface Overdraft {
  id: number;
  amount: number;
  recorded_at: string;
  created_at: string;
}

export const OverdraftCard = () => {
  const [overdraft, setOverdraft] = useState<Overdraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [amount, setAmount] = useState('');

  useEffect(() => {
    fetchLatestOverdraft();
  }, []);

  const fetchLatestOverdraft = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await budgetApi.getLatestOverdraft();
      
      if (data) {
        setOverdraft(data);
        setAmount(data.amount.toString());
      }
    } catch (err) {
      setError('Failed to load overdraft data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const overdraftAmount = parseFloat(amount);
    
    if (isNaN(overdraftAmount) || overdraftAmount < 0) {
      setError('Please enter a valid overdraft amount');
      
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      
      const newOverdraft = await budgetApi.addOverdraft({
        amount: overdraftAmount,
      });
      
      setOverdraft(newOverdraft);
      setSuccess(true);
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to save overdraft');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card sx={cardSx}>
        <CardContent>
          <Box sx={loadingBoxSx}>
            <CircularProgress sx={loadingSpinnerSx} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={cardSx}>
      <CardContent sx={cardContentSx}>
        <Box sx={headerSx}>
          <AlertCircle size={20} color="#f59e0b" />

          <Typography variant="h6" sx={titleSx}>
            Overdraft Limit
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={alertErrorSx}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={alertSuccessSx}>
            Overdraft updated successfully!
          </Alert>
        )}

        {overdraft && (
          <Box sx={currentOverdraftSx}>
            <Typography variant="body2" sx={labelSx}>
              Current Overdraft Limit
            </Typography>

            <Typography variant="h4" sx={amountSx}>
              £{overdraft.amount.toFixed(2)}
            </Typography>

            <Typography variant="caption" sx={lastUpdatedSx}>
              Last updated: {new Date(overdraft.recorded_at).toLocaleDateString()}
            </Typography>
          </Box>
        )}

        <Box sx={formSx}>
          <TextField
            label="Overdraft Limit"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            fullWidth
            sx={textFieldSx}
            InputLabelProps={{ sx: inputLabelSx }}
            inputProps={{ step: '0.01', min: '0' }}
          />

          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <Save size={16} />}
            sx={buttonSx}
          >
            {saving ? 'Saving...' : 'Update Overdraft'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

const cardSx = {
  backgroundColor: '#1a1f37',
  color: '#fff',
  height: '100%',
  borderRadius: 2,
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
};

const headerSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  mb: 3,
};

const titleSx = {
  fontWeight: 600,
};

const cardContentSx = {
  p: 3,
};

const currentOverdraftSx = {
  backgroundColor: 'rgba(245, 158, 11, 0.1)',
  borderRadius: 2,
  p: 2.5,
  mb: 3,
  textAlign: 'center',
};

const labelSx = {
  color: '#94a3b8',
  mb: 1,
};

const amountSx = {
  color: '#f59e0b',
  fontWeight: 700,
  mb: 0.5,
};

const formSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

const inputLabelSx = {
  color: '#94a3b8',
};

const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    color: '#fff',
    backgroundColor: '#0d0f1b',
    '& fieldset': {
      borderColor: '#2d3348',
    },
    '&:hover fieldset': {
      borderColor: '#6366f1',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#6366f1',
    },
  },
};

const buttonSx = {
  backgroundColor: '#6366f1',
  color: '#fff',
  textTransform: 'none',
  fontWeight: 600,
  py: 1,
  '&:hover': {
    backgroundColor: '#4f46e5',
  },
  '&:disabled': {
    backgroundColor: '#334155',
    color: '#94a3b8',
  },
};

const loadingBoxSx = {
  display: 'flex',
  justifyContent: 'center',
  py: 4,
};

const loadingSpinnerSx = {
  color: '#6366f1',
};

const alertErrorSx = {
  mb: 2,
};

const alertSuccessSx = {
  mb: 2,
};

const lastUpdatedSx = {
  color: '#94a3b8',
  mt: 1,
};

