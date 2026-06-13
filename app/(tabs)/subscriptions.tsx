import { useState, useCallback } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import {
  type Subscription,
  getMonthlyCost,
  formatCurrency,
  getCategoryName,
} from '@/src/types';

export default function SubscriptionsScreen() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

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

  const renderItem = ({ item }: { item: Subscription }) => (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/subscription/${item.id}`)}
    >
      <View style={[styles.iconWrap, { backgroundColor: item.color + '20' }]}>
        <Text style={styles.icon}>{item.icon}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.category}>{getCategoryName(item.category_id)} · {item.billing_cycle}</Text>
      </View>
      <View style={styles.rightCol}>
        <Text style={styles.price}>{formatCurrency(item.price, item.currency)}</Text>
        <Text style={styles.monthly}>{formatCurrency(getMonthlyCost(item.price, item.billing_cycle, item.cycle_days))}/mo</Text>
      </View>
      {!item.active && <View style={styles.inactiveBadge}><Text style={styles.inactiveText}>INACTIVE</Text></View>}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={subscriptions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor="#007AFF" />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No subscriptions yet</Text>
              <Text style={styles.emptySubtext}>Tap the + tab to add one</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  list: { padding: 16, gap: 0 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
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
  name: { fontSize: 16, fontWeight: '600', color: '#000' },
  category: { fontSize: 13, color: '#8E8E93' },
  rightCol: { alignItems: 'flex-end' },
  price: { fontSize: 16, fontWeight: '700', color: '#000' },
  monthly: { fontSize: 12, color: '#8E8E93' },
  inactiveBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF3B30',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  inactiveText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#8E8E93' },
  emptySubtext: { fontSize: 14, color: '#C7C7CC' },
});
