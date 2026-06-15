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
import { useTheme } from '@/src/lib/theme';
import { CATEGORIES } from '@/src/types';
import { TEMPLATES, type Template } from '@/src/data/templates';
import { playPop } from '@/src/lib/sounds';

const COLORS = ['#007AFF', '#FF3B30', '#34C759', '#FF9500', '#AF52DE', '#FF2D55', '#5856D6', '#00C7BE', '#FFD60A', '#AC8E68'];

export default function AddScreen() {
  const { colors } = useTheme();
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
  const [templateSearch, setTemplateSearch] = useState('');

  const selectedTemplate = useMemo(() => TEMPLATES.find(t => t.name === name), [name]);

  const filteredTemplates = useMemo(() => {
    if (!templateSearch) return TEMPLATES;
    const q = templateSearch.toLowerCase();
    return TEMPLATES.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  }, [templateSearch]);

  function applyTemplate(t: Template) {
    setName(t.name);
    setPrice(t.defaultPrice.toString());
    setBillingCycle(t.billingCycle);
    setIcon(t.icon);
    setColor(t.color);
    const cat = CATEGORIES.find(c => c.name === t.category);
    if (cat) setCategoryId(cat.id);
    setShowTemplates(false);
    setTemplateSearch('');
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

    if (!error) {
      // DB trigger auto-logs initial price to price_history — no manual insert needed
      playPop(); // 🔊 satisfying pop
    }

    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.replace('/(tabs)/subscriptions');
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Quick template picker */}
      <Pressable
        style={[styles.templateBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
        onPress={() => setShowTemplates(true)}
      >
        <Text style={[styles.templateBtnText, { color: colors.primary }]}>⚡ Quick Add from 80+ templates</Text>
      </Pressable>

      {/* Template modal with search */}
      <Modal visible={showTemplates} animationType="slide">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Choose a Template</Text>
            <Pressable onPress={() => { setShowTemplates(false); setTemplateSearch(''); }}>
              <Text style={[styles.closeBtn, { color: colors.textSecondary }]}>✕</Text>
            </Pressable>
          </View>
          <View style={[styles.templateSearchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.templateSearchInput, { color: colors.text }]}
              placeholder="Search templates..."
              placeholderTextColor={colors.textSecondary}
              value={templateSearch}
              onChangeText={setTemplateSearch}
            />
          </View>
          <FlatList
            data={filteredTemplates}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.templateItem, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}
                onPress={() => applyTemplate(item)}
              >
                <Text style={styles.templateIcon}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.templateName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.templateCat, { color: colors.textSecondary }]}>{item.category} · {item.billingCycle}</Text>
                </View>
                <Text style={[styles.templatePrice, { color: colors.text }]}>${item.defaultPrice}</Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.separator }} />}
          />
        </View>
      </Modal>

      {/* Form fields */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Netflix"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Price</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            value={price}
            onChangeText={setPrice}
            placeholder="0.00"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Billing Cycle</Text>
          <View style={styles.cycleRow}>
            {(['monthly', 'yearly'] as const).map((c) => (
              <Pressable
                key={c}
                style={[
                  styles.cycleBtn,
                  { borderColor: colors.border },
                  billingCycle === c && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setBillingCycle(c)}
              >
                <Text
                  style={[
                    styles.cycleBtnText,
                    { color: billingCycle === c ? '#fff' : colors.textSecondary },
                  ]}
                >
                  {c === 'monthly' ? 'Monthly' : 'Yearly'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
        <Pressable
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
          onPress={() => setShowCategory(true)}
        >
          <Text style={[styles.categoryText, { color: colors.text }]}>
            {CATEGORIES.find(c => c.id === categoryId)?.icon}{' '}
            {CATEGORIES.find(c => c.id === categoryId)?.name}
          </Text>
        </Pressable>
        <Modal visible={showCategory} animationType="slide">
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Category</Text>
              <Pressable onPress={() => setShowCategory(false)}>
                <Text style={[styles.closeBtn, { color: colors.textSecondary }]}>✕</Text>
              </Pressable>
            </View>
            <FlatList
              data={CATEGORIES}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.templateItem, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}
                  onPress={() => { setCategoryId(item.id); setShowCategory(false); }}
                >
                  <Text style={styles.templateIcon}>{item.icon}</Text>
                  <Text style={[styles.templateName, { color: colors.text }]}>{item.name}</Text>
                  {categoryId === item.id && <Text style={[styles.checkMark, { color: colors.primary }]}>✓</Text>}
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.separator }} />}
            />
          </View>
        </Modal>
      </View>

      <View style={styles.row}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Icon</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            value={icon}
            onChangeText={setIcon}
            placeholder="📦"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Color</Text>
          <View style={styles.colorRow}>
            {COLORS.map((c) => (
              <Pressable
                key={c}
                style={[
                  styles.colorDot,
                  { backgroundColor: c, borderColor: colors.text },
                  color === c && styles.colorDotActive,
                ]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Next Billing Date (optional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          value={nextBillingDate}
          onChangeText={setNextBillingDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. Family plan, annual renewal..."
          placeholderTextColor={colors.textSecondary}
          multiline
        />
      </View>

      <Pressable style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Add Subscription'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  templateBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  templateBtnText: { fontSize: 15, fontWeight: '600' },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', marginLeft: 4 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  notesInput: { minHeight: 60 },
  row: { flexDirection: 'row', gap: 12 },
  cycleRow: { flexDirection: 'row', gap: 8 },
  cycleBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  cycleBtnText: { fontSize: 15 },
  categoryText: { fontSize: 16 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotActive: { borderWidth: 3 },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  modalContainer: { flex: 1, marginTop: 60 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  closeBtn: { fontSize: 22 },
  templateSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    margin: 16,
    marginBottom: 0,
  },
  searchIcon: { fontSize: 16 },
  templateSearchInput: { flex: 1, fontSize: 16, padding: 0 },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  templateIcon: { fontSize: 28 },
  templateName: { fontSize: 16, fontWeight: '500' },
  templateCat: { fontSize: 13 },
  templatePrice: { fontSize: 16, fontWeight: '700' },
  checkMark: { fontSize: 20, fontWeight: '700' },
});
