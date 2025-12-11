// Scheduled Outgoings table component showing recurring monthly outgoings
import { useState } from 'react';
import { 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Card, 
  CardContent, 
  Box, 
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress
} from '@mui/material';
import { Plus, Trash2, Sparkles, Pencil, Check, X } from 'lucide-react';
import type { ScheduledOutgoing, RawTransaction } from '../services/api';
import { budgetApi } from '../services/api';

interface ScheduledOutgoingsTableProps {
  outgoings: ScheduledOutgoing[];
  rawTransactions: RawTransaction[];
  balanceDayOfMonth: number;
  onOutgoingAdded?: () => void;
}

export const ScheduledOutgoingsTable = ({ 
  outgoings, 
  rawTransactions,
  balanceDayOfMonth,
  onOutgoingAdded 
}: ScheduledOutgoingsTableProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<RawTransaction | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [cleaningDuplicates, setCleaningDuplicates] = useState(false);
  const [duplicateResult, setDuplicateResult] = useState<{ count: number; message: string } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<{ day_of_month: number; amount: string; merchant: string }>({ day_of_month: 1, amount: '', merchant: '' });
  const [formData, setFormData] = useState({
    day_of_month: 1,
    merchant: '',
    amount: '',
  });

  // Sort outgoings by day of month
  const sortedOutgoings = [...outgoings].sort((a, b) => a.day_of_month - b.day_of_month);

  // Calculate total and upcoming total
  const totalOutgoings = sortedOutgoings.reduce((sum, o) => sum + o.amount, 0);
  const upcomingOutgoings = sortedOutgoings
    .filter(o => o.day_of_month > balanceDayOfMonth)
    .reduce((sum, o) => sum + o.amount, 0);

  // Handle adding new outgoing
  const handleAddOutgoing = async () => {
    const amount = parseFloat(formData.amount);

    if (isNaN(amount) || amount <= 0) {
      return;
    }

    try {
      setSaving(true);

      await budgetApi.addScheduledOutgoing({
        day_of_month: formData.day_of_month,
        merchant: formData.merchant,
        amount,
        subcategory: 'Direct Debit',
        account: 'Scheduled Outgoing',
      });

      setDialogOpen(false);
      setFormData({ day_of_month: 1, merchant: '', amount: '' });

      if (onOutgoingAdded) {
        onOutgoingAdded();
      }
    } catch (error) {
      console.error('Failed to add scheduled outgoing:', error);
    } finally {
      setSaving(false);
    }
  };

  // Handle importing from raw transaction
  const handleImportTransaction = async () => {
    if (!selectedTransaction) return;

    const dayOfMonth = new Date(selectedTransaction.transaction_date).getDate();

    try {
      setSaving(true);

      await budgetApi.addScheduledOutgoing({
        day_of_month: dayOfMonth,
        merchant: selectedTransaction.memo || selectedTransaction.account,
        amount: Math.abs(selectedTransaction.amount),
        subcategory: selectedTransaction.override_subcategory || selectedTransaction.subcategory || 'Direct Debit',
        account: selectedTransaction.account || 'Imported Transaction',
      });

      setImportDialogOpen(false);
      setSelectedTransaction(null);

      if (onOutgoingAdded) {
        onOutgoingAdded();
      }
    } catch (error) {
      console.error('Failed to import transaction:', error);
    } finally {
      setSaving(false);
    }
  };

  // Handle deleting an outgoing
  const handleDeleteOutgoing = async (outgoingId: number) => {
    try {
      setDeleting(outgoingId);

      await budgetApi.deleteScheduledOutgoing(outgoingId);

      if (onOutgoingAdded) {
        onOutgoingAdded();
      }
    } catch (error) {
      console.error('Failed to delete scheduled outgoing:', error);
    } finally {
      setDeleting(null);
    }
  };

  // Handle starting to edit an outgoing
  const handleStartEdit = (outgoing: ScheduledOutgoing) => {
    setEditingId(outgoing.id);
    setEditData({
      day_of_month: outgoing.day_of_month,
      amount: outgoing.amount.toString(),
      merchant: outgoing.merchant || outgoing.memo || '',
    });
  };

  // Handle canceling edit
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({ day_of_month: 1, amount: '', merchant: '' });
  };

  // Handle saving edited outgoing
  const handleSaveEdit = async () => {
    if (editingId === null) return;

    const amount = parseFloat(editData.amount);

    if (isNaN(amount) || amount <= 0) {
      return;
    }

    if (editData.day_of_month < 1 || editData.day_of_month > 31) {
      return;
    }

    try {
      setSaving(true);

      await budgetApi.updateScheduledOutgoing(editingId, {
        day_of_month: editData.day_of_month,
        amount,
        merchant: editData.merchant,
      });

      setEditingId(null);
      setEditData({ day_of_month: 1, amount: '', merchant: '' });

      if (onOutgoingAdded) {
        onOutgoingAdded();
      }
    } catch (error) {
      console.error('Failed to update scheduled outgoing:', error);
    } finally {
      setSaving(false);
    }
  };

  // Handle cleaning up duplicates
  const handleCleanupDuplicates = async () => {
    try {
      setCleaningDuplicates(true);
      setDuplicateResult(null);

      const result = await budgetApi.removeDuplicateOutgoings();

      setDuplicateResult({ count: result.count, message: result.message });

      if (result.count > 0 && onOutgoingAdded) {
        onOutgoingAdded();
      }

      setTimeout(() => setDuplicateResult(null), 5000);
    } catch (error) {
      console.error('Failed to clean up duplicates:', error);
    } finally {
      setCleaningDuplicates(false);
    }
  };

  // Filter raw transactions that could be imported (debits only)
  const importableTransactions = rawTransactions.filter(t => {
    const subcategory = (t.override_subcategory || t.subcategory)?.toLowerCase() || '';

    return subcategory.includes('direct debit') || 
           subcategory.includes('bill payment') || 
           subcategory.includes('standing order') ||
           subcategory.includes('recurring monthly payment');
  });

  return (
    <Card sx={cardSx}>
      <CardContent sx={cardContentSx}>
        <Box sx={headerContainerSx}>
          <Typography variant="h6" sx={titleSx}>
            Scheduled Outgoings
          </Typography>

          <Box sx={buttonContainerSx}>
            <Button
              onClick={handleCleanupDuplicates}
              disabled={cleaningDuplicates}
              startIcon={cleaningDuplicates ? <CircularProgress size={14} /> : <Sparkles size={14} />}
              sx={cleanupButtonSx}
              size="small"
            >
              {cleaningDuplicates ? 'Cleaning...' : 'Clean Duplicates'}
            </Button>

            <IconButton 
              onClick={() => setImportDialogOpen(true)} 
              sx={iconButtonSx}
              title="Import from transactions"
            >
              <Plus size={18} />
            </IconButton>
          </Box>
        </Box>

        {duplicateResult && (
          <Box sx={duplicateResultSx}>
            <Typography variant="body2" sx={duplicateResultTextSx(duplicateResult.count > 0)}>
              {duplicateResult.message}
            </Typography>
          </Box>
        )}

        <Box sx={summaryContainerSx}>
          <Box sx={summaryItemSx}>
            <Typography variant="body2" sx={summaryLabelSx}>
              Total Monthly
            </Typography>

            <Typography variant="h4" sx={summaryValueSx}>
              £{totalOutgoings.toFixed(2)}
            </Typography>
          </Box>

          <Box sx={summaryItemSx}>
            <Typography variant="body2" sx={summaryLabelSx}>
              Still Due (after day {balanceDayOfMonth})
            </Typography>

            <Typography variant="h4" sx={summaryValueUpcomingSx}>
              £{upcomingOutgoings.toFixed(2)}
            </Typography>
          </Box>
        </Box>

        <TableContainer component={Paper} sx={tableContainerSx}>
          <Table stickyHeader sx={tableSx}>
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellSx}>
                  Day
                </TableCell>

                <TableCell sx={headerCellSx}>
                  Name
                </TableCell>

                <TableCell align="right" sx={headerCellSx}>
                  Amount
                </TableCell>

                <TableCell sx={headerCellSx}>
                  Status
                </TableCell>

                <TableCell sx={headerCellActionSx}>
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {sortedOutgoings.map((outgoing) => {
                const isPaid = outgoing.day_of_month <= balanceDayOfMonth;
                const isEditing = editingId === outgoing.id;

                return (
                    <TableRow key={outgoing.id} sx={tableRowSx}>
                    <TableCell sx={bodyCellDaySx}>
                      {isEditing ? (
                        <TextField
                          type="number"
                          value={editData.day_of_month}
                          onChange={(e) => setEditData({ ...editData, day_of_month: parseInt(e.target.value) || 1 })}
                          size="small"
                          fullWidth
                          sx={inlineTextFieldSx}
                          inputProps={{ min: 1, max: 31, style: { width: '100%', padding: '4px 8px' } }}
                        />
                      ) : (
                        outgoing.day_of_month
                      )}
                    </TableCell>

                    <TableCell sx={bodyCellNameSx}>
                      {isEditing ? (
                        <TextField
                          value={editData.merchant}
                          onChange={(e) => setEditData({ ...editData, merchant: e.target.value })}
                          size="small"
                          fullWidth
                          sx={inlineTextFieldSx}
                          inputProps={{ style: { padding: '4px 8px' } }}
                        />
                      ) : (
                        outgoing.merchant || outgoing.memo
                      )}
                    </TableCell>

                    <TableCell align="right" sx={bodyCellAmountSx}>
                      {isEditing ? (
                        <TextField
                          type="number"
                          value={editData.amount}
                          onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                          size="small"
                          fullWidth
                          sx={inlineTextFieldSx}
                          inputProps={{ step: '0.01', min: '0', style: { width: '100%', padding: '4px 8px', textAlign: 'right' } }}
                        />
                      ) : (
                        `-£${outgoing.amount.toFixed(2)}`
                      )}
                    </TableCell>

                    <TableCell sx={isPaid ? bodyCellPaidSx : bodyCellPendingSx}>
                      {isPaid ? 'Paid' : 'Pending'}
                    </TableCell>

                    <TableCell sx={bodyCellActionSx}>
                      <Box sx={actionButtonContainerSx}>
                        {isEditing ? (
                          <>
                            <IconButton
                              onClick={handleSaveEdit}
                              disabled={saving}
                              sx={saveEditButtonSx}
                              size="small"
                              title="Save changes"
                            >
                              {saving ? (
                                <CircularProgress size={14} sx={savingProgressSx} />
                              ) : (
                                <Check size={14} />
                              )}
                            </IconButton>

                            <IconButton
                              onClick={handleCancelEdit}
                              disabled={saving}
                              sx={cancelEditButtonSx}
                              size="small"
                              title="Cancel edit"
                            >
                              <X size={14} />
                            </IconButton>
                          </>
                        ) : (
                          <>
                            <IconButton
                              onClick={() => handleStartEdit(outgoing)}
                              disabled={editingId !== null}
                              sx={editButtonSx}
                              size="small"
                              title="Edit outgoing"
                            >
                              <Pencil size={14} />
                            </IconButton>

                            <IconButton
                              onClick={() => handleDeleteOutgoing(outgoing.id)}
                              disabled={deleting === outgoing.id || editingId !== null}
                              sx={deleteButtonSx}
                              size="small"
                              title="Delete outgoing"
                            >
                              {deleting === outgoing.id ? (
                                <CircularProgress size={14} sx={deletingProgressSx} />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </IconButton>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="body2" sx={footerTextSx}>
          Showing {sortedOutgoings.length} scheduled outgoing{sortedOutgoings.length !== 1 ? 's' : ''}
        </Typography>
      </CardContent>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} PaperProps={{ sx: dialogPaperSx }}>
        <DialogTitle sx={dialogTitleSx}>Add Scheduled Outgoing</DialogTitle>

        <DialogContent sx={dialogContentSx}>
          <TextField
            label="Day of Month"
            type="number"
            value={formData.day_of_month}
            onChange={(e) => setFormData({ ...formData, day_of_month: parseInt(e.target.value) || 1 })}
            fullWidth
            sx={textFieldSx}
            InputLabelProps={{ sx: inputLabelSx }}
            inputProps={{ min: 1, max: 31 }}
          />

          <TextField
            label="Name/Merchant"
            value={formData.merchant}
            onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
            fullWidth
            sx={textFieldSx}
            InputLabelProps={{ sx: inputLabelSx }}
          />

          <TextField
            label="Amount (£)"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            fullWidth
            sx={textFieldSx}
            InputLabelProps={{ sx: inputLabelSx }}
            inputProps={{ step: '0.01', min: '0' }}
          />
        </DialogContent>

        <DialogActions sx={dialogActionsSx}>
          <Button onClick={() => setDialogOpen(false)} sx={cancelButtonSx}>
            Cancel
          </Button>

          <Button 
            onClick={handleAddOutgoing} 
            disabled={saving}
            sx={saveButtonSx}
          >
            {saving ? <CircularProgress size={16} /> : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={importDialogOpen} 
        onClose={() => setImportDialogOpen(false)} 
        PaperProps={{ sx: importDialogPaperSx }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={dialogTitleSx}>Import from Transactions</DialogTitle>

        <DialogContent sx={dialogContentSx}>
          <Typography variant="body2" sx={importHelperTextSx}>
            Select a transaction to import as a scheduled outgoing
          </Typography>

          <TableContainer component={Paper} sx={importTableContainerSx}>
            <Table size="small" sx={tableSx}>
              <TableHead>
                <TableRow>
                  <TableCell sx={headerCellSx}>Date</TableCell>

                  <TableCell sx={headerCellSx}>Name</TableCell>

                  <TableCell align="right" sx={headerCellSx}>Amount</TableCell>

                  <TableCell sx={headerCellSx}>Action</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {importableTransactions.map((transaction) => (
                  <TableRow 
                    key={transaction.id} 
                    sx={getImportRowSx(selectedTransaction?.id === transaction.id)}
                  >
                    <TableCell sx={bodyCellSx}>
                      {new Date(transaction.transaction_date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </TableCell>

                    <TableCell sx={bodyCellNameSx}>
                      {transaction.memo || transaction.account}
                    </TableCell>

                    <TableCell align="right" sx={bodyCellAmountSx}>
                      -£{Math.abs(transaction.amount).toFixed(2)}
                    </TableCell>

                    <TableCell sx={bodyCellSx}>
                      <Button
                        size="small"
                        onClick={() => setSelectedTransaction(transaction)}
                        sx={selectedTransaction?.id === transaction.id ? selectedButtonSx : selectButtonSx}
                      >
                        {selectedTransaction?.id === transaction.id ? 'Selected' : 'Select'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>

        <DialogActions sx={dialogActionsSx}>
          <Button onClick={() => setImportDialogOpen(false)} sx={cancelButtonSx}>
            Cancel
          </Button>

          <Button 
            onClick={handleImportTransaction} 
            disabled={saving || !selectedTransaction}
            sx={saveButtonSx}
          >
            {saving ? <CircularProgress size={16} /> : 'Import'}
          </Button>
        </DialogActions>
      </Dialog>
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

const headerContainerSx = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  mb: 3,
};

const titleSx = {
  color: '#fff',
  fontWeight: 600,
};

const buttonContainerSx = {
  display: 'flex',
  gap: 1,
};

const iconButtonSx = {
  color: '#6366f1',
  backgroundColor: 'rgba(99, 102, 241, 0.1)',
  '&:hover': {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
};

const cleanupButtonSx = {
  color: '#f59e0b',
  backgroundColor: 'rgba(245, 158, 11, 0.1)',
  textTransform: 'none',
  fontSize: '0.75rem',
  '&:hover': {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  '&:disabled': {
    color: '#64748b',
  },
};

const duplicateResultSx = {
  backgroundColor: 'rgba(16, 185, 129, 0.1)',
  borderRadius: 1,
  p: 1.5,
  mb: 2,
};

const duplicateResultTextSx = (hasDuplicates: boolean) => ({
  color: hasDuplicates ? '#10b981' : '#94a3b8',
});

const summaryContainerSx = {
  display: 'flex',
  gap: 3,
  mb: 3,
};

const summaryItemSx = {
  backgroundColor: 'rgba(0, 0, 0, 0.1)',
  borderRadius: 2,
  p: 2,
  flex: 1,
};

const summaryLabelSx = {
  color: '#94a3b8',
  mb: 0.5,
};

const summaryValueSx = {
  color: '#ef4444',
  fontWeight: 700,
};

const summaryValueUpcomingSx = {
  color: '#f59e0b',
  fontWeight: 700,
};

const tableContainerSx = {
  backgroundColor: '#1a1f37',
  maxHeight: 400,
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

const headerCellActionSx = {
  backgroundColor: '#1a1f37',
  color: '#94a3b8',
  fontWeight: 600,
  borderBottom: '1px solid #2d3348',
  width: 80,
  padding: '16px',
};

const tableRowSx = {
  backgroundColor: '#1a1f37',
  '& .MuiTableCell-root': {
    paddingTop: '16px',
    paddingBottom: '16px',
  },
};

const getImportRowSx = (isSelected: boolean) => ({
  ...tableRowSx,
  backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
});

const bodyCellSx = {
  borderBottom: '1px solid #2d3348',
  color: '#94a3b8',
};

const bodyCellDaySx = {
  color: '#6366f1',
  fontWeight: 600,
  borderBottom: '1px solid #2d3348',
};

const bodyCellNameSx = {
  color: '#e2e8f0',
  borderBottom: '1px solid #2d3348',
};

const bodyCellAmountSx = {
  color: '#ef4444',
  fontWeight: 600,
  borderBottom: '1px solid #2d3348',
};

const bodyCellPaidSx = {
  color: '#10b981',
  fontWeight: 500,
  borderBottom: '1px solid #2d3348',
};

const bodyCellPendingSx = {
  color: '#f59e0b',
  fontWeight: 500,
  borderBottom: '1px solid #2d3348',
};

const bodyCellActionSx = {
  borderBottom: '1px solid #2d3348',
  padding: '16px 8px',
  width: 80,
};

const deleteButtonSx = {
  color: '#ef4444',
  '&:hover': {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  '&:disabled': {
    color: '#64748b',
  },
};

const footerTextSx = {
  color: '#64748b',
  mt: 2,
};

const dialogPaperSx = {
  backgroundColor: '#1a1f37',
  color: '#fff',
};

const importDialogPaperSx = {
  backgroundColor: '#1a1f37',
  color: '#fff',
  maxHeight: '80vh',
};

const dialogTitleSx = {
  color: '#fff',
  backgroundColor: '#1a1f37',
};

const dialogContentSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  pt: 2,
  backgroundColor: '#1a1f37',
};

const dialogActionsSx = {
  p: 2,
  backgroundColor: '#1a1f37',
};

const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    minHeight: 48,
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

const inputLabelSx = {
  color: '#94a3b8',
};

const cancelButtonSx = {
  color: '#94a3b8',
};

const saveButtonSx = {
  backgroundColor: '#6366f1',
  color: '#fff',
  '&:hover': {
    backgroundColor: '#4f46e5',
  },
  '&:disabled': {
    backgroundColor: '#334155',
    color: '#94a3b8',
  },
};

const importTableContainerSx = {
  backgroundColor: '#0f1729',
  maxHeight: 300,
};

const importHelperTextSx = {
  color: '#94a3b8',
  mb: 2,
};

const selectButtonSx = {
  color: '#6366f1',
  fontSize: '0.75rem',
  textTransform: 'none',
};

const selectedButtonSx = {
  backgroundColor: '#6366f1',
  color: '#fff',
  fontSize: '0.75rem',
  textTransform: 'none',
  '&:hover': {
    backgroundColor: '#4f46e5',
  },
};

const actionButtonContainerSx = {
  display: 'flex',
  gap: 0.5,
};

const editButtonSx = {
  color: '#6366f1',
  '&:hover': {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  '&:disabled': {
    color: '#64748b',
  },
};

const saveEditButtonSx = {
  color: '#10b981',
  '&:hover': {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  '&:disabled': {
    color: '#64748b',
  },
};

const cancelEditButtonSx = {
  color: '#94a3b8',
  '&:hover': {
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
  },
  '&:disabled': {
    color: '#64748b',
  },
};

const savingProgressSx = {
  color: '#10b981',
};

const deletingProgressSx = {
  color: '#ef4444',
};

const inlineTextFieldSx = {
  '& .MuiOutlinedInput-root': {
    minHeight: 44,
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
  '& .MuiInputBase-input': {
    padding: '4px 8px',
    fontSize: '0.875rem',
  },
};

