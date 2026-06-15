import { useState, useCallback } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useTheme } from '@/src/lib/theme';
import {
  type Subscription,
  getMonthlyCost,
  formatCurrency,
  getCategoryName,
} from '@/src/types';

export default function SubscriptionsScreen() {
  const { colors } = useTheme();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('active', { ascending: false })
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

  const filteredSubscriptions = subscriptions.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      selectedFilter === 'all' ||
      (selectedFilter === 'active' && s.active) ||
      (selectedFilter === 'inactive' && !s.active);
    return matchesSearch && matchesFilter;
  });

  const renderItem = ({ item }: { item: Subscription }) => (
    <Pressable
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={() => router.push(`/subscription/${item.id}`)}
    >
      <View style={[styles.iconWrap, { backgroundColor: item.color + '20' }]}>
        <Text style={styles.icon}>{item.icon}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.category, { color: colors.textSecondary }]}>{getCategoryName(item.category_id)} · {item.billing_cycle}</Text>
      </View>
      <View style={styles.rightCol}>
        <Text style={[styles.price, { color: colors.text }]}>{formatCurrency(item.price, item.currency)}</Text>
        <Text style={[styles.monthly, { color: colors.textSecondary }]}>{formatCurrency(getMonthlyCost(item.price, item.billing_cycle, item.cycle_days))}/mo</Text>
      </View>
      {!item.active && (
        <View style={[styles.inactiveBadge, { backgroundColor: colors.danger }]}>
          <Text style={styles.inactiveText}>INACTIVE</Text>
        </View>
      )}
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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

      <FlatList
        data={filteredSubscriptions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={colors.primary} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>{searchQuery ? '🔍' : '📋'}</Text>
              <Text style={[styles.emptyText, { color: colors.emptyText }]}>
                {searchQuery ? 'No matching subscriptions' : 'No subscriptions yet'}
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.emptySubtext }]}>
                {searchQuery ? 'Try a different search term' : 'Tap the + tab to add one'}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 16,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 16, padding: 0 },
  clearBtn: { fontSize: 16, padding: 4 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 14, fontWeight: '500' },
  list: { padding: 16, paddingTop: 0, gap: 0 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 24 },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '600' },
  category: { fontSize: 13 },
  rightCol: { alignItems: 'flex-end' },
  price: { fontSize: 16, fontWeight: '700' },
  monthly: { fontSize: 12 },
  inactiveBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  inactiveText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 18, fontWeight: '600' },
  emptySubtext: { fontSize: 14 },
});
