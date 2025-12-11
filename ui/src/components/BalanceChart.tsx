// Balance over time chart component
import { Card, CardContent, Typography, Box } from '@mui/material';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TooltipProps } from 'recharts';
import { addDays, format, parseISO } from 'date-fns';
import { useMemo } from 'react';
import type { RawTransaction } from '../services/api';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

interface BalanceChartProps {
  data: { date: string; balance: number }[];
  title?: string;
  rawTransactions?: RawTransaction[];
}

export const BalanceChart = ({ data, title = 'Balance Over Time', rawTransactions = [] }: BalanceChartProps) => {
  const normalizedData = useMemo(() => {
    if (!data.length) return [];

    const counterCreditByDate = new Map<string, boolean>();

    rawTransactions.forEach(transaction => {
      if (transaction?.transaction_date && transaction?.subcategory) {
        const subcategory = transaction.subcategory.toLowerCase();

        if (subcategory.includes('counter credit')) {
          try {
            const transactionDate = parseISO(transaction.transaction_date);
            const dayKey = format(transactionDate, 'yyyy-MM-dd');

            counterCreditByDate.set(dayKey, true);
          } catch (error) {
            console.warn('Invalid transaction date:', transaction.transaction_date);
          }
        }
      }
    });

    const dailyBalanceByDate = new Map<string, number>();

    data.forEach(item => {
      if (!item?.date) return;

      try {
        const parsedDate = parseISO(item.date);
        const dayKey = format(parsedDate, 'yyyy-MM-dd');

        dailyBalanceByDate.set(dayKey, item.balance);
      } catch (error) {
        console.warn('Invalid balance date:', item.date);
      }
    });

    const sortedDayKeys = Array.from(dailyBalanceByDate.keys()).sort();

    if (!sortedDayKeys.length) return [];

    const startDate = parseISO(sortedDayKeys[0]);
    const endDate = parseISO(sortedDayKeys[sortedDayKeys.length - 1]);
    const normalized: {
      date: number;
      displayDate: string;
      balance: number;
      dailyChange: number;
      incomeBar: number | null;
    }[] = [];

    let cursor = startDate;
    let index = 0;
    let previousBalance = dailyBalanceByDate.get(format(cursor, 'yyyy-MM-dd')) ?? data[0].balance;

    while (cursor <= endDate) {
      const dayKey = format(cursor, 'yyyy-MM-dd');
      const balanceForDay = dailyBalanceByDate.has(dayKey)
        ? dailyBalanceByDate.get(dayKey) as number
        : previousBalance;
      const dailyChange = index === 0 ? 0 : balanceForDay - previousBalance;

      normalized.push({
        date: cursor.getTime(),
        displayDate: format(cursor, 'MMM dd'),
        balance: Math.round(balanceForDay * 100) / 100,
        dailyChange: Math.round(dailyChange * 100) / 100,
        incomeBar: counterCreditByDate.get(dayKey) ? 1 : null,
      });

      previousBalance = balanceForDay;
      cursor = addDays(cursor, 1);
      index += 1;
    }

    return normalized;
  }, [data, rawTransactions]);

  const yAxisDomain = useMemo(() => {
    if (!normalizedData.length) return [-100, 0];

    const minBalance = Math.min(...normalizedData.map(d => d.balance));
    const minWithPadding = minBalance - (Math.abs(minBalance) * 0.1);

    return [minWithPadding, 0];
  }, [normalizedData]);

  const formatDateTick = (value: number) => {
    return format(new Date(value), 'MMM dd');
  };

  const formatYAxis = (value: number) => {
    return `£${value.toFixed(0)}`;
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const dailyChange = data.dailyChange || 0;
    const balance = data.balance || 0;
    const displayDate = data.displayDate || (label ? format(new Date(label as number), 'MMM dd') : '');
    const changeColor = dailyChange >= 0 ? '#10b981' : '#ef4444';
    const changeSign = dailyChange >= 0 ? '+' : '';

    return (
      <Box sx={tooltipBoxSx}>
        <Typography variant="body2" sx={tooltipDateSx}>
          {displayDate}
        </Typography>

        <Typography variant="body2" sx={tooltipBalanceSx}>
          Balance: <strong>£{balance.toFixed(2)}</strong>
        </Typography>

        <Typography 
          variant="body2" 
          sx={tooltipChangeSx(changeColor)}
        >
          Daily Change: {changeSign}£{dailyChange.toFixed(2)}
        </Typography>
      </Box>
    );
  };

  return (
    <Card sx={cardSx}>
      <CardContent sx={cardContentSx}>
        <Typography variant="h6" sx={titleSx}>
          {title}
        </Typography>

        <Box sx={chartContainerSx}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={normalizedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3348" />

              <XAxis
                dataKey="date"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={formatDateTick}
                stroke="#94a3b8"
                style={axisStyle}
              />

              <YAxis
                yAxisId="balance"
                stroke="#94a3b8"
                style={axisStyle}
                tickFormatter={formatYAxis}
                domain={yAxisDomain}
              />

              <YAxis
                yAxisId="income"
                orientation="right"
                hide
                domain={[0, 1]}
              />

              <Tooltip content={<CustomTooltip />} />

              <Bar
                yAxisId="income"
                dataKey="incomeBar"
                fill="#10b981"
                fillOpacity={0.3}
                barSize={20}
              />

              <Line
                yAxisId="balance"
                type="monotone"
                dataKey="balance"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                activeDot={activeDotConfig}
              />
            </ComposedChart>
          </ResponsiveContainer>
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
  mb: 3,
  fontWeight: 600,
};

const chartContainerSx = {
  width: '100%',
  height: 300,
};

const tooltipBoxSx = {
  backgroundColor: '#0f1729',
  border: '1px solid #2d3348',
  borderRadius: '8px',
  padding: '12px',
  color: '#fff',
};

const tooltipDateSx = {
  color: '#94a3b8',
  mb: 1,
};

const tooltipBalanceSx = {
  mb: 0.5,
};

const tooltipChangeSx = (color: string) => ({
  color,
  fontWeight: 600,
});

const axisStyle = {
  fontSize: '12px',
};

const activeDotConfig = {
  r: 6,
};


