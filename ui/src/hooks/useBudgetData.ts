// Custom hook for fetching and managing budget data
import { useEffect, useCallback } from 'react';
import { useBudgetStore } from '../store/budgetStore';
import { budgetApi, RawTransaction } from '../services/api';

// Helper function to categorize raw transactions
const categorizeRawTransactions = (transactions: RawTransaction[]) => {
  const outgoings: any[] = [];
  const income: any[] = [];
  const purchases: any[] = [];

  transactions.forEach((transaction) => {
    // Use override_subcategory if present, otherwise use original subcategory
    const effectiveSubcategory = transaction.override_subcategory || transaction.subcategory;
    const subcategory = effectiveSubcategory?.toLowerCase() || '';
    const amount = transaction.amount; // Backend stores as positive, use subcategory to determine type
    
    const baseData = {
      id: transaction.id,
      transaction_date: transaction.transaction_date,
      amount,
      memo: transaction.memo,
      subcategory: effectiveSubcategory,
      account: transaction.account,
    };

    // Counter Credit = Income (backend already stores as positive)
    if (subcategory.includes('counter credit')) {
      income.push({
        ...baseData,
        source: transaction.memo,
      });
    }
    // Direct Debits, Bill Payments, Standing Orders, Recurring Monthly Payment, Credit Payment = Outgoings
    else if (subcategory.includes('direct debit') || subcategory.includes('bill payment') || subcategory.includes('standing order') || subcategory.includes('recurring monthly payment') || subcategory.includes('credit payment')) {
      outgoings.push({
        ...baseData,
        merchant: transaction.memo,
      });
    }
    // Card Purchases and Debits = Purchases
    else if (subcategory.includes('card purchase') || subcategory.includes('debit')) {
      purchases.push({
        ...baseData,
        merchant: transaction.memo,
      });
    }
  });

  return { outgoings, income, purchases };
};

export const useBudgetData = () => {
  const {
    outgoings,
    income,
    purchases,
    rawTransactions,
    stats,
    loading,
    error,
    selectedMonth,
    availableMonths,
    useDateRange,
    dateRange,
    setOutgoings,
    setIncome,
    setPurchases,
    setRawTransactions,
    setStats,
    setLoading,
    setError,
    setSelectedMonth,
    setAvailableMonths,
    setUseDateRange,
    setDateRange,
    enableDateRangeMode,
  } = useBudgetStore();

  // Fetch available months
  const fetchAvailableMonths = useCallback(async () => {
    try {
      const months = await budgetApi.getAvailableMonths();
      
      setAvailableMonths(months);
      
      // Set default to last month if not already set
      if (!selectedMonth && months.length > 0) {
        setSelectedMonth(months[0]);
      }
      
      return months;
    } catch (err) {
      console.error('Error fetching available months:', err);
      
      return [];
    }
  }, [setAvailableMonths, selectedMonth, setSelectedMonth]);

  // Fetch data by month from raw transactions
  const fetchDataByMonth = useCallback(async (year: number, month: number) => {
    setLoading(true);
    setError(null);

    try {
      const rawTransactions = await budgetApi.getRawTransactionsByMonth(year, month);
      
      const { outgoings: outgoingsData, income: incomeData, purchases: purchasesData } = categorizeRawTransactions(rawTransactions);

      setRawTransactions(rawTransactions);
      setOutgoings(outgoingsData);
      setIncome(incomeData);
      setPurchases(purchasesData);

      // Calculate stats
      const totalOutgoings = outgoingsData.reduce((sum, o) => sum + o.amount, 0);
      const totalIncome = incomeData.reduce((sum, i) => sum + i.amount, 0);
      const totalPurchases = purchasesData.reduce((sum, p) => sum + p.amount, 0);
      const totalExpenses = totalOutgoings + totalPurchases;

      setStats({
        total_outgoings: totalOutgoings,
        total_purchases: totalPurchases,
        total_expenses: totalExpenses,
        total_income: totalIncome,
        net: totalIncome - totalExpenses,
        outgoing_count: outgoingsData.length,
        purchase_count: purchasesData.length,
        income_count: incomeData.length,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch budget data';
      
      setError(errorMessage);
      
      console.error('Error fetching budget data by month:', err);
    } finally {
      setLoading(false);
    }
  }, [setOutgoings, setIncome, setPurchases, setStats, setLoading, setError, setRawTransactions]);

  // Fetch data by date range from raw transactions
  const fetchDataByDateRange = useCallback(async (startDate: string, endDate: string) => {
    setLoading(true);
    setError(null);

    try {
      const rawTransactions = await budgetApi.getRawTransactionsByDateRange(startDate, endDate);
      
      const { outgoings: outgoingsData, income: incomeData, purchases: purchasesData } = categorizeRawTransactions(rawTransactions);

      setRawTransactions(rawTransactions);
      setOutgoings(outgoingsData);
      setIncome(incomeData);
      setPurchases(purchasesData);

      // Calculate stats
      const totalOutgoings = outgoingsData.reduce((sum, o) => sum + o.amount, 0);
      const totalIncome = incomeData.reduce((sum, i) => sum + i.amount, 0);
      const totalPurchases = purchasesData.reduce((sum, p) => sum + p.amount, 0);
      const totalExpenses = totalOutgoings + totalPurchases;

      setStats({
        total_outgoings: totalOutgoings,
        total_purchases: totalPurchases,
        total_expenses: totalExpenses,
        total_income: totalIncome,
        net: totalIncome - totalExpenses,
        outgoing_count: outgoingsData.length,
        purchase_count: purchasesData.length,
        income_count: incomeData.length,
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch budget data';
      
      setError(errorMessage);
      
      console.error('Error fetching budget data by date range:', err);
    } finally {
      setLoading(false);
    }
  }, [setOutgoings, setIncome, setPurchases, setStats, setLoading, setError, setRawTransactions]);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [outgoingsData, incomeData, purchasesData, statsData] = await Promise.all([
        budgetApi.getOutgoings(),
        budgetApi.getIncome(),
        budgetApi.getPurchases(),
        budgetApi.getStats(),
      ]);

      setOutgoings(outgoingsData);
      setIncome(incomeData);
      setPurchases(purchasesData);
      setStats(statsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch budget data';
      
      setError(errorMessage);
      
      console.error('Error fetching budget data:', err);
    } finally {
      setLoading(false);
    }
  }, [setOutgoings, setIncome, setPurchases, setStats, setLoading, setError]);

  // Fetch outgoings only
  const fetchOutgoings = useCallback(async (limit?: number, merchant?: string) => {
    try {
      const data = await budgetApi.getOutgoings(limit, merchant);
      
      setOutgoings(data);
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch outgoings';
      
      setError(errorMessage);
      
      throw err;
    }
  }, [setOutgoings, setError]);

  // Fetch income only
  const fetchIncome = useCallback(async (limit?: number, source?: string) => {
    try {
      const data = await budgetApi.getIncome(limit, source);
      
      setIncome(data);
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch income';
      
      setError(errorMessage);
      
      throw err;
    }
  }, [setIncome, setError]);

  // Fetch purchases only
  const fetchPurchases = useCallback(async (limit?: number, merchant?: string) => {
    try {
      const data = await budgetApi.getPurchases(limit, merchant);
      
      setPurchases(data);
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch purchases';
      
      setError(errorMessage);
      
      throw err;
    }
  }, [setPurchases, setError]);

  // Fetch stats only
  const fetchStats = useCallback(async () => {
    try {
      const data = await budgetApi.getStats();
      
      setStats(data);
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stats';
      
      setError(errorMessage);
      
      throw err;
    }
  }, [setStats, setError]);

  // Initial data fetch - fetch available months on mount
  useEffect(() => {
    fetchAvailableMonths();
  }, [fetchAvailableMonths]);

  // Fetch data when selected month changes
  useEffect(() => {
    if (!useDateRange && selectedMonth) {
      fetchDataByMonth(selectedMonth.year, selectedMonth.month);
    }
  }, [selectedMonth?.year, selectedMonth?.month, useDateRange, fetchDataByMonth]);

  // Fetch data when date range changes
  useEffect(() => {
    if (useDateRange && dateRange && dateRange.startDate && dateRange.endDate) {
      fetchDataByDateRange(dateRange.startDate, dateRange.endDate);
    }
  }, [useDateRange, dateRange?.startDate, dateRange?.endDate, fetchDataByDateRange]);

  return {
    outgoings,
    income,
    purchases,
    rawTransactions,
    stats,
    loading,
    error,
    availableMonths,
    fetchAllData,
    fetchDataByMonth,
    fetchDataByDateRange,
    fetchAvailableMonths,
    fetchOutgoings,
    fetchIncome,
    fetchPurchases,
    fetchStats,
  };
};


