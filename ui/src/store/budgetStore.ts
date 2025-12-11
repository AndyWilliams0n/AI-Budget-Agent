// Zustand store for budget data management
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { RawTransaction, ScheduledOutgoing } from '../services/api';

export interface Transaction {
  id: number;
  transaction_date: string;
  amount: number;
  memo?: string;
  subcategory?: string;
  account?: string;
}

export interface Outgoing extends Transaction {
  merchant?: string;
}

export interface Income extends Transaction {
  source?: string;
}

export interface Purchase extends Transaction {
  merchant?: string;
}

export interface Stats {
  total_outgoings: number;
  total_purchases: number;
  total_expenses: number;
  total_income: number;
  net: number;
  outgoing_count: number;
  purchase_count: number;
  income_count: number;
}

export interface RecurringCalculation {
  nextIncomeDate: Date | null;
  totalMonthlyIncome: number;
  totalMonthlyOutgoings: number;
  totalMonthlyPurchases: number;
  projectedBalance: number;
  savingsPerMonth: number;
}

export interface AvailableMonth {
  year: number;
  month: number;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

interface BudgetState {
  outgoings: Outgoing[];
  income: Income[];
  purchases: Purchase[];
  rawTransactions: RawTransaction[];
  scheduledOutgoings: ScheduledOutgoing[];
  stats: Stats | null;
  recurringCalc: RecurringCalculation | null;
  loading: boolean;
  error: string | null;
  selectedMonth: AvailableMonth | null;
  availableMonths: AvailableMonth[];
  useDateRange: boolean;
  dateRange: DateRange | null;
  
  setOutgoings: (outgoings: Outgoing[]) => void;
  setIncome: (income: Income[]) => void;
  setPurchases: (purchases: Purchase[]) => void;
  setRawTransactions: (rawTransactions: RawTransaction[]) => void;
  setScheduledOutgoings: (scheduledOutgoings: ScheduledOutgoing[]) => void;
  setStats: (stats: Stats) => void;
  setRecurringCalc: (calc: RecurringCalculation) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedMonth: (month: AvailableMonth | null) => void;
  setAvailableMonths: (months: AvailableMonth[]) => void;
  setUseDateRange: (useDateRange: boolean) => void;
  setDateRange: (dateRange: DateRange | null) => void;
  enableDateRangeMode: (dateRange: DateRange) => void;
  reset: () => void;
}

const initialState = {
  outgoings: [],
  income: [],
  purchases: [],
  rawTransactions: [],
  scheduledOutgoings: [],
  stats: null,
  recurringCalc: null,
  loading: false,
  error: null,
  selectedMonth: null,
  availableMonths: [],
  useDateRange: false,
  dateRange: null,
};

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set) => ({
      ...initialState,
      
      setOutgoings: (outgoings) => set({ outgoings }),
      
      setIncome: (income) => set({ income }),
      
      setPurchases: (purchases) => set({ purchases }),
      
      setRawTransactions: (rawTransactions) => set({ rawTransactions }),
      
      setScheduledOutgoings: (scheduledOutgoings) => set({ scheduledOutgoings }),
      
      setStats: (stats) => set({ stats }),
      
      setRecurringCalc: (calc) => set({ recurringCalc: calc }),
      
      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),
      
      setSelectedMonth: (selectedMonth) => set({ selectedMonth }),
      
      setAvailableMonths: (availableMonths) => set({ availableMonths }),
      
      setUseDateRange: (useDateRange) => set({ useDateRange }),
      
      setDateRange: (dateRange) => set({ dateRange }),
      
      enableDateRangeMode: (dateRange: DateRange) => set({ useDateRange: true, dateRange }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'budget-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedMonth: state.selectedMonth,
        useDateRange: state.useDateRange,
        dateRange: state.dateRange,
      }),
    }
  )
);


