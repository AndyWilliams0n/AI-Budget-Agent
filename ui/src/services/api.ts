// API service for backend communication
import axios from 'axios';
import { Outgoing, Income, Purchase, Stats, AvailableMonth } from '../store/budgetStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface RawTransaction {
  id: number;
  transaction_number: string;
  transaction_date: string;
  account: string;
  amount: number;
  subcategory: string;
  override_subcategory?: string;
  memo: string;
  created_at: string;
}

export interface Balance {
  id: number;
  name: string;
  amount: number;
  recorded_at: string;
  created_at: string;
}

export interface Overdraft {
  id: number;
  amount: number;
  recorded_at: string;
  created_at: string;
}

export interface ScheduledOutgoing {
  id: number;
  day_of_month: number;
  amount: number;
  merchant: string;
  memo: string;
  subcategory: string;
  account: string;
}

export const budgetApi = {
  // Get all outgoings
  getOutgoings: async (limit?: number, merchant?: string): Promise<Outgoing[]> => {
    const params = new URLSearchParams();
    
    if (limit) params.append('limit', limit.toString());
    
    if (merchant) params.append('merchant', merchant);
    
    const response = await api.get(`/outgoings?${params.toString()}`);
    
    return response.data;
  },

  // Get all income
  getIncome: async (limit?: number, source?: string): Promise<Income[]> => {
    const params = new URLSearchParams();
    
    if (limit) params.append('limit', limit.toString());
    
    if (source) params.append('source', source);
    
    const response = await api.get(`/income?${params.toString()}`);
    
    return response.data;
  },

  // Get all purchases
  getPurchases: async (limit?: number, merchant?: string): Promise<Purchase[]> => {
    const params = new URLSearchParams();
    
    if (limit) params.append('limit', limit.toString());
    
    if (merchant) params.append('merchant', merchant);
    
    const response = await api.get(`/purchases?${params.toString()}`);
    
    return response.data;
  },

  // Get statistics
  getStats: async (): Promise<Stats> => {
    const response = await api.get('/stats');
    
    return response.data;
  },

  // Upload statement
  uploadStatement: async (file: File, useAiAnalysis: boolean = false) => {
    const formData = new FormData();
    
    formData.append('file', file);
    
    const response = await api.post(`/upload-statement?use_ai_analysis=${useAiAnalysis}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  // Clear all data
  clearData: async () => {
    const response = await api.delete('/clear-data');
    
    return response.data;
  },

  // Get available months
  getAvailableMonths: async (): Promise<AvailableMonth[]> => {
    const response = await api.get('/raw-transactions/available-months');
    
    return response.data;
  },

  // Get raw transactions by month
  getRawTransactionsByMonth: async (year: number, month: number): Promise<RawTransaction[]> => {
    const response = await api.get(`/raw-transactions/month/${year}/${month}`);
    
    return response.data;
  },

  // Get raw transactions by date range
  getRawTransactionsByDateRange: async (startDate: string, endDate: string): Promise<RawTransaction[]> => {
    const params = new URLSearchParams();
    
    params.append('start_date', startDate);
    params.append('end_date', endDate);
    
    const response = await api.get(`/raw-transactions/date-range?${params.toString()}`);
    
    return response.data;
  },

  // Update transaction type override
  updateTransactionType: async (transactionId: number, overrideSubcategory: string): Promise<RawTransaction> => {
    const response = await api.patch(`/raw-transactions/${transactionId}/override-type`, {
      override_subcategory: overrideSubcategory,
    });
    
    return response.data;
  },

  // Get latest balance
  getLatestBalance: async (): Promise<Balance | null> => {
    const response = await api.get('/balance/latest');
    
    return response.data;
  },

  // Add balance
  addBalance: async (data: { name: string; amount: number; recorded_at: string }): Promise<Balance> => {
    const response = await api.post('/balance', data);
    
    return response.data;
  },

  // Get latest overdraft
  getLatestOverdraft: async (): Promise<Overdraft | null> => {
    const response = await api.get('/overdraft/latest');
    
    return response.data;
  },

  // Add overdraft
  addOverdraft: async (data: { amount: number; recorded_at?: string }): Promise<Overdraft> => {
    const response = await api.post('/overdraft', data);
    
    return response.data;
  },

  // Get all scheduled outgoings
  getScheduledOutgoings: async (): Promise<ScheduledOutgoing[]> => {
    const response = await api.get('/outgoings');
    
    return response.data;
  },

  // Add a scheduled outgoing
  addScheduledOutgoing: async (data: { 
    day_of_month: number; 
    amount: number; 
    merchant: string; 
    memo?: string;
    subcategory?: string;
    account?: string;
  }): Promise<ScheduledOutgoing> => {
    const response = await api.post('/outgoings', data);
    
    return response.data;
  },

  // Update a scheduled outgoing
  updateScheduledOutgoing: async (
    outgoingId: number, 
    data: { day_of_month?: number; amount?: number; merchant?: string }
  ): Promise<ScheduledOutgoing> => {
    const response = await api.patch(`/outgoings/${outgoingId}`, data);
    
    return response.data;
  },

  // Delete a scheduled outgoing
  deleteScheduledOutgoing: async (outgoingId: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/outgoings/${outgoingId}`);
    
    return response.data;
  },

  // Remove duplicate outgoings
  removeDuplicateOutgoings: async (): Promise<{ removed: ScheduledOutgoing[]; count: number; message: string }> => {
    const response = await api.post('/outgoings/remove-duplicates');
    
    return response.data;
  },
};


