// utils/storage.ts
import { Expense, SettledBill, Member } from '../types';

const STORAGE_KEYS = {
  EXPENSES: 'uno_expenses',
  SETTLED_BILLS: 'uno_settled_bills',
  MEMBERS: 'uno_members'
};

export const storage = {
  // Expenses
  saveExpenses: (expenses: Expense[]): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    } catch (error) {
      console.error('Error saving expenses to localStorage:', error);
    }
  },

  loadExpenses: (): Expense[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading expenses from localStorage:', error);
      return [];
    }
  },

  // Settled Bills
  saveSettledBills: (bills: SettledBill[]): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTLED_BILLS, JSON.stringify(bills));
    } catch (error) {
      console.error('Error saving settled bills to localStorage:', error);
    }
  },

  loadSettledBills: (): SettledBill[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTLED_BILLS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading settled bills from localStorage:', error);
      return [];
    }
  },

  // Members
  saveMembers: (members: Member[]): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
    } catch (error) {
      console.error('Error saving members to localStorage:', error);
    }
  },

  loadMembers: (): Member[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MEMBERS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading members from localStorage:', error);
      return [];
    }
  },

  // Clear all data
  clearAll: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEYS.EXPENSES);
      localStorage.removeItem(STORAGE_KEYS.SETTLED_BILLS);
      localStorage.removeItem(STORAGE_KEYS.MEMBERS);
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
};
