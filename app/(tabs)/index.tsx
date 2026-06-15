import { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Pressable,
  TextInput,
  Image,
  ImageBackground,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useTheme } from '@/src/lib/theme';
import {
  type Subscription,
  type PriceHistory,
  type Category,
  CATEGORIES,
  getCategoryName,
  getCategoryIcon,
  getMonthlyCost,
  getYearlyCost,
  formatCurrency,
} from '@/src/types';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<{ sub: Subscription; change: PriceHistory }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const [subsRes, alertsRes] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('active', true)
        .order('name'),
      // Fetch recent price increases (last 90 days)
      supabase
        .from('price_history')
        .select(`
          *,
          subscription:subscriptions!inner(*)
        `)
        .not('old_price', 'is', null)
        .gt('new_price', '0')
        .order('changed_at', { ascending: false })
        .limit(20),
    ]);

    if (!subsRes.error && subsRes.data) {
      setSubscriptions(subsRes.data as Subscription[]);
    }

    // Filter for actual price increases (new > old)
    if (!alertsRes.error && alertsRes.data) {
      const subMap = new Map((subsRes.data || []).map((s: any) => [s.id, s]));
      const increases = alertsRes.data
        .filter((h: any) => h.old_price !== null && Number(h.new_price) > Number(h.old_price))
        .filter((h: any) => subMap.has(h.subscription_id))
        .map((h: any) => ({
          sub: subMap.get(h.subscription_id),
          change: { id: h.id, subscription_id: h.subscription_id, old_price: h.old_price, new_price: h.new_price, changed_at: h.changed_at },
        }))
        // Deduplicate by subscription_id (keep most recent)
        .filter((item: any, idx: number, arr: any[]) =>
          arr.findIndex((x: any) => x.sub.id === item.sub.id) === idx
        );
      setPriceAlerts(increases);
    }

    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Filter subscriptions based on search and filter
  const filteredSubscriptions = subscriptions.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      selectedFilter === 'all' ||
      (selectedFilter === 'active' && s.active) ||
      (selectedFilter === 'inactive' && !s.active);
    return matchesSearch && matchesFilter;
  });

  const monthlyTotal = filteredSubscriptions.reduce(
    (sum, s) => sum + getMonthlyCost(s.price, s.billing_cycle, s.cycle_days),
    0
  );
  const yearlyTotal = filteredSubscriptions.reduce(
    (sum, s) => sum + getYearlyCost(s.price, s.billing_cycle, s.cycle_days),
    0
  );

  // Category breakdown
  const byCategory = CATEGORIES.map((cat) => {
    const items = filteredSubscriptions.filter((s) => Number(s.category_id) === cat.id);
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
  const upcoming = filteredSubscriptions
    .filter((s) => {
      if (!s.next_billing_date) return false;
      const d = new Date(s.next_billing_date);
      return d >= now && d <= weekLater;
    })
    .sort((a, b) =>
      new Date(a.next_billing_date!).getTime() - new Date(b.next_billing_date!).getTime()
    );

  // Upcoming billing (next 30 days) for the new section
  const monthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const upcomingMonth = filteredSubscriptions
    .filter((s) => {
      if (!s.next_billing_date) return false;
      const d = new Date(s.next_billing_date);
      return d >= now && d <= monthLater;
    })
    .sort((a, b) =>
      new Date(a.next_billing_date!).getTime() - new Date(b.next_billing_date!).getTime()
    );

  const upcomingMonthTotal = upcomingMonth.reduce(
    (sum, s) => sum + getMonthlyCost(s.price, s.billing_cycle, s.cycle_days),
    0
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={colors.primary} />}
    >
      {/* Hero card */}
      <ImageBackground
        source={require('@/assets/illustrations/hero-bg.png')}
        style={styles.heroCard}
        imageStyle={styles.heroImage}
      >
        <Text style={styles.heroLabel}>Monthly Spend</Text>
        <Text style={styles.heroAmount}>{formatCurrency(monthlyTotal)}</Text>
        <View style={styles.heroRow}>
          <Text style={styles.heroSecondary}>Yearly: {formatCurrency(yearlyTotal)}</Text>
          <Text style={styles.heroCount}>{filteredSubscriptions.length} active</Text>
        </View>
      </ImageBackground>

      {/* Price change alerts */}
      {priceAlerts.length > 0 && (
        <View style={[styles.alertCard, { backgroundColor: colors.surface }]}>
          <View style={styles.alertHeader}>
            <Text style={[styles.alertTitle, { color: colors.text }]}>⚠️ Price Increases</Text>
            <Text style={[styles.alertCount, { color: '#FF3B30' }]}>{priceAlerts.length}</Text>
          </View>
          {priceAlerts.map(({ sub, change }) => {
            const diff = Number(change.new_price) - Number(change.old_price);
            const pct = change.old_price ? (diff / Number(change.old_price)) * 100 : 0;
            const yearlyImpact = getYearlyCost(diff, sub.billing_cycle, sub.cycle_days);
            return (
              <Pressable
                key={change.id}
                style={[styles.alertItem, { borderBottomColor: colors.separator }]}
                onPress={() => router.push(`/subscription/${sub.id}`)}
              >
                <Text style={styles.alertIcon}>{sub.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.alertName, { color: colors.text }]}>{sub.name}</Text>
                  <Text style={[styles.alertChange, { color: '#FF3B30' }]}>
                    {formatCurrency(Number(change.old_price), sub.currency)} → {formatCurrency(Number(change.new_price), sub.currency)}
                    {' '}({pct > 0 ? '+' : ''}{pct.toFixed(0)}%)
                  </Text>
                </View>
                <View style={styles.alertImpact}>
                  <Text style={[styles.alertImpactAmt, { color: '#FF3B30' }]}>
                    +{formatCurrency(yearlyImpact, sub.currency)}
                  </Text>
                  <Text style={[styles.alertImpactLabel, { color: colors.textSecondary }]}>per year</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Search bar */}
      <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search subscriptions..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Text style={[styles.clearBtn, { color: colors.textSecondary }]}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {(['all', 'active', 'inactive'] as const).map((f) => (
          <Pressable
            key={f}
            style={[
              styles.filterChip,
              { borderColor: colors.border },
              selectedFilter === f && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setSelectedFilter(f)}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: selectedFilter === f ? '#fff' : colors.textSecondary },
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Upcoming this week */}
      {upcoming.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📅 Due This Week</Text>
          {upcoming.map((s) => (
            <Pressable
              key={s.id}
              style={[styles.upcomingItem, { borderBottomColor: colors.separator }]}
              onPress={() => router.push(`/subscription/${s.id}`)}
            >
              <Text style={styles.upcomingIcon}>{s.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.upcomingName, { color: colors.text }]}>{s.name}</Text>
                <Text style={[styles.upcomingDate, { color: colors.textSecondary }]}>
                  {new Date(s.next_billing_date!).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
              <Text style={[styles.upcomingPrice, { color: colors.text }]}>{formatCurrency(s.price, s.currency)}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Upcoming this month summary */}
      {upcomingMonth.length > 0 && (
        <View style={[styles.monthCard, { backgroundColor: colors.surface }]}>
          <View style={styles.monthRow}>
            <Text style={[styles.monthLabel, { color: colors.text }]}>💸 Due This Month</Text>
            <Text style={[styles.monthAmount, { color: colors.primary }]}>{formatCurrency(upcomingMonthTotal)}</Text>
          </View>
          <Text style={[styles.monthSub, { color: colors.textSecondary }]}>
            {upcomingMonth.length} subscription{upcomingMonth.length !== 1 ? 's' : ''} billing in the next 30 days
          </Text>
        </View>
      )}

      {/* Category breakdown */}
      {byCategory.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📊 By Category</Text>
          {byCategory.map((cat) => {
            const pct = monthlyTotal > 0 ? (cat.monthly / monthlyTotal) * 100 : 0;
            return (
              <View key={cat.id} style={styles.categoryItem}>
                <View style={styles.categoryHeader}>
                  <Text style={[styles.categoryName, { color: colors.text }]}>{cat.icon} {cat.name}</Text>
                  <Text style={[styles.categoryAmount, { color: colors.text }]}>{formatCurrency(cat.monthly)}</Text>
                </View>
                <View style={[styles.barBg, { backgroundColor: colors.barBg }]}>
                  <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
                </View>
                <Text style={[styles.categoryPct, { color: colors.textSecondary }]}>{pct.toFixed(0)}% · {cat.count} subs</Text>
              </View>
            );
          })}
        </View>
      )}

      {filteredSubscriptions.length === 0 && !loading && (
        <View style={styles.emptyState}>
          <Image
            source={require('@/assets/illustrations/empty-dashboard.png')}
            style={styles.emptyImage}
            resizeMode="contain"
          />
          <Text style={[styles.emptyText, { color: colors.emptyText }]}>
            {searchQuery ? 'No matching subscriptions' : 'No subscriptions yet'}
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.emptySubtext }]}>
            {searchQuery ? 'Try a different search term' : 'Tap the + tab to add your first one'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16 },
  heroCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  heroImage: {
    borderRadius: 20,
  },
  heroLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '500' },
  heroAmount: { color: '#fff', fontSize: 48, fontWeight: '800', letterSpacing: -1 },
  heroRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  heroSecondary: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  heroCount: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  alertCard: { borderRadius: 16, padding: 16, gap: 2 },
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  alertTitle: { fontSize: 16, fontWeight: '700' },
  alertCount: { fontSize: 14, fontWeight: '800', backgroundColor: '#FF3B3015', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 8 },
  alertItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  alertIcon: { fontSize: 24 },
  alertName: { fontSize: 15, fontWeight: '600' },
  alertChange: { fontSize: 13, marginTop: 2 },
  alertImpact: { alignItems: 'flex-end' },
  alertImpactAmt: { fontSize: 16, fontWeight: '800' },
  alertImpactLabel: { fontSize: 11 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 16, padding: 0 },
  clearBtn: { fontSize: 16, padding: 4 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 14, fontWeight: '500' },
  section: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  upcomingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  upcomingIcon: { fontSize: 28 },
  upcomingName: { fontSize: 16, fontWeight: '600' },
  upcomingDate: { fontSize: 13, marginTop: 2 },
  upcomingPrice: { fontSize: 16, fontWeight: '700' },
  monthCard: {
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  monthLabel: { fontSize: 16, fontWeight: '600' },
  monthAmount: { fontSize: 22, fontWeight: '800' },
  monthSub: { fontSize: 13 },
  categoryItem: { gap: 4 },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  categoryName: { fontSize: 15, fontWeight: '500' },
  categoryAmount: { fontSize: 15, fontWeight: '600' },
  barBg: { height: 6, borderRadius: 3 },
  barFill: { height: 6, borderRadius: 3 },
  categoryPct: { fontSize: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyImage: { width: 200, height: 150, marginBottom: 8 },
  emptyText: { fontSize: 18, fontWeight: '600' },
  emptySubtext: { fontSize: 14 },
});
