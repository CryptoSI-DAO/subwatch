import { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import {
  type Subscription,
  type PriceHistory,
  getCategoryName,
  getMonthlyCost,
  getYearlyCost,
  formatCurrency,
} from '@/src/types';
import { format, parseISO } from 'date-fns';
import { Svg, Polyline, Line, Circle, Text as SvgText } from 'react-native-svg';

// Custom lightweight SVG chart
function PriceChartSVG({ data, color }: { data: { x: Date; y: number }[]; color: string }) {
  const W = 320;
  const H = 180;
  const PAD = { top: 20, bottom: 35, left: 50, right: 20 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const values = data.map((d) => d.y);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const px = PAD.left + (i / (data.length - 1)) * chartW;
    const py = PAD.top + chartH - ((d.y - minVal) / range) * chartH;
    return { px, py, date: d.x };
  });

  const polylinePoints = points.map((p) => `${p.px},${p.py}`).join(' ');

  // Y axis labels
  const yLabels = [maxVal, (maxVal + minVal) / 2, minVal];

  return (
    <Svg width={W} height={H}>
      {/* Y axis labels */}
      {yLabels.map((v, i) => {
        const y = PAD.top + (i / 2) * chartH;
        return (
          <SvgText key={i} x={PAD.left - 8} y={y + 4} fontSize={10} fill="#8E8E93" textAnchor="end">
            ${v.toFixed(2)}
          </SvgText>
        );
      })}
      {/* Grid lines */}
      {yLabels.map((v, i) => {
        const y = PAD.top + (i / 2) * chartH;
        return <Line key={`g${i}`} x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#F2F2F7" strokeWidth={1} />;
      })}
      {/* Price line */}
      <Polyline points={polylinePoints} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      {/* Data points */}
      {points.map((p, i) => (
        <Circle key={`p${i}`} cx={p.px} cy={p.py} r={5} fill={color} />
      ))}
      {/* X axis labels */}
      {points.map((p, i) => (
        <SvgText key={`x${i}`} x={p.px} y={H - 8} fontSize={10} fill="#8E8E93" textAnchor="middle">
          {format(p.date, 'MMM d')}
        </SvgText>
      ))}
    </Svg>
  );
}


export default function SubscriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [newPrice, setNewPrice] = useState('');

  const loadData = useCallback(async () => {
    if (!id) return;

    const [subRes, histRes] = await Promise.all([
      supabase.from('subscriptions').select('*').eq('id', id).single(),
      supabase
        .from('price_history')
        .select('*')
        .eq('subscription_id', id)
        .order('changed_at', { ascending: true }),
    ]);

    if (subRes.data) setSub(subRes.data as Subscription);
    if (histRes.data) setHistory(histRes.data as PriceHistory[]);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handlePriceUpdate() {
    if (!sub || !newPrice) return;
    const priceNum = parseFloat(newPrice);
    if (isNaN(priceNum)) return;

    // Insert price history
    await supabase.from('price_history').insert({
      subscription_id: sub.id,
      old_price: sub.price,
      new_price: priceNum,
    });

    // Update subscription
    await supabase.from('subscriptions').update({ price: priceNum }).eq('id', sub.id);

    setShowPriceModal(false);
    setNewPrice('');
    loadData();
  }

  async function handleToggleActive() {
    if (!sub) return;
    await supabase.from('subscriptions').update({ active: !sub.active }).eq('id', sub.id);
    loadData();
  }

  async function handleDelete() {
    if (!sub) return;
    Alert.alert('Delete Subscription', `Remove ${sub.name}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('subscriptions').delete().eq('id', sub.id);
          router.replace('/(tabs)/subscriptions');
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!sub) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Subscription not found</Text>
      </View>
    );
  }

  const priceChanges = history.map((h) => ({
    x: new Date(h.changed_at),
    y: h.new_price,
  }));

  const totalChange = history.length > 1
    ? history[history.length - 1].new_price - history[0].new_price
    : 0;
  const pctChange = history.length > 1 && history[0].new_price > 0
    ? (totalChange / history[0].new_price) * 100
    : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header card */}
      <View style={[styles.headerCard, { backgroundColor: sub.color }]}>
        <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <Text style={styles.headerIcon}>{sub.icon}</Text>
        </View>
        <Text style={styles.headerName}>{sub.name}</Text>
        <Text style={styles.headerPrice}>{formatCurrency(sub.price, sub.currency)}</Text>
        <Text style={styles.headerCycle}>{sub.billing_cycle} · {getCategoryName(sub.category_id)}</Text>
        {!sub.active && <View style={styles.inactiveTag}><Text style={styles.inactiveTagText}>INACTIVE</Text></View>}
      </View>

      {/* Cost summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Monthly</Text>
          <Text style={styles.summaryValue}>{formatCurrency(getMonthlyCost(sub.price, sub.billing_cycle, sub.cycle_days))}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Yearly</Text>
          <Text style={styles.summaryValue}>{formatCurrency(getYearlyCost(sub.price, sub.billing_cycle, sub.cycle_days))}</Text>
        </View>
      </View>

      {/* Price history chart */}
      {priceChanges.length >= 2 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📈 Price History</Text>
            {totalChange !== 0 && (
              <Text style={[styles.changeBadge, totalChange > 0 ? styles.changeUp : styles.changeDown]}>
                {totalChange > 0 ? '▲' : '▼'} {formatCurrency(Math.abs(totalChange), sub.currency)} ({Math.abs(pctChange).toFixed(0)}%)
              </Text>
            )}
          </View>
          <PriceChartSVG data={priceChanges} color={totalChange >= 0 ? '#FF3B30' : '#34C759'} />
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Price History</Text>
          <Text style={styles.emptyChart}>No price changes logged yet</Text>
        </View>
      )}

      {/* History log */}
      {history.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Change Log</Text>
          {history.slice().reverse().map((h, i) => (
            <View key={h.id || i} style={styles.logItem}>
              <Text style={styles.logDate}>
                {format(parseISO(h.changed_at), 'MMM d, yyyy')}
              </Text>
              <Text style={styles.logChange}>
                {h.old_price !== null
                  ? `${formatCurrency(h.old_price, sub.currency)} → ${formatCurrency(h.new_price, sub.currency)}`
                  : `Started at ${formatCurrency(h.new_price, sub.currency)}`}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Notes */}
      {sub.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Notes</Text>
          <Text style={styles.notesText}>{sub.notes}</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable style={styles.actionBtn} onPress={() => { setNewPrice(sub.price.toString()); setShowPriceModal(true); }}>
          <Text style={styles.actionBtnText}>💰 Log Price Change</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={handleToggleActive}>
          <Text style={styles.actionBtnSecondaryText}>
            {sub.active ? '🚫 Mark Inactive' : '✅ Mark Active'}
          </Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, styles.actionBtnDanger]} onPress={handleDelete}>
          <Text style={styles.actionBtnDangerText}>🗑️ Delete</Text>
        </Pressable>
      </View>

      {/* Price update modal */}
      <Modal visible={showPriceModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Log New Price</Text>
            <Text style={styles.modalSub}>Current: {formatCurrency(sub.price, sub.currency)}</Text>
            <TextInput
              style={styles.modalInput}
              value={newPrice}
              onChangeText={setNewPrice}
              placeholder="New price"
              placeholderTextColor="#8E8E93"
              keyboardType="decimal-pad"
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setShowPriceModal(false)}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalBtnSave]} onPress={handlePriceUpdate}>
                <Text style={styles.modalBtnTextWhite}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7' },
  emptyText: { fontSize: 16, color: '#8E8E93' },
  headerCard: { borderRadius: 20, padding: 28, alignItems: 'center', gap: 4 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  headerIcon: { fontSize: 32 },
  headerName: { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerPrice: { color: '#fff', fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  headerCycle: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  inactiveTag: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 },
  inactiveTagText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center' },
  summaryLabel: { fontSize: 13, color: '#8E8E93', fontWeight: '500' },
  summaryValue: { fontSize: 22, fontWeight: '700', color: '#000', marginTop: 4 },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  changeBadge: { fontSize: 12, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  changeUp: { backgroundColor: '#FF3B3015', color: '#FF3B30' },
  changeDown: { backgroundColor: '#34C75915', color: '#34C759' },
  emptyChart: { fontSize: 14, color: '#8E8E93', textAlign: 'center', paddingVertical: 20 },
  logItem: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E5EA' },
  logDate: { fontSize: 12, color: '#8E8E93' },
  logChange: { fontSize: 15, color: '#000', fontWeight: '500', marginTop: 2 },
  notesText: { fontSize: 15, color: '#000', lineHeight: 22 },
  actions: { gap: 10 },
  actionBtn: { backgroundColor: '#007AFF', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  actionBtnSecondary: { backgroundColor: '#fff' },
  actionBtnSecondaryText: { color: '#000', fontSize: 16, fontWeight: '500' },
  actionBtnDanger: { backgroundColor: '#fff' },
  actionBtnDangerText: { color: '#FF3B30', fontSize: 16, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  modalCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#000' },
  modalSub: { fontSize: 14, color: '#8E8E93' },
  modalInput: { backgroundColor: '#F2F2F7', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 18, color: '#000' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: '#E5E5EA' },
  modalBtnSave: { backgroundColor: '#007AFF' },
  modalBtnText: { fontSize: 16, fontWeight: '600', color: '#000' },
  modalBtnTextWhite: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
