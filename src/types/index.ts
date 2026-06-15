export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  price: number;
  currency: string;
  billing_cycle: 'monthly' | 'yearly' | 'custom';
  cycle_days: number;
  category_id: number;
  icon: string;
  color: string;
  next_billing_date: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PriceHistory {
  id: string;
  subscription_id: string;
  old_price: number | null;
  new_price: number;
  changed_at: string;
}

export interface Offer {
  id: string;
  name: string;
  description: string | null;
  category_id: number;
  provider: string;
  normal_price: number;
  offer_price: number;
  currency: string;
  billing_cycle: string;
  referral_url: string | null;
  badge: 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  icon: string;
  color: string;
  is_active: boolean;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  sort_order: number;
}

export const CATEGORIES = [
  { id: 1, name: 'Entertainment', icon: '🎬', sort_order: 1 },
  { id: 2, name: 'Music', icon: '🎵', sort_order: 2 },
  { id: 3, name: 'Cloud Storage', icon: '☁️', sort_order: 3 },
  { id: 4, name: 'News', icon: '📰', sort_order: 4 },
  { id: 5, name: 'Fitness', icon: '💪', sort_order: 5 },
  { id: 6, name: 'Productivity', icon: '⚡', sort_order: 6 },
  { id: 7, name: 'Shopping', icon: '🛒', sort_order: 7 },
  { id: 8, name: 'Communication', icon: '💬', sort_order: 8 },
  { id: 9, name: 'Security', icon: '🔒', sort_order: 9 },
  { id: 10, name: 'Other', icon: '📦', sort_order: 10 },
] as const;

export function getCategoryName(id: number | null): string {
  return CATEGORIES.find((c) => c.id === Number(id))?.name ?? 'Other';
}

export function getCategoryIcon(id: number | null): string {
  return CATEGORIES.find((c) => c.id === Number(id))?.icon ?? '📦';
}

// Calculate monthly cost from billing cycle
export function getMonthlyCost(price: number, cycle: string, cycleDays: number): number {
  if (cycle === 'monthly') return price;
  if (cycle === 'yearly') return price / 12;
  return (price / cycleDays) * 30;
}

export function getYearlyCost(price: number, cycle: string, cycleDays: number): number {
  if (cycle === 'monthly') return price * 12;
  if (cycle === 'yearly') return price;
  return (price / cycleDays) * 365;
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  const symbols: Record<string, string> = { USD: '$', GBP: '£', EUR: '€' };
  const symbol = symbols[currency] ?? '$';
  return `${symbol}${amount.toFixed(2)}`;
}
