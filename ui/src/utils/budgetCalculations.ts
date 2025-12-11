// Budget calculation utilities for recurring transactions
import { parseISO, isSameDay, addMonths, differenceInDays, startOfMonth } from 'date-fns';
import { Income, Outgoing, Purchase, RecurringCalculation } from '../store/budgetStore';

// Calculate monthly summary from actual data
export const calculateRecurringTransactions = (
  income: Income[],
  outgoings: Outgoing[],
  purchases: Purchase[]
): RecurringCalculation => {
  // Find the biggest income transaction (salary)
  const sortedIncome = [...income].sort((a, b) => b.amount - a.amount);
  
  const biggestIncome = sortedIncome[0];

  if (!biggestIncome) {
    return {
      nextIncomeDate: null,
      totalMonthlyIncome: 0,
      totalMonthlyOutgoings: 0,
      totalMonthlyPurchases: 0,
      projectedBalance: 0,
      savingsPerMonth: 0,
    };
  }

  const incomeDate = parseISO(biggestIncome.transaction_date);

  // Calculate monthly totals from actual monthly data
  const totalMonthlyIncome = income.reduce((sum, t) => sum + t.amount, 0);
  
  const totalMonthlyOutgoings = outgoings.reduce((sum, t) => sum + t.amount, 0);
  
  const totalMonthlyPurchases = purchases.reduce((sum, t) => sum + t.amount, 0);

  // Calculate next income date (same day next month)
  const today = new Date();
  
  let nextIncomeDate = new Date(incomeDate);
  
  while (nextIncomeDate <= today) {
    nextIncomeDate = addMonths(nextIncomeDate, 1);
  }

  // Calculate projected balance after all expenses
  const totalExpenses = totalMonthlyOutgoings + totalMonthlyPurchases;
  
  const projectedBalance = totalMonthlyIncome - totalExpenses;
  
  const savingsPerMonth = projectedBalance;

  return {
    nextIncomeDate,
    totalMonthlyIncome,
    totalMonthlyOutgoings,
    totalMonthlyPurchases,
    projectedBalance,
    savingsPerMonth,
  };
};

// Identify recurring transactions by analyzing patterns
const identifyRecurringTransactions = (
  transactions: (Income | Outgoing | Purchase)[],
  type: 'income' | 'outgoing' | 'purchase'
): RecurringTransaction[] => {
  if (transactions.length === 0) return [];

  // Group transactions by approximate day of month
  const groupedByDay: Map<number, (Income | Outgoing | Purchase)[]> = new Map();

  transactions.forEach((transaction) => {
    const date = parseISO(transaction.transaction_date);
    
    const dayOfMonth = date.getDate();

    if (!groupedByDay.has(dayOfMonth)) {
      groupedByDay.set(dayOfMonth, []);
    }
    
    groupedByDay.get(dayOfMonth)!.push(transaction);
  });

  // Identify recurring patterns (transactions that happen multiple times on same day)
  const recurring: RecurringTransaction[] = [];

  groupedByDay.forEach((transactionGroup, day) => {
    if (transactionGroup.length >= 2) {
      // Calculate average amount for this recurring transaction
      const avgAmount = transactionGroup.reduce((sum, t) => sum + t.amount, 0) / transactionGroup.length;
      
      const description = getTransactionDescription(transactionGroup[0], type);

      recurring.push({
        amount: avgAmount,
        dayOfMonth: day,
        description,
        type,
      });
    }
  });

  // If no recurring patterns found, use all transactions as potential recurring
  if (recurring.length === 0 && transactions.length > 0) {
    transactions.forEach((transaction) => {
      const date = parseISO(transaction.transaction_date);
      
      recurring.push({
        amount: transaction.amount,
        dayOfMonth: date.getDate(),
        description: getTransactionDescription(transaction, type),
        type,
      });
    });
  }

  return recurring;
};

// Get description from transaction
const getTransactionDescription = (
  transaction: Income | Outgoing | Purchase,
  type: 'income' | 'outgoing' | 'purchase'
): string => {
  if (type === 'income') {
    return (transaction as Income).source || transaction.memo || 'Income';
  }
  
  if (type === 'outgoing' || type === 'purchase') {
    return (transaction as Outgoing).merchant || transaction.memo || 'Expense';
  }
  
  return 'Transaction';
};

// Calculate balance over time
export const calculateBalanceOverTime = (
  income: Income[],
  outgoings: Outgoing[],
  purchases: Purchase[],
  startingBalance: number = 0
): { date: string; balance: number }[] => {
  // Combine all transactions - income adds to balance, expenses subtract
  const allTransactions = [
    ...income.map((t) => ({ ...t, type: 'income' as const, amount: t.amount })),
    ...outgoings.map((t) => ({ ...t, type: 'outgoing' as const, amount: -t.amount })),
    ...purchases.map((t) => ({ ...t, type: 'purchase' as const, amount: -t.amount })),
  ];

  // Sort by date
  allTransactions.sort((a, b) => 
    parseISO(a.transaction_date).getTime() - parseISO(b.transaction_date).getTime()
  );

  // Calculate running balance
  const balanceOverTime: { date: string; balance: number }[] = [];
  
  let currentBalance = startingBalance;

  allTransactions.forEach((transaction) => {
    currentBalance += transaction.amount;
    
    balanceOverTime.push({
      date: transaction.transaction_date,
      balance: currentBalance,
    });
  });

  return balanceOverTime;
};

// Get spending by category
export const getSpendingByCategory = (
  outgoings: Outgoing[],
  purchases: Purchase[]
): { name: string; value: number }[] => {
  const categoryMap = new Map<string, number>();

  outgoings.forEach((outgoing) => {
    const category = outgoing.subcategory || 'Other';
    
    categoryMap.set(category, (categoryMap.get(category) || 0) + outgoing.amount);
  });

  purchases.forEach((purchase) => {
    const category = purchase.subcategory || 'Purchases';
    
    categoryMap.set(category, (categoryMap.get(category) || 0) + purchase.amount);
  });

  return Array.from(categoryMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

// Get top merchants by spending
export const getTopMerchants = (
  outgoings: Outgoing[],
  purchases: Purchase[],
  limit: number = 5
): { name: string; amount: number; count: number; subcategory: string }[] => {
  const merchantMap = new Map<string, { amount: number; count: number; subcategory: string }>();

  [...outgoings, ...purchases].forEach((transaction) => {
    const merchant = transaction.merchant || 'Unknown';
    const subcategory = transaction.subcategory || 'Other';
    
    const existing = merchantMap.get(merchant) || { amount: 0, count: 0, subcategory };
    
    merchantMap.set(merchant, {
      amount: existing.amount + transaction.amount,
      count: existing.count + 1,
      subcategory: existing.subcategory || subcategory,
    });
  });

  return Array.from(merchantMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
};

// Calculate savings potential from last large income to next large income
// This gives a more realistic view of actual savings capability
export const calculatePayPeriodSavings = (
  income: Income[],
  directDebits: DirectDebit[] = [],
  billPayments: BillPayment[] = [],
  cardPayments: CardPayment[] = []
): { savingsAmount: number; fromDate: Date | null; toDate: Date | null } => {
  // Find the two most recent large income transactions (likely salaries)
  const sortedIncome = [...income]
    .filter(i => i.amount >= 1000) // Filter for significant income
    .sort((a, b) => parseISO(b.transaction_date).getTime() - parseISO(a.transaction_date).getTime());

  if (sortedIncome.length < 2) {
    return {
      savingsAmount: 0,
      fromDate: null,
      toDate: null,
    };
  }

  const mostRecentIncome = sortedIncome[0];
  const previousIncome = sortedIncome[1];

  const fromDate = parseISO(previousIncome.transaction_date);
  const toDate = parseISO(mostRecentIncome.transaction_date);

  // Calculate total income in this period
  const periodIncome = income
    .filter(i => {
      const date = parseISO(i.transaction_date);
      return isAfter(date, fromDate) && (isBefore(date, toDate) || isSameDay(date, toDate));
    })
    .reduce((sum, i) => sum + i.amount, 0);

  // Calculate total expenses in this period
  const periodDirectDebits = directDebits
    .filter(d => {
      const date = parseISO(d.transaction_date);
      return isAfter(date, fromDate) && (isBefore(date, toDate) || isSameDay(date, toDate));
    })
    .reduce((sum, d) => sum + d.amount, 0);

  const periodBillPayments = billPayments
    .filter(b => {
      const date = parseISO(b.transaction_date);
      return isAfter(date, fromDate) && (isBefore(date, toDate) || isSameDay(date, toDate));
    })
    .reduce((sum, b) => sum + b.amount, 0);

  const periodCardPayments = cardPayments
    .filter(c => {
      const date = parseISO(c.transaction_date);
      return isAfter(date, fromDate) && (isBefore(date, toDate) || isSameDay(date, toDate));
    })
    .reduce((sum, c) => sum + c.amount, 0);

  const totalExpenses = periodDirectDebits + periodBillPayments + periodCardPayments;
  const savingsAmount = periodIncome - totalExpenses;

  return {
    savingsAmount,
    fromDate,
    toDate,
  };
};


