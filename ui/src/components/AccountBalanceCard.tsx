// Account Balance management component
import { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, TextField, Button, CircularProgress, Alert } from '@mui/material';
import { Wallet, Calendar, Save } from 'lucide-react';
import { budgetApi } from '../services/api';
import type { Balance as ApiBalance } from '../services/api';

interface AccountBalanceCardProps {
  onBalanceUpdated?: (balance: ApiBalance) => void;
}

export const AccountBalanceCard = ({ onBalanceUpdated }: AccountBalanceCardProps) => {
  const [balance, setBalance] = useState<ApiBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: 'Current Account',
    amount: '',
    recorded_at: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchLatestBalance();
  }, []);

  const fetchLatestBalance = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await budgetApi.getLatestBalance();
      
      if (data) {
        setBalance(data);
        setFormData({
          name: data.name,
          amount: data.amount.toString(),
          recorded_at: new Date().toISOString().split('T')[0],
        });
      }
    } catch (err) {
      setError('Failed to load balance data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const amount = parseFloat(formData.amount);
    
    if (isNaN(amount)) {
      setError('Please enter a valid amount');
      
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      
      const newBalance = await budgetApi.addBalance({
        name: formData.name,
        amount,
        recorded_at: formData.recorded_at,
      });
      
      setBalance(newBalance);
      setSuccess(true);
      onBalanceUpdated?.(newBalance);
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to save balance');
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
          <Wallet size={20} color="#10b981" />

          <Typography variant="h6" sx={titleSx}>
            Account Balance
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={alertErrorSx}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={alertSuccessSx}>
            Balance updated successfully!
          </Alert>
        )}

        {balance && (
          <Box sx={currentBalanceSx}>
            <Typography variant="body2" sx={labelSx}>
              Current Balance
            </Typography>

            <Typography variant="h4" sx={amountSx}>
              £{balance.amount.toFixed(2)}
            </Typography>

            <Box sx={dateSx}>
              <Calendar size={14} color="#94a3b8" />

              <Typography variant="caption" sx={recordedTextSx}>
                Recorded: {new Date(balance.recorded_at).toLocaleDateString()}
              </Typography>
            </Box>
          </Box>
        )}

        <Box sx={formSx}>
          <TextField
            label="Account Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            fullWidth
            sx={textFieldSx}
            InputLabelProps={{ sx: inputLabelSx }}
          />

          <TextField
            label="Balance Amount"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            fullWidth
            sx={textFieldSx}
            InputLabelProps={{ sx: inputLabelSx }}
            inputProps={{ step: '0.01' }}
          />

          <TextField
            label="Date"
            type="date"
            value={formData.recorded_at}
            onChange={(e) => setFormData({ ...formData, recorded_at: e.target.value })}
            fullWidth
            sx={textFieldSx}
            InputLabelProps={{
              shrink: true,
              sx: inputLabelSx,
            }}
          />

          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <Save size={16} />}
            sx={buttonSx}
          >
            {saving ? 'Saving...' : 'Update Balance'}
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

const currentBalanceSx = {
  backgroundColor: 'rgba(0, 0, 0, 0.1)',
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
  color: '#10b981',
  fontWeight: 700,
  mb: 1,
};

const dateSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  justifyContent: 'center',
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
  '& .MuiSvgIcon-root': {
    color: '#fff',
  },
  '& input[type="date"]::-webkit-calendar-picker-indicator': {
    filter: 'invert(1)',
    opacity: 0.8,
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

const recordedTextSx = {
  color: '#94a3b8',
};

