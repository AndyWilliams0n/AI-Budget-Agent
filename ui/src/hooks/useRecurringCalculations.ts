// Custom hook for recurring transaction calculations
import { useMemo } from 'react';
import { useBudgetStore } from '../store/budgetStore';
import { calculateRecurringTransactions } from '../utils/budgetCalculations';

export const useRecurringCalculations = () => {
  const { income, outgoings, purchases } = useBudgetStore();

  const recurringCalc = useMemo(() => {
    return calculateRecurringTransactions(income, outgoings, purchases);
  }, [income, outgoings, purchases]);

  return recurringCalc;
};


