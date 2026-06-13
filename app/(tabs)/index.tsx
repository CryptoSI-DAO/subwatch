import { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Pressable,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import {
  type Subscription,
  type Category,
  CATEGORIES,
  getCategoryName,
  getCategoryIcon,
  getMonthlyCost,
  getYearlyCost,
  formatCurrency,
} from '@/src/types';

export default function DashboardScreen() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('active', true)
      .order('name');

    if (!error && data) {
      setSubscriptions(data as Subscription[]);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const monthlyTotal = subscriptions.reduce(
    (sum, s) => sum + getMonthlyCost(s.price, s.billing_cycle, s.cycle_days),
    0
  );
  const yearlyTotal = subscriptions.reduce(
    (sum, s) => sum + getYearlyCost(s.price, s.billing_cycle, s.cycle_days),
    0
  );

  // Category breakdown
  const byCategory = CATEGORIES.map((cat) => {
    const items = subscriptions.filter((s) => s.category_id === cat.id);
    const monthly = items.reduce(
      (sum, s) => sum + getMonthlyCost(s.price, s.billing_cycle, s.cycle_days),
      0
    );
    return { ...cat, count: items.length, monthly };
  })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.monthly - a.monthly);

  // Upcoming billing (next 7 days)
  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcoming = subscriptions
    .filter((s) => {
      if (!s.next_billing_date) return false;
      const d = new Date(s.next_billing_date);
      return d >= now && d <= weekLater;
    })
    .sort((a, b) =>
      new Date(a.next_billing_date!).getTime() - new Date(b.next_billing_date!).getTime()
    );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor="#007AFF" />}
    >
      {/* Hero card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Monthly Spend</Text>
        <Text style={styles.heroAmount}>{formatCurrency(monthlyTotal)}</Text>
        <View style={styles.heroRow}>
          <Text style={styles.heroSecondary}>Yearly: {formatCurrency(yearlyTotal)}</Text>
          <Text style={styles.heroCount}>{subscriptions.length} active</Text>
        </View>
      </View>

      {/* Upcoming bills */}
      {upcoming.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Upcoming This Week</Text>
          {upcoming.map((s) => (
            <Pressable
              key={s.id}
              style={styles.upcomingItem}
              onPress={() => router.push(`/subscription/${s.id}`)}
            >
              <Text style={styles.upcomingIcon}>{s.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.upcomingName}>{s.name}</Text>
                <Text style={styles.upcomingDate}>
                  {new Date(s.next_billing_date!).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
              <Text style={styles.upcomingPrice}>{formatCurrency(s.price, s.currency)}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Category breakdown */}
      {byCategory.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 By Category</Text>
          {byCategory.map((cat) => {
            const pct = monthlyTotal > 0 ? (cat.monthly / monthlyTotal) * 100 : 0;
            return (
              <View key={cat.id} style={styles.categoryItem}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryName}>{cat.icon} {cat.name}</Text>
                  <Text style={styles.categoryAmount}>{formatCurrency(cat.monthly)}</Text>
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: '#007AFF' }]} />
                </View>
                <Text style={styles.categoryPct}>{pct.toFixed(0)}% · {cat.count} subs</Text>
              </View>
            );
          })}
        </View>
      )}

      {subscriptions.length === 0 && !loading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>No subscriptions yet</Text>
          <Text style={styles.emptySubtext}>Tap the + tab to add your first one</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 16, gap: 16 },
  heroCard: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 6,
  },
  heroLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '500' },
  heroAmount: { color: '#fff', fontSize: 48, fontWeight: '800', letterSpacing: -1 },
  heroRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  heroSecondary: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  heroCount: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  upcomingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  upcomingIcon: { fontSize: 28 },
  upcomingName: { fontSize: 16, fontWeight: '600', color: '#000' },
  upcomingDate: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  upcomingPrice: { fontSize: 16, fontWeight: '700', color: '#000' },
  categoryItem: { gap: 4 },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  categoryName: { fontSize: 15, fontWeight: '500', color: '#000' },
  categoryAmount: { fontSize: 15, fontWeight: '600', color: '#000' },
  barBg: { height: 6, backgroundColor: '#E5E5EA', borderRadius: 3 },
  barFill: { height: 6, borderRadius: 3 },
  categoryPct: { fontSize: 12, color: '#8E8E93' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#8E8E93' },
  emptySubtext: { fontSize: 14, color: '#C7C7CC' },
});
