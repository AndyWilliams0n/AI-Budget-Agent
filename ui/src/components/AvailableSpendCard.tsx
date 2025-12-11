// Available spend calculation component
import { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, CircularProgress, Divider } from '@mui/material';
import { CreditCard, TrendingUp } from 'lucide-react';
import { budgetApi } from '../services/api';

interface AvailableSpendCardProps {
  currentBalance?: number;
  upcomingOutgoings?: number;
}

export const AvailableSpendCard = ({ currentBalance, upcomingOutgoings = 0 }: AvailableSpendCardProps) => {
  const [overdraftLimit, setOverdraftLimit] = useState<number>(0);
  const [balanceAmount, setBalanceAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (currentBalance !== undefined) {
      setBalanceAmount(currentBalance);
    }
  }, [currentBalance]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [balanceData, overdraftData] = await Promise.all([
        budgetApi.getLatestBalance(),
        budgetApi.getLatestOverdraft(),
      ]);
      
      if (balanceData) {
        setBalanceAmount(balanceData.amount);
      }
      
      if (overdraftData) {
        setOverdraftLimit(overdraftData.amount);
      }
    } catch (err) {
      console.error('Failed to load financial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const availableWithoutOverdraft = balanceAmount - upcomingOutgoings;
  const availableWithOverdraft = balanceAmount + overdraftLimit - upcomingOutgoings;

  if (loading) {
    return (
      <Card sx={cardSx}>
        <CardContent sx={cardContentSx}>
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
          <CreditCard size={20} color="#6366f1" />

          <Typography variant="h6" sx={titleSx}>
            Available Spend
          </Typography>
        </Box>

        <Box sx={spendContainerSx}>
          <Box sx={spendItemSx}>
            <Typography variant="body2" sx={labelSx}>
              Without Overdraft
            </Typography>

            <Typography variant="h4" sx={amountWithoutSx}>
              £{availableWithoutOverdraft.toFixed(2)}
            </Typography>

            <Box sx={detailsSx}>
              <Typography variant="caption" sx={mutedCaptionSx}>
                Balance: £{balanceAmount.toFixed(2)}
                {upcomingOutgoings > 0 && ` - Pending: £${upcomingOutgoings.toFixed(2)}`}
              </Typography>
            </Box>
          </Box>

          <Divider sx={dividerSx} />

          <Box sx={spendItemSx}>
            <Box sx={withOverdraftHeaderSx}>
              <Typography variant="body2" sx={labelSx}>
                With Overdraft
              </Typography>

              <TrendingUp size={14} color="#10b981" />
            </Box>

            <Typography variant="h4" sx={amountWithSx}>
              £{availableWithOverdraft.toFixed(2)}
            </Typography>

            <Box sx={breakdownSx}>
              <Typography variant="caption" sx={mutedCaptionSx}>
                Balance: £{balanceAmount.toFixed(2)}
              </Typography>

              <Typography variant="caption" sx={mutedCaptionSx}>
                +
              </Typography>

              <Typography variant="caption" sx={overdraftCaptionSx}>
                Overdraft: £{overdraftLimit.toFixed(2)}
              </Typography>

              {upcomingOutgoings > 0 && (
                <>
                  <Typography variant="caption" sx={mutedCaptionSx}>
                    -
                  </Typography>

                  <Typography variant="caption" sx={pendingCaptionSx}>
                    Pending Bills: £{upcomingOutgoings.toFixed(2)}
                  </Typography>
                </>
              )}
            </Box>
          </Box>
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

const cardContentSx = {
  p: 3,
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

const spendContainerSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

const spendItemSx = {
  borderRadius: 2,
  p: 2,
};

const labelSx = {
  color: '#94a3b8',
  mb: 1,
};

const amountWithoutSx = {
  color: '#6366f1',
  fontWeight: 700,
  mb: 1,
};

const amountWithSx = {
  color: '#10b981',
  fontWeight: 700,
  mb: 1,
};

const detailsSx = {
  mt: 0.5,
};

const withOverdraftHeaderSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  mb: 1,
};

const breakdownSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0.25,
  mt: 0.5,
};

const dividerSx = {
  borderColor: '#2d3348',
};

const differenceBoxSx = {
  backgroundColor: 'rgba(16, 185, 129, 0.1)',
  borderRadius: 2,
  p: 2,
  textAlign: 'center',
};

const differenceLabeSx = {
  color: '#94a3b8',
  display: 'block',
  mb: 1,
};

const differenceValueSx = {
  color: '#10b981',
  fontWeight: 700,
};

const loadingBoxSx = {
  display: 'flex',
  justifyContent: 'center',
  py: 4,
};

const loadingSpinnerSx = {
  color: '#6366f1',
};

const mutedCaptionSx = {
  color: '#94a3b8',
};

const overdraftCaptionSx = {
  color: '#f59e0b',
};

const pendingCaptionSx = {
  color: '#ef4444',
};

