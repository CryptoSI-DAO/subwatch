import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { CATEGORIES } from '@/src/types';
import { TEMPLATES, type Template } from '@/src/data/templates';

const COLORS = ['#007AFF', '#FF3B30', '#34C759', '#FF9500', '#AF52DE', '#FF2D55', '#5856D6', '#00C7BE', '#FFD60A', '#AC8E68'];

export default function AddScreen() {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [categoryId, setCategoryId] = useState<number>(1);
  const [icon, setIcon] = useState('📦');
  const [color, setColor] = useState('#007AFF');
  const [nextBillingDate, setNextBillingDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCategory, setShowCategory] = useState(false);

  const selectedTemplate = useMemo(() => TEMPLATES.find(t => t.name === name), [name]);

  function applyTemplate(t: Template) {
    setName(t.name);
    setPrice(t.defaultPrice.toString());
    setBillingCycle(t.billingCycle);
    setIcon(t.icon);
    setColor(t.color);
    const cat = CATEGORIES.find(c => c.name === t.category);
    if (cat) setCategoryId(cat.id);
    setShowTemplates(false);
  }

  async function handleSave() {
    if (!name.trim() || !price.trim()) {
      Alert.alert('Missing fields', 'Name and price are required');
      return;
    }

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from('subscriptions').insert({
      user_id: session.user.id,
      name: name.trim(),
      price: parseFloat(price),
      billing_cycle: billingCycle,
      cycle_days: billingCycle === 'monthly' ? 30 : 365,
      category_id: categoryId,
      icon,
      color,
      next_billing_date: nextBillingDate || null,
      notes: notes.trim() || null,
      active: true,
    });

    // Also create initial price history entry
    if (!error) {
      const { data: newSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (newSub) {
        await supabase.from('price_history').insert({
          subscription_id: newSub.id,
          old_price: null,
          new_price: parseFloat(price),
        });
      }
    }

    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.replace('/(tabs)/subscriptions');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Quick template picker */}
      <Pressable style={styles.templateBtn} onPress={() => setShowTemplates(true)}>
        <Text style={styles.templateBtnText}>⚡ Quick Add from 80+ templates</Text>
      </Pressable>

      <Modal visible={showTemplates} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose a Template</Text>
            <Pressable onPress={() => setShowTemplates(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </Pressable>
          </View>
          <FlatList
            data={TEMPLATES}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable style={styles.templateItem} onPress={() => applyTemplate(item)}>
                <Text style={styles.templateIcon}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.templateName}>{item.name}</Text>
                  <Text style={styles.templateCat}>{item.category} · {item.billingCycle}</Text>
                </View>
                <Text style={styles.templatePrice}>${item.defaultPrice}</Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#E5E5EA' }} />}
          />
        </View>
      </Modal>

      {/* Form fields */}
      <View style={styles.field}>
        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Netflix" placeholderTextColor="#8E8E93" />
      </View>

      <View style={styles.row}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>Price</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="0.00"
            placeholderTextColor="#8E8E93"
            keyboardType="decimal-pad"
          />
        </View>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>Billing Cycle</Text>
          <View style={styles.cycleRow}>
            {(['monthly', 'yearly'] as const).map((c) => (
              <Pressable
                key={c}
                style={[styles.cycleBtn, billingCycle === c && styles.cycleBtnActive]}
                onPress={() => setBillingCycle(c)}
              >
                <Text style={[styles.cycleBtnText, billingCycle === c && styles.cycleBtnTextActive]}>
                  {c === 'monthly' ? 'Monthly' : 'Yearly'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Category</Text>
        <Pressable style={styles.input} onPress={() => setShowCategory(true)}>
          <Text style={styles.categoryText}>
            {CATEGORIES.find(c => c.id === categoryId)?.icon}{' '}
            {CATEGORIES.find(c => c.id === categoryId)?.name}
          </Text>
        </Pressable>
        <Modal visible={showCategory} animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <Pressable onPress={() => setShowCategory(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </Pressable>
            </View>
            <FlatList
              data={CATEGORIES}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.templateItem}
                  onPress={() => { setCategoryId(item.id); setShowCategory(false); }}
                >
                  <Text style={styles.templateIcon}>{item.icon}</Text>
                  <Text style={styles.templateName}>{item.name}</Text>
                  {categoryId === item.id && <Text style={styles.checkMark}>✓</Text>}
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#E5E5EA' }} />}
            />
          </View>
        </Modal>
      </View>

      <View style={styles.row}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>Icon</Text>
          <TextInput style={styles.input} value={icon} onChangeText={setIcon} placeholder="📦" placeholderTextColor="#8E8E93" />
        </View>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>Color</Text>
          <View style={styles.colorRow}>
            {COLORS.map((c) => (
              <Pressable
                key={c}
                style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Next Billing Date (optional)</Text>
        <TextInput
          style={styles.input}
          value={nextBillingDate}
          onChangeText={setNextBillingDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#8E8E93"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, { minHeight: 60 }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. Family plan, annual renewal..."
          placeholderTextColor="#8E8E93"
          multiline
        />
      </View>

      <Pressable style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Add Subscription'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  templateBtn: {
    backgroundColor: '#007AFF15',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF30',
  },
  templateBtnText: { color: '#007AFF', fontSize: 15, fontWeight: '600' },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: '#8E8E93', marginLeft: 4 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  row: { flexDirection: 'row', gap: 12 },
  cycleRow: { flexDirection: 'row', gap: 8 },
  cycleBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  cycleBtnActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  cycleBtnText: { fontSize: 15, color: '#8E8E93' },
  cycleBtnTextActive: { color: '#fff', fontWeight: '600' },
  categoryText: { fontSize: 16, color: '#000' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotActive: { borderWidth: 3, borderColor: '#000' },
  saveBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  modalContainer: { flex: 1, backgroundColor: '#F2F2F7', marginTop: 60 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  closeBtn: { fontSize: 22, color: '#8E8E93' },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  templateIcon: { fontSize: 28 },
  templateName: { fontSize: 16, fontWeight: '500', color: '#000' },
  templateCat: { fontSize: 13, color: '#8E8E93' },
  templatePrice: { fontSize: 16, fontWeight: '700', color: '#000' },
  checkMark: { fontSize: 20, color: '#007AFF', fontWeight: '700' },
});
