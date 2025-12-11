// Transactions table component showing all transactions
import { useState } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Card, CardContent, Box, Select, MenuItem } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import type { RawTransaction } from '../services/api';
import { budgetApi } from '../services/api';

interface TransactionsTableProps {
  transactions: RawTransaction[];
  onTransactionUpdate?: () => void;
}

// Available transaction types
const TRANSACTION_TYPES = [
  'Direct Debit',
  'Debit',
  'Card Purchase',
  'Bill Payment',
  'Standing Order',
  'Counter Credit',
  'Unpaid',
  'Funds Transfer',
  'Recurring Monthly Payment',
  'Credit Payment',
];

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
    'Funds Transfer': '#3b82f6',
    'Recurring Monthly Payment': '#a855f7',
    'Credit Payment': '#06b6d4',
  };
  
  return colorMap[subcategory] || '#ef4444';
};

export const TransactionsTable = ({ transactions, onTransactionUpdate }: TransactionsTableProps) => {
  const [updatingTransactionId, setUpdatingTransactionId] = useState<number | null>(null);

  // Format date to readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Get effective subcategory (override if present, otherwise original)
  const getEffectiveSubcategory = (transaction: RawTransaction): string => {
    return transaction.override_subcategory || transaction.subcategory;
  };

  // Handle type change
  const handleTypeChange = async (transaction: RawTransaction, event: SelectChangeEvent<string>) => {
    const newType = event.target.value;
    
    setUpdatingTransactionId(transaction.id);
    
    try {
      await budgetApi.updateTransactionType(transaction.id, newType);
      
      if (onTransactionUpdate) {
        onTransactionUpdate();
      }
    } catch (error) {
      console.error('Failed to update transaction type:', error);
    } finally {
      setUpdatingTransactionId(null);
    }
  };

  // Determine if amount is positive or negative based on transaction type
  const getAmountColor = (transaction: RawTransaction) => {
    const effectiveType = getEffectiveSubcategory(transaction);
    
    // Show green for Counter Credit, orange for Unpaid, red for debits
    if (effectiveType === 'Counter Credit') return '#10b981';
    if (effectiveType === 'Unpaid') return '#f59e0b';
    
    return '#ef4444';
  };

  // Format amount with £ symbol
  const formatAmount = (transaction: RawTransaction) => {
    const effectiveType = getEffectiveSubcategory(transaction);
    const absAmount = Math.abs(transaction.amount);
    
    // Show + for Counter Credit and Unpaid (credits/refunds), - for debits
    const sign = (effectiveType === 'Counter Credit' || effectiveType === 'Unpaid') ? '+' : '-';
    
    return `${sign}£${absAmount.toFixed(2)}`;
  };

  // Sort transactions by date (most recent last)
  const sortedTransactions = [...transactions].sort((a, b) => {
    return new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();
  }).reverse();

  return (
    <Card sx={cardSx}>
      <CardContent sx={cardContentSx}>
        <Typography variant="h6" sx={titleSx}>
          All Transactions
        </Typography>

        <TableContainer component={Paper} sx={tableContainerSx}>
          <Table stickyHeader sx={tableSx}>
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellColorIndicatorSx}>
                </TableCell>

                <TableCell sx={headerCellSx}>
                  Name
                </TableCell>

                <TableCell sx={headerCellSx}>
                  Original Type
                </TableCell>

                <TableCell sx={headerCellSx}>
                  Override Type
                </TableCell>

                <TableCell align="right" sx={headerCellSx}>
                  Amount
                </TableCell>

                <TableCell sx={headerCellSx}>
                  Date
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {sortedTransactions.map((transaction) => {
                const effectiveType = getEffectiveSubcategory(transaction);
                const typeColor = getTransactionTypeColor(effectiveType);
                const isUpdating = updatingTransactionId === transaction.id;
                const amountColor = getAmountColor(transaction);
                
                return (
                  <TableRow
                    key={transaction.id}
                    sx={tableRowSx}
                  >
                    <TableCell sx={bodyCellColorIndicatorSx}>
                      <Box
                        sx={getColorIndicatorBoxSx(typeColor)}
                      />
                    </TableCell>

                    <TableCell sx={bodyCellNameSx}>
                      {transaction.memo || transaction.account}
                    </TableCell>

                    <TableCell sx={bodyCellSx}>
                      <Typography
                        variant="body2"
                        sx={getOriginalTypeTextSx(Boolean(transaction.override_subcategory))}
                      >
                        {transaction.subcategory || 'Unknown'}
                      </Typography>
                    </TableCell>

                    <TableCell sx={bodyCellSx}>
                      <Select
                        value={effectiveType}
                        onChange={(e) => handleTypeChange(transaction, e)}
                        disabled={isUpdating}
                        size="small"
                        sx={getSelectOverrideSx(Boolean(transaction.override_subcategory))}
                      >
                        {TRANSACTION_TYPES.map((type) => (
                          <MenuItem key={type} value={type}>
                            {type}
                          </MenuItem>
                        ))}
                      </Select>
                    </TableCell>

                    <TableCell 
                      align="right" 
                      sx={getAmountCellSx(amountColor)}
                    >
                      {formatAmount(transaction)}
                    </TableCell>

                    <TableCell sx={bodyCellDateSx}>
                      {formatDate(transaction.transaction_date)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="body2" sx={footerTextSx}>
          Showing {sortedTransactions.length} transaction{sortedTransactions.length !== 1 ? 's' : ''}
        </Typography>
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
  color: '#fff',
  mb: 3,
  fontWeight: 600,
};

const tableContainerSx = {
  backgroundColor: '#1a1f37',
  maxHeight: 500,
  boxShadow: 'none',
  border: 'none',
};

const tableSx = {
  backgroundColor: '#1a1f37',
};

const headerCellSx = {
  backgroundColor: '#1a1f37',
  color: '#94a3b8',
  fontWeight: 600,
  borderBottom: '1px solid #2d3348',
};

const headerCellColorIndicatorSx = {
  backgroundColor: '#1a1f37',
  color: '#94a3b8',
  fontWeight: 600,
  borderBottom: '1px solid #2d3348',
  width: '4px',
  padding: 0,
};

const tableRowSx = {
  backgroundColor: '#1a1f37',
};

const bodyCellSx = {
  borderBottom: '1px solid #2d3348',
};

const bodyCellColorIndicatorSx = {
  borderBottom: '1px solid #2d3348',
  padding: '16px 0',
  width: '4px',
};

const colorIndicatorBoxSx = {
  width: 4,
  minHeight: 40,
  borderRadius: 1,
};

const getColorIndicatorBoxSx = (backgroundColor: string) => ({
  ...colorIndicatorBoxSx,
  backgroundColor,
});

const bodyCellNameSx = {
  color: '#e2e8f0',
  borderBottom: '1px solid #2d3348',
};

const getOriginalTypeTextSx = (hasOverride: boolean) => ({
  color: hasOverride ? '#64748b' : '#94a3b8',
  fontSize: '0.875rem',
  textDecoration: hasOverride ? 'line-through' : 'none',
  fontStyle: hasOverride ? 'italic' : 'normal',
});

const selectSx = {
  fontSize: '0.875rem',
  '.MuiOutlinedInput-notchedOutline': {
    borderColor: 'transparent',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: '#6366f1',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#6366f1',
  },
  '.MuiSelect-select': {
    padding: '4px 8px',
  },
  '.MuiSvgIcon-root': {
    color: '#94a3b8',
  },
};

const getSelectOverrideSx = (hasOverride: boolean) => ({
  ...selectSx,
  color: hasOverride ? '#f59e0b' : '#94a3b8',
});

const bodyCellAmountSx = {
  fontWeight: 600,
  borderBottom: '1px solid #2d3348',
};

const getAmountCellSx = (color: string) => ({
  ...bodyCellAmountSx,
  color,
});

const bodyCellDateSx = {
  color: '#94a3b8',
  borderBottom: '1px solid #2d3348',
};

const footerTextSx = {
  color: '#64748b',
  mt: 2,
};


