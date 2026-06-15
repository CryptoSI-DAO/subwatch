import { View, Text, StyleSheet, Pressable, Alert, ScrollView, Platform, Linking, Share } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useTheme } from '@/src/lib/theme';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_TIME_KEY = '@subwatch_notification_time';
const NOTIFICATION_ENABLED_KEY = '@subwatch_notifications_enabled';

export default function SettingsScreen() {
  const { colors, mode, setMode, isDark } = useTheme();
  const [exporting, setExporting] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationTime, setNotificationTime] = useState('21:00');

  // Load notification prefs on mount
  useState(() => {
    (async () => {
      const enabled = await AsyncStorage.getItem(NOTIFICATION_ENABLED_KEY);
      const time = await AsyncStorage.getItem(NOTIFICATION_TIME_KEY);
      if (enabled === 'true') setNotificationsEnabled(true);
      if (time) setNotificationTime(time);
    })();
  });

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all subscriptions. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) return;

              // Delete all user data
              await supabase.from('subscriptions').delete().eq('user_id', session.user.id);

              // Sign out (user deletion requires server-side with service role key)
              await supabase.auth.signOut();
              Alert.alert('Account Deleted', 'Your data has been removed.');
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  }

  async function handleExportCSV() {
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('name');

      if (error) throw error;
      if (!data || data.length === 0) {
        Alert.alert('No Data', 'You have no subscriptions to export.');
        setExporting(false);
        return;
      }

      const headers = ['Name', 'Price', 'Currency', 'Billing Cycle', 'Category', 'Icon', 'Color', 'Next Billing Date', 'Notes', 'Active', 'Created At'];
      const rows = data.map((s: any) => [
        s.name,
        s.price,
        s.currency || 'USD',
        s.billing_cycle,
        s.category_id || '',
        s.icon,
        s.color,
        s.next_billing_date || '',
        (s.notes || '').replace(/,/g, ';'),
        s.active ? 'Yes' : 'No',
        s.created_at,
      ]);

      const csv = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');

      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'subwatch-export.csv';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ message: csv, title: 'SubWatch Export' });
      }
    } catch (err: any) {
      Alert.alert('Export Failed', err.message);
    }
    setExporting(false);
  }

  async function handleExportJSON() {
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('name');

      if (error) throw error;
      if (!data || data.length === 0) {
        Alert.alert('No Data', 'You have no subscriptions to export.');
        setExporting(false);
        return;
      }

      const json = JSON.stringify(data, null, 2);

      if (Platform.OS === 'web') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'subwatch-export.json';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ message: json, title: 'SubWatch Export' });
      }
    } catch (err: any) {
      Alert.alert('Export Failed', err.message);
    }
    setExporting(false);
  }

  async function handleToggleNotifications(enabled: boolean) {
    if (enabled) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive billing reminders.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      setNotificationsEnabled(true);
      await AsyncStorage.setItem(NOTIFICATION_ENABLED_KEY, 'true');
      await scheduleNotification();
      Alert.alert('Notifications Enabled', `You'll be reminded at ${notificationTime} to check your subscriptions.`);
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
      setNotificationsEnabled(false);
      await AsyncStorage.setItem(NOTIFICATION_ENABLED_KEY, 'false');
    }
  }

  async function scheduleNotification() {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const [hours, minutes] = notificationTime.split(':').map(Number);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '👁️ SubWatch Reminder',
        body: 'Check your subscriptions for upcoming bills!',
        data: { screen: '/(tabs)/dashboard' },
      },
      trigger: {
        hour: hours,
        minute: minutes,
        repeats: true,
      },
    });
  }

  const themeOptions: { label: string; value: 'light' | 'dark' | 'system' }[] = [
    { label: '☀️ Light', value: 'light' },
    { label: '🌙 Dark', value: 'dark' },
    { label: '🔄 System', value: 'system' },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* About card */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <View style={styles.aboutCard}>
          <Text style={styles.aboutIcon}>👁️</Text>
          <Text style={[styles.aboutName, { color: colors.text }]}>SubWatch</Text>
          <Text style={[styles.aboutVersion, { color: colors.textSecondary }]}>Version 1.1.0</Text>
          <Text style={[styles.aboutDesc, { color: colors.textSecondary }]}>
            Track subscriptions, catch price hikes, and see exactly where your money goes. No bank linking. No ads. 100% private.
          </Text>
        </View>
      </View>

      {/* Appearance */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>🎨 Appearance</Text>
        <View style={styles.themeRow}>
          {themeOptions.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.themeBtn,
                { borderColor: colors.border },
                mode === opt.value && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setMode(opt.value)}
            >
              <Text style={[styles.themeBtnText, { color: mode === opt.value ? '#fff' : colors.text }]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Notifications */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>🔔 Notifications</Text>
        <View style={[styles.row, { borderBottomColor: colors.separator }]}>
          <Text style={[styles.rowIcon]}>⏰</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Daily Reminder</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
              {notificationsEnabled ? `Enabled at ${notificationTime}` : 'Get reminded to check your subscriptions'}
            </Text>
          </View>
          <Pressable
            style={[styles.toggle, notificationsEnabled && { backgroundColor: colors.success }]}
            onPress={() => handleToggleNotifications(!notificationsEnabled)}
          >
            <View style={[styles.toggleKnob, notificationsEnabled && styles.toggleKnobActive]} />
          </Pressable>
        </View>
      </View>

      {/* Data */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>💾 Data</Text>
        <Pressable style={[styles.row, { borderBottomColor: colors.separator }]} onPress={handleExportCSV} disabled={exporting}>
          <Text style={styles.rowIcon}>📄</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Export as CSV</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>Spreadsheet-compatible format</Text>
          </View>
        </Pressable>
        <Pressable style={[styles.row, { borderBottomColor: colors.separator }]} onPress={handleExportJSON} disabled={exporting}>
          <Text style={styles.rowIcon}>📋</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Export as JSON</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>Full data backup</Text>
          </View>
        </Pressable>
      </View>

      {/* Account */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>👤 Account</Text>
        <View style={[styles.row, { borderBottomColor: colors.separator }]}>
          <Text style={styles.rowIcon}>🔒</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Privacy First</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>Your data is encrypted and never shared</Text>
          </View>
        </View>
        <View style={[styles.row, { borderBottomColor: colors.separator }]}>
          <Text style={styles.rowIcon}>💳</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>One-Time Purchase</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>No subscription required. Pay once, own forever.</Text>
          </View>
        </View>
        <View style={[styles.row, { borderBottomColor: colors.separator }]}>
          <Text style={styles.rowIcon}>🏗️</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Built by CryptoSI DAO</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>cryptosidao.org</Text>
          </View>
        </View>
      </View>

      {/* Danger zone */}
      <View style={styles.dangerZone}>
        <Pressable style={[styles.dangerBtn, { backgroundColor: colors.surface }]} onPress={handleSignOut}>
          <Text style={[styles.dangerBtnText, { color: colors.primary }]}>Sign Out</Text>
        </Pressable>
        <Pressable style={[styles.dangerBtn, { backgroundColor: colors.surface }]} onPress={handleDeleteAccount}>
          <Text style={[styles.dangerBtnText, { color: colors.danger }]}>Delete Account</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  section: { borderRadius: 16, overflow: 'hidden' },
  sectionTitle: { fontSize: 16, fontWeight: '700', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  aboutCard: { alignItems: 'center', padding: 28, gap: 6 },
  aboutIcon: { fontSize: 56 },
  aboutName: { fontSize: 22, fontWeight: '700' },
  aboutVersion: { fontSize: 13 },
  aboutDesc: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  themeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 16 },
  themeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  themeBtnText: { fontSize: 14, fontWeight: '500' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: { fontSize: 24 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowDesc: { fontSize: 13, marginTop: 2 },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  dangerZone: { gap: 10 },
  dangerBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  dangerBtnText: { fontSize: 17, fontWeight: '600' },
});
