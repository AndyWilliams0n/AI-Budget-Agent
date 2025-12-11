// Main Dashboard page with Geckoboard-inspired layout
import { useEffect, useState, useCallback } from 'react';
import { Box, Grid, CircularProgress, Typography, Alert, Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel, TextField } from '@mui/material';
import { Wallet, TrendingUp, TrendingDown, DollarSign, ShoppingCart } from 'lucide-react';
import { useBudgetData } from '../hooks/useBudgetData';
import { useBudgetStore } from '../store/budgetStore';
import { budgetApi } from '../services/api';
import type { Balance as ApiBalance } from '../services/api';
import { 
  calculateRecurringTransactions, 
  calculateBalanceOverTime,
  getSpendingByCategory,
  getTopMerchants 
} from '../utils/budgetCalculations';
import { KPICard } from '../components/KPICard';
import { BalanceChart } from '../components/BalanceChart';
import { SpendingByCategory } from '../components/SpendingByCategory';
import { TopMerchants } from '../components/TopMerchants';
import { RecurringTransactionsCard } from '../components/RecurringTransactionsCard';
import { TransactionsTable } from '../components/TransactionsTable';
import { AccountBalanceCard } from '../components/AccountBalanceCard';
import { OverdraftCard } from '../components/OverdraftCard';
import { AvailableSpendCard } from '../components/AvailableSpendCard';
import { ScheduledOutgoingsTable } from '../components/ScheduledOutgoingsTable';

export const Dashboard = () => {
  const { 
    income, 
    outgoings, 
    purchases, 
    rawTransactions, 
    stats, 
    loading, 
    error, 
    availableMonths, 
    fetchDataByMonth, 
    fetchDataByDateRange 
  } = useBudgetData();
  
  const { 
    setRecurringCalc, 
    recurringCalc, 
    selectedMonth, 
    useDateRange, 
    dateRange, 
    setSelectedMonth, 
    setUseDateRange, 
    setDateRange, 
    enableDateRangeMode,
    scheduledOutgoings,
    setScheduledOutgoings
  } = useBudgetStore();

  const [balanceDayOfMonth, setBalanceDayOfMonth] = useState<number>(new Date().getDate());
  const [upcomingOutgoings, setUpcomingOutgoings] = useState<number>(0);
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);

  // Fetch scheduled outgoings
  const fetchScheduledOutgoings = useCallback(async () => {
    try {
      const data = await budgetApi.getScheduledOutgoings();

      setScheduledOutgoings(data);
    } catch (err) {
      console.error('Error fetching scheduled outgoings:', err);
    }
  }, [setScheduledOutgoings]);

  // Fetch latest balance to drive calculations
  const fetchLatestBalance = useCallback(async () => {
    try {
      const balance = await budgetApi.getLatestBalance();

      if (balance) {
        const recordedDate = new Date(balance.recorded_at);

        setBalanceDayOfMonth(recordedDate.getDate());
        setCurrentBalance(balance.amount);
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  }, []);

  // Calculate upcoming outgoings when data changes
  useEffect(() => {
    const upcoming = scheduledOutgoings
      .filter(o => o.day_of_month > balanceDayOfMonth)
      .reduce((sum, o) => sum + o.amount, 0);

    setUpcomingOutgoings(upcoming);
  }, [scheduledOutgoings, balanceDayOfMonth]);

  // Initial fetch for scheduled outgoings and balance day
  useEffect(() => {
    fetchScheduledOutgoings();
    fetchLatestBalance();
  }, [fetchScheduledOutgoings, fetchLatestBalance]);

  // Handle transaction update (refetch data)
  const handleTransactionUpdate = () => {
    if (useDateRange && dateRange) {
      fetchDataByDateRange(dateRange.startDate, dateRange.endDate);
    } else if (selectedMonth) {
      fetchDataByMonth(selectedMonth.year, selectedMonth.month);
    }
  };

  // Handle scheduled outgoing added (refetch data)
  const handleScheduledOutgoingAdded = () => {
    fetchScheduledOutgoings();
  };

  // Handle balance updated (push through calculations without full refresh)
  const handleBalanceUpdated = (balance: ApiBalance) => {
    const recordedDate = new Date(balance.recorded_at);

    setCurrentBalance(balance.amount);

    setBalanceDayOfMonth(recordedDate.getDate());
  };

  // Get month name from month number
  const getMonthName = (month: number) => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    return monthNames[month - 1];
  };

  // Handle month change
  const handleMonthChange = (yearMonth: string) => {
    const [year, month] = yearMonth.split('-').map(Number);
    
    setSelectedMonth({ year, month });
  };

  // Handle date range toggle
  const handleDateRangeToggle = (checked: boolean) => {
    if (checked) {
      // If we already have a date range saved, just re-enable it
      if (dateRange && dateRange.startDate && dateRange.endDate) {
        setUseDateRange(true);
      } else {
        // Set default date range based on selected month or current month
        let startDate: string;
        let endDate: string;
        
        if (selectedMonth) {
          // Use the currently selected month as the date range
          const firstDay = new Date(selectedMonth.year, selectedMonth.month - 1, 1);
          const lastDay = new Date(selectedMonth.year, selectedMonth.month, 0);
          
          startDate = firstDay.toISOString().split('T')[0];
          endDate = lastDay.toISOString().split('T')[0];
        } else {
          // Fallback to current month
          const now = new Date();
          const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
          const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          
          startDate = firstDay.toISOString().split('T')[0];
          endDate = lastDay.toISOString().split('T')[0];
        }
        
        // Enable date range mode with the date range atomically
        enableDateRangeMode({
          startDate,
          endDate,
        });
      }
    } else {
      // Disable date range mode (but keep the dateRange value in state)
      setUseDateRange(false);
    }
  };

  // Handle start date change
  const handleStartDateChange = (date: string) => {
    // Calculate end date as one month later
    const startDate = new Date(date);
    const endDate = new Date(startDate);
    
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(endDate.getDate() - 1);
    
    const endDateString = endDate.toISOString().split('T')[0];
    
    setDateRange({
      startDate: date,
      endDate: endDateString,
    });
  };

  // Handle end date change
  const handleEndDateChange = (date: string) => {
    setDateRange({
      startDate: dateRange?.startDate || date,
      endDate: date,
    });
  };

  // Calculate recurring transactions when data changes
  useEffect(() => {
    if (income.length > 0 || outgoings.length > 0 || purchases.length > 0) {
      const calc = calculateRecurringTransactions(income, outgoings, purchases);
      
      setRecurringCalc(calc);
    }
  }, [income, outgoings, purchases, setRecurringCalc]);

  // Calculate derived data
  const balanceOverTime = calculateBalanceOverTime(income, outgoings, purchases, 0);
  
  const spendingByCategory = getSpendingByCategory(outgoings, purchases);
  
  const topMerchants = getTopMerchants(outgoings, purchases, 5);

  // Loading state
  if (loading && !stats) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        sx={loadingContainerSx}
      >
        <CircularProgress sx={loadingSpinnerSx} />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box
        sx={pageContainerSx}
      >
        <Alert severity="error" sx={errorAlertSx}>
          {error}
        </Alert>
      </Box>
    );
  }

  // Empty state
  if (!stats || (income.length === 0 && outgoings.length === 0 && purchases.length === 0)) {
    return (
      <Box
        sx={pageContainerSx}
      >
        <Box sx={contentWrapperSx}>
          <Box sx={headerContainerSx}>
            <Box>
              <Typography variant="h4" sx={dashboardTitleSx}>
                Budget Dashboard
              </Typography>

              <Typography variant="body1" sx={dashboardSubtitleSx}>
                Your financial overview at a glance
              </Typography>
            </Box>

            <Box sx={controlsContainerSx}>
              <FormControlLabel
                control={
                  <Switch
                    checked={useDateRange}
                    onChange={(e) => handleDateRangeToggle(e.target.checked)}
                    sx={switchSx}
                  />
                }
                label="Date Range"
                sx={formControlLabelSx}
              />

              {useDateRange && dateRange ? (
                <Box sx={dateRangeContainerSx}>
                  <TextField
                    label="Start Date"
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    InputLabelProps={{
                      shrink: true,
                      sx: inputLabelSx,
                    }}
                    sx={dateTextFieldSx}
                  />

                  <TextField
                    label="End Date"
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    InputLabelProps={{
                      shrink: true,
                      sx: inputLabelSx,
                    }}
                    sx={dateTextFieldSx}
                  />
                </Box>
              ) : (
                availableMonths.length > 0 && selectedMonth && (
                  <FormControl sx={monthSelectFormControlSx}>
                    <InputLabel sx={inputLabelSx}>Select Month</InputLabel>

                    <Select
                      value={`${selectedMonth.year}-${selectedMonth.month}`}
                      onChange={(e) => handleMonthChange(e.target.value)}
                      label="Select Month"
                      sx={monthSelectSx}
                    >
                      {availableMonths.map((month) => (
                        <MenuItem key={`${month.year}-${month.month}`} value={`${month.year}-${month.month}`}>
                          {getMonthName(month.month)} {month.year}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )
              )}
            </Box>
          </Box>

          <Alert severity="info" sx={infoAlertSx}>
            No financial data available. Please upload a bank statement to get started.
          </Alert>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={pageContainerSx}
    >
      <Box sx={contentWrapperSx}>
        <Box sx={headerContainerSx}>
          <Box>
            <Typography variant="h4" sx={dashboardTitleSx}>
              Budget Dashboard
            </Typography>

            <Typography variant="body1" sx={dashboardSubtitleSx}>
              Your financial overview at a glance
            </Typography>
          </Box>

          <Box sx={controlsContainerSx}>
            <FormControlLabel
              control={
                <Switch
                  checked={useDateRange}
                  onChange={(e) => handleDateRangeToggle(e.target.checked)}
                  sx={switchSx}
                />
              }
              label="Date Range"
              sx={formControlLabelSx}
            />

            {useDateRange && dateRange ? (
              <Box sx={dateRangeContainerSx}>
                <TextField
                  label="Start Date"
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                    sx: inputLabelSx,
                  }}
                  sx={dateTextFieldSx}
                />

                <TextField
                  label="End Date"
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                    sx: inputLabelSx,
                  }}
                  sx={dateTextFieldSx}
                />
              </Box>
            ) : (
              availableMonths.length > 0 && selectedMonth && (
                <FormControl sx={monthSelectFormControlSx}>
                  <InputLabel sx={inputLabelSx}>Select Month</InputLabel>

                  <Select
                    value={`${selectedMonth.year}-${selectedMonth.month}`}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    label="Select Month"
                    sx={monthSelectSx}
                  >
                    {availableMonths.map((month) => (
                      <MenuItem key={`${month.year}-${month.month}`} value={`${month.year}-${month.month}`}>
                        {getMonthName(month.month)} {month.year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )
            )}
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <KPICard
              title="Monthly Income"
              value={stats.total_income}
              currencySymbol="£"
              subtitle={`${stats.income_count} transactions`}
              icon={TrendingUp}
              iconColor="#10b981"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <KPICard
              title="Direct Debits"
              value={stats.total_outgoings}
              currencySymbol="£"
              subtitle={`${stats.outgoing_count} transactions`}
              icon={TrendingDown}
              iconColor="#ef4444"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <KPICard
              title="All Other"
              value={stats.total_purchases}
              currencySymbol="£"
              subtitle={`${stats.purchase_count} transactions`}
              icon={ShoppingCart}
              iconColor="#f59e0b"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <KPICard
              title="Net Difference"
              value={stats.net}
              currencySymbol="£"
              subtitle={stats.net >= 0 ? 'Surplus' : 'Deficit'}
              icon={stats.net >= 0 ? Wallet : DollarSign}
              iconColor={stats.net >= 0 ? '#10b981' : '#ef4444'}
            />
          </Grid>

          {recurringCalc && (
            <Grid item xs={12} md={4}>
              <RecurringTransactionsCard data={recurringCalc} />
            </Grid>
          )}

          {balanceOverTime.length > 0 && (
            <Grid item xs={12} md={recurringCalc ? 8 : 12}>
              <BalanceChart 
                data={balanceOverTime} 
                rawTransactions={rawTransactions}
              />
            </Grid>
          )}

          {spendingByCategory.length > 0 && (
            <Grid item xs={12} md={6}>
              <SpendingByCategory data={spendingByCategory} />
            </Grid>
          )}

          {topMerchants.length > 0 && (
            <Grid item xs={12} md={6}>
              <TopMerchants data={topMerchants} />
            </Grid>
          )}

          {rawTransactions.length > 0 && (
            <Grid item xs={12}>
              <TransactionsTable 
                transactions={rawTransactions} 
                onTransactionUpdate={handleTransactionUpdate}
              />
            </Grid>
          )}
        </Grid>

        <Box sx={sectionSpacingSx}>
          <Typography variant="h5" sx={sectionTitleSx}>
            Account Management
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <AccountBalanceCard onBalanceUpdated={handleBalanceUpdated} />
            </Grid>

            <Grid item xs={12} md={4}>
              <OverdraftCard />
            </Grid>

            <Grid item xs={12} md={4}>
              <AvailableSpendCard 
                currentBalance={currentBalance === null ? undefined : currentBalance} 
                upcomingOutgoings={upcomingOutgoings} 
              />
            </Grid>
          </Grid>
        </Box>

        <Box sx={sectionSpacingSx}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <ScheduledOutgoingsTable 
                outgoings={scheduledOutgoings}
                rawTransactions={rawTransactions}
                balanceDayOfMonth={balanceDayOfMonth}
                onOutgoingAdded={handleScheduledOutgoingAdded}
              />
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
};

// Style constants
const loadingContainerSx = {
  backgroundColor: '#0d0f1b',
};

const loadingSpinnerSx = {
  color: '#6366f1',
};

const pageContainerSx = {
  backgroundColor: '#0d0f1b',
  minHeight: '100vh',
  p: 3,
};

const contentWrapperSx = {
  maxWidth: 1400,
  mx: 'auto',
};

const headerContainerSx = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  mb: 4,
};

const dashboardTitleSx = {
  color: '#fff',
  mb: 1,
  fontWeight: 700,
};

const dashboardSubtitleSx = {
  color: '#94a3b8',
};

const errorAlertSx = {
  maxWidth: 600,
  mx: 'auto',
  mt: 4,
};

const infoAlertSx = {
  maxWidth: 600,
};

const sectionSpacingSx = {
  mt: 4,
};

const sectionTitleSx = {
  color: '#fff',
  mb: 3,
  fontWeight: 600,
};

const controlsContainerSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 2,
};

const switchSx = {
  '& .MuiSwitch-switchBase.Mui-checked': {
    color: '#6366f1',
  },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
    backgroundColor: '#6366f1',
  },
};

const formControlLabelSx = {
  color: '#94a3b8',
  m: 0,
};

const dateRangeContainerSx = {
  display: 'flex',
  gap: 2,
};

const inputLabelSx = {
  color: '#94a3b8',
};

const dateTextFieldSx = {
  width: 180,
  '& .MuiOutlinedInput-root': {
    color: '#fff',
    backgroundColor: '#0d0f1b',
    '& fieldset': {
      borderColor: '#334155',
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

const monthSelectFormControlSx = {
  minWidth: 200,
};

const monthSelectSx = {
  color: '#fff',
  backgroundColor: '#0d0f1b',
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: '#334155',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: '#6366f1',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#6366f1',
  },
  '& .MuiSvgIcon-root': {
    color: '#fff',
  },
};

