// Recurring transactions summary card
import { Card, CardContent, Typography, Box, Divider } from '@mui/material';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { RecurringCalculation } from '../store/budgetStore';

interface RecurringTransactionsCardProps {
  data: RecurringCalculation;
}

export const RecurringTransactionsCard = ({ data }: RecurringTransactionsCardProps) => {
  const difference = data.totalMonthlyIncome - data.totalMonthlyOutgoings;
  const isPositive = difference >= 0;

  return (
    <Card sx={cardSx}>
      <CardContent sx={cardContentSx}>
        <Box display="flex" alignItems="center" gap={1} mb={3}>
          <Calendar size={20} color="#6366f1" />

          <Typography variant="h6" sx={titleSx}>
            Monthly Recurring Summary
          </Typography>
        </Box>

        <Box display="flex" flexDirection="column" gap={2}>
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <TrendingUp size={16} color="#10b981" />

              <Typography variant="body2" sx={labelSx}>
                Income
              </Typography>
            </Box>

            <Typography variant="h5" sx={incomeSx}>
              £{data.totalMonthlyIncome.toFixed(2)}
            </Typography>
          </Box>

          <Divider sx={dividerSx} />

          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <TrendingDown size={16} color="#ef4444" />

              <Typography variant="body2" sx={labelSx}>
                Outgoing
              </Typography>
            </Box>

            <Typography variant="h5" sx={outgoingSx}>
              £{data.totalMonthlyOutgoings.toFixed(2)}
            </Typography>
          </Box>

          <Divider sx={dividerSx} />

          <Box
            sx={getDifferenceBoxSx(isPositive)}
          >
            <Typography variant="body2" sx={differenceLabeSx}>
              Difference
            </Typography>

            <Typography
              variant="h4"
              sx={getDifferenceValueSx(isPositive)}
            >
              {isPositive ? '+' : ''}£{difference.toFixed(2)}
            </Typography>

            {data.nextIncomeDate && (
              <Typography variant="caption" sx={nextIncomeSx}>
                Next income: {format(data.nextIncomeDate, 'MMM dd, yyyy')}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

// Style constants
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

const titleSx = {
  fontWeight: 600,
};

const labelSx = {
  color: '#94a3b8',
};

const incomeSx = {
  fontWeight: 700,
  color: '#10b981',
};

const outgoingSx = {
  fontWeight: 700,
  color: '#ef4444',
};

const dividerSx = {
  borderColor: '#2d3348',
};

const differenceBoxSx = {
  borderRadius: 2,
  p: 2,
};

const differenceLabeSx = {
  color: '#94a3b8',
  mb: 1,
};

const differenceValueSx = {
  fontWeight: 700,
};

const getDifferenceBoxSx = (isPositive: boolean) => ({
  ...differenceBoxSx,
  backgroundColor: isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
});

const getDifferenceValueSx = (isPositive: boolean) => ({
  ...differenceValueSx,
  color: isPositive ? '#10b981' : '#ef4444',
});

const nextIncomeSx = {
  color: '#94a3b8',
  mt: 1,
  display: 'block',
};


