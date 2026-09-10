export const API_BASE_URL = 'https://biz-strives-api.onrender.com'

export const COLORS = {
  primary: '#EC4899',
  primaryLight: '#FDF2F8',
  accent: '#84CC16',
  danger: '#EF4444',
  warning: '#F59E0B',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#1E293B',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  muted: '#94A3B8',
}

export const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
]

export const TEMPLATE_TYPES = [
  { value: 'monthly_statement', label: 'Monthly Statement' },
  { value: 'birthday_greeting', label: 'Birthday Greeting' },
  { value: 'savings_reminder', label: 'Savings Reminder' },
]

export const DEFAULT_TEMPLATES = {
  monthly_statement: {
    name: 'Monthly Statement',
    subject: '{brand} - Your {month} Statement',
    body: 'Dear {name},\n\nHere is your {month} statement from {brand}.\n\nTotal Received: {total_received}\nTotal Spent: {total_spent}\nTotal Saved: {total_saved}\nNet Cash Flow: {net_cash}\n\nThank you for your business!',
  },
  birthday_greeting: {
    name: 'Birthday Greeting',
    subject: 'Happy Birthday {name}! 🎂',
    body: 'Dear {name},\n\nFrom all of us at {brand}, we wish you a very happy birthday!\n\nThank you for being a valued customer.\n\nBest wishes!',
  },
  savings_reminder: {
    name: 'Savings Reminder',
    subject: '{brand} - Weekly Savings Reminder',
    body: 'Dear {name},\n\nThis is a friendly reminder about your savings goals with {brand}.\n\nKeep saving, keep growing!\n\nBest regards.',
  },
}
