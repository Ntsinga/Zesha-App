import { BalanceRecord, Transaction, AccountSummary } from './types';

export const MOCK_ACCOUNTS: AccountSummary[] = [
  { name: 'WIN', balance: 0, lastAmount: 0, pictureUrl: 'https://picsum.photos/40/40?random=1' },
  { name: 'AURTEZ', balance: 0, lastAmount: 0, pictureUrl: 'https://picsum.photos/40/40?random=2' },
  { name: 'OTHER', balance: 0, lastAmount: 0, pictureUrl: 'https://picsum.photos/40/40?random=3' },
];

export const MOCK_HISTORY: BalanceRecord[] = [
  { id: '1', date: '2023-11-20', totalCash: 15000, amount: 5000, capital: 50000, status: 'Balanced' },
  { id: '2', date: '2023-11-15', totalCash: 14500, amount: 2000, capital: 50000, status: 'Pending' },
  { id: '3', date: '2023-11-10', totalCash: 16000, amount: 3500, capital: 50000, status: 'Balanced' },
  { id: '4', date: '2023-11-05', totalCash: 15500, amount: 1000, capital: 50000, status: 'Balanced' },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', date: '2024-07-25', description: 'Coffee Shop', category: 'Food', amount: -5.50, type: 'expense', hasReceipt: true, account: 'AURTEZ' },
  { id: '2', date: '2024-07-24', description: 'Salary Deposit', category: 'Income', amount: 1200.00, type: 'income', hasReceipt: false, account: 'AURTEZ' },
  { id: '3', date: '2024-07-23', description: 'Online Course', category: 'Education', amount: -99.99, type: 'expense', hasReceipt: true, account: 'OTHER' },
  { id: '4', date: '2024-07-22', description: 'Rent Payment', category: 'Housing', amount: -150.00, type: 'expense', hasReceipt: false, account: 'WIN' },
];

export const MOCK_EXPENSES: Transaction[] = [
  { id: '10', date: '2024-07-25', description: 'Rent', category: 'Rent', amount: -120.00, type: 'expense', hasReceipt: false, account: 'WIN' },
  { id: '11', date: '2024-07-25', description: 'Rent', category: 'Rent', amount: -150.00, type: 'expense', hasReceipt: false, account: 'WIN' },
  { id: '12', date: '2024-07-24', description: 'Utilities', category: 'Utilities', amount: -150.00, type: 'expense', hasReceipt: false, account: 'WIN' },
  { id: '13', date: '2024-07-23', description: 'Groceries', category: 'Food', amount: -300.00, type: 'expense', hasReceipt: false, account: 'WIN' },
  { id: '14', date: '2024-07-22', description: 'Transport', category: 'Travel', amount: -80.00, type: 'expense', hasReceipt: false, account: 'WIN' },
];