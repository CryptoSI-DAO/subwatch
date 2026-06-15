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
import { useTheme } from '@/src/lib/theme';
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
import { playWhoosh } from '@/src/lib/sounds';

function PriceChartSVG({ data, color, colors }: { data: { x: Date; y: number }[]; color: string; colors: any }) {
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
  const yLabels = [maxVal, (maxVal + minVal) / 2, minVal];

  return (
    <Svg width={W} height={H}>
      {yLabels.map((v, i) => {
        const y = PAD.top + (i / 2) * chartH;
        return (
          <SvgText key={i} x={PAD.left - 8} y={y + 4} fontSize={10} fill={colors.svgText} textAnchor="end">
            ${v.toFixed(2)}
          </SvgText>
        );
      })}
      {yLabels.map((v, i) => {
        const y = PAD.top + (i / 2) * chartH;
        return <Line key={`g${i}`} x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke={colors.gridLine} strokeWidth={1} />;
      })}
      <Polyline points={polylinePoints} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <Circle key={`p${i}`} cx={p.px} cy={p.py} r={5} fill={color} />
      ))}
      {points.map((p, i) => (
        <SvgText key={`x${i}`} x={p.px} y={H - 8} fontSize={10} fill={colors.svgText} textAnchor="middle">
          {format(p.date, 'MMM d')}
        </SvgText>
      ))}
    </Svg>
  );
}

export default function SubscriptionDetailScreen() {
  const { colors } = useTheme();
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
    playWhoosh(); // 🔊 soft whoosh on opening detail page
  }, [loadData]);

  async function handlePriceUpdate() {
    if (!sub || !newPrice) return;
    const priceNum = parseFloat(newPrice);
    if (isNaN(priceNum)) return;

    // DB trigger auto-logs to price_history on price change — no manual insert needed
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
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!sub) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Subscription not found</Text>
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
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Header card */}
      <View style={[styles.headerCard, { backgroundColor: sub.color }]}>
        <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <Text style={styles.headerIcon}>{sub.icon}</Text>
        </View>
        <Text style={styles.headerName}>{sub.name}</Text>
        <Text style={styles.headerPrice}>{formatCurrency(sub.price, sub.currency)}</Text>
        <Text style={styles.headerCycle}>{sub.billing_cycle} · {getCategoryName(sub.category_id)}</Text>
        {!sub.active && (
          <View style={[styles.inactiveTag, { backgroundColor: colors.inactiveBadge }]}>
            <Text style={[styles.inactiveTagText, { color: colors.inactiveBadgeText }]}>INACTIVE</Text>
          </View>
        )}
      </View>

      {/* Cost summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Monthly</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(getMonthlyCost(sub.price, sub.billing_cycle, sub.cycle_days))}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Yearly</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(getYearlyCost(sub.price, sub.billing_cycle, sub.cycle_days))}</Text>
        </View>
      </View>

      {/* Price history chart */}
      {priceChanges.length >= 2 ? (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>📈 Price History</Text>
            {totalChange !== 0 && (
              <Text
                style={[
                  styles.changeBadge,
                  totalChange > 0
                    ? { backgroundColor: colors.changeUpBg, color: colors.changeUp }
                    : { backgroundColor: colors.changeDownBg, color: colors.changeDown },
                ]}
              >
                {totalChange > 0 ? '▲' : '▼'} {formatCurrency(Math.abs(totalChange), sub.currency)} ({Math.abs(pctChange).toFixed(0)}%)
              </Text>
            )}
          </View>
          <PriceChartSVG data={priceChanges} color={totalChange >= 0 ? colors.changeUp : colors.changeDown} colors={colors} />
        </View>
      ) : (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📈 Price History</Text>
          <Text style={[styles.emptyChart, { color: colors.textSecondary }]}>No price changes logged yet</Text>
        </View>
      )}

      {/* History log */}
      {history.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📋 Change Log</Text>
          {history.slice().reverse().map((h, i) => (
            <View key={h.id || i} style={[styles.logItem, { borderBottomColor: colors.separator }]}>
              <Text style={[styles.logDate, { color: colors.textSecondary }]}>
                {format(parseISO(h.changed_at), 'MMM d, yyyy')}
              </Text>
              <Text style={[styles.logChange, { color: colors.text }]}>
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
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📝 Notes</Text>
          <Text style={[styles.notesText, { color: colors.text }]}>{sub.notes}</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => { setNewPrice(sub.price.toString()); setShowPriceModal(true); }}>
          <Text style={styles.actionBtnText}>💰 Log Price Change</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, styles.actionBtnSecondary, { backgroundColor: colors.surface }]} onPress={handleToggleActive}>
          <Text style={[styles.actionBtnSecondaryText, { color: colors.text }]}>
            {sub.active ? '🚫 Mark Inactive' : '✅ Mark Active'}
          </Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, styles.actionBtnDanger, { backgroundColor: colors.surface }]} onPress={handleDelete}>
          <Text style={[styles.actionBtnDangerText, { color: colors.danger }]}>🗑️ Delete</Text>
        </Pressable>
      </View>

      {/* Price update modal */}
      <Modal visible={showPriceModal} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Log New Price</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>Current: {formatCurrency(sub.price, sub.currency)}</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text }]}
              value={newPrice}
              onChangeText={setNewPrice}
              placeholder="New price"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, styles.modalBtnCancel, { backgroundColor: colors.border }]} onPress={() => setShowPriceModal(false)}>
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalBtnSave, { backgroundColor: colors.primary }]} onPress={handlePriceUpdate}>
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
  container: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16 },
  headerCard: { borderRadius: 20, padding: 28, alignItems: 'center', gap: 4 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  headerIcon: { fontSize: 32 },
  headerName: { color: '#fff', fontSize: 22, fontWeight: '700' },
  headerPrice: { color: '#fff', fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  headerCycle: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  inactiveTag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 },
  inactiveTagText: { fontSize: 10, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center' },
  summaryLabel: { fontSize: 13, fontWeight: '500' },
  summaryValue: { fontSize: 22, fontWeight: '700', marginTop: 4 },
  section: { borderRadius: 16, padding: 16, gap: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  changeBadge: { fontSize: 12, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  emptyChart: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  logItem: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  logDate: { fontSize: 12 },
  logChange: { fontSize: 15, fontWeight: '500', marginTop: 2 },
  notesText: { fontSize: 15, lineHeight: 22 },
  actions: { gap: 10 },
  actionBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  actionBtnSecondary: {},
  actionBtnSecondaryText: { fontSize: 16, fontWeight: '500' },
  actionBtnDanger: {},
  actionBtnDangerText: { fontSize: 16, fontWeight: '500' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  modalCard: { borderRadius: 20, padding: 24, width: '100%', gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalSub: { fontSize: 14 },
  modalInput: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 18 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalBtnCancel: {},
  modalBtnSave: {},
  modalBtnText: { fontSize: 16, fontWeight: '600' },
  modalBtnTextWhite: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
