// Top merchants list component
import { Card, CardContent, Typography, Box, List, ListItem, ListItemText } from '@mui/material';
import { Store } from 'lucide-react';

interface TopMerchantsProps {
  data: { name: string; amount: number; count: number; subcategory: string }[];
  title?: string;
}

// Color mapping for transaction types (matching pie chart colors)
const getTransactionTypeColor = (subcategory: string): string => {
  const colorMap: { [key: string]: string } = {
    'Direct Debit': '#6366f1',
    'Debit': '#8b5cf6',
    'Card Purchase': '#ec4899',
    'Bill Payment': '#f59e0b',
    'Standing Order': '#10b981',
    'Counter Credit': '#10b981',
    'Unpaid': '#f59e0b',
  };
  
  return colorMap[subcategory] || '#ef4444';
};

export const TopMerchants = ({ data, title = 'Top Merchants' }: TopMerchantsProps) => {
  return (
    <Card sx={cardSx}>
      <CardContent sx={cardContentSx}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Store size={20} color="#6366f1" />

          <Typography variant="h6" sx={titleSx}>
            {title}
          </Typography>
        </Box>

        <List sx={listSx}>
          {data.map((merchant, index) => {
            const typeColor = getTransactionTypeColor(merchant.subcategory);
            
            return (
              <ListItem
                key={index}
                sx={getMerchantRowSx(index < data.length - 1)}
              >
                <Box
                  sx={getColorIndicatorSx(typeColor)}
                />

                <ListItemText
                  primary={
                    <Typography variant="body1" sx={merchantNameSx}>
                      {merchant.name}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" sx={transactionCountSx}>
                      {merchant.count} transactions
                    </Typography>
                  }
                />

                <Typography variant="h6" sx={amountSx}>
                  £{merchant.amount.toFixed(2)}
                </Typography>
              </ListItem>
            );
          })}
        </List>

        {data.length === 0 && (
          <Typography variant="body2" sx={emptyStateSx}>
            No merchant data available
          </Typography>
        )}
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

const listSx = {
  p: 0,
};

const colorIndicatorSx = {
  width: 4,
  height: 40,
  borderRadius: 1,
  mr: 2,
};

const getColorIndicatorSx = (backgroundColor: string) => ({
  ...colorIndicatorSx,
  backgroundColor,
});

const merchantNameSx = {
  fontWeight: 500,
};

const transactionCountSx = {
  color: '#94a3b8',
};

const amountSx = {
  fontWeight: 700,
  color: '#ef4444',
};

const getMerchantRowSx = (hasBorder: boolean) => ({
  px: 0,
  py: 2,
  borderBottom: hasBorder ? '1px solid #2d3348' : 'none',
});

const emptyStateSx = {
  color: '#94a3b8',
  textAlign: 'center',
  py: 4,
};


