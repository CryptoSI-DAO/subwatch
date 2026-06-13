import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/src/lib/supabase';

export default function SettingsScreen() {
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

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <View style={styles.aboutCard}>
          <Text style={styles.aboutIcon}>👁️</Text>
          <Text style={styles.aboutName}>SubWatch</Text>
          <Text style={styles.aboutVersion}>Version 1.0.0</Text>
          <Text style={styles.aboutDesc}>
            Track subscriptions, catch price hikes, and see exactly where your money goes. No bank linking. No ads. 100% private.
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.rowIcon}>🔒</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Privacy First</Text>
            <Text style={styles.rowDesc}>Your data is encrypted and never shared</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowIcon}>💳</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>One-Time Purchase</Text>
            <Text style={styles.rowDesc}>No subscription required. Pay once, own forever.</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowIcon}>🏗️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Built by CryptoSI DAO</Text>
            <Text style={styles.rowDesc}>cryptosidao.org</Text>
          </View>
        </View>
      </View>

      <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7', padding: 16, gap: 16 },
  section: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  aboutCard: { alignItems: 'center', padding: 28, gap: 6 },
  aboutIcon: { fontSize: 56 },
  aboutName: { fontSize: 22, fontWeight: '700', color: '#000' },
  aboutVersion: { fontSize: 13, color: '#8E8E93' },
  aboutDesc: { fontSize: 14, color: '#8E8E93', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  rowIcon: { fontSize: 24 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#000' },
  rowDesc: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#E5E5EA', marginLeft: 54 },
  signOutBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  signOutText: { color: '#FF3B30', fontSize: 17, fontWeight: '600' },
});
