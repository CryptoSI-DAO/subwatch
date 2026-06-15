import { Link, Stack } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme } from '@/src/lib/theme';

export default function AuthScreen() {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  function showAlert(title: string, message: string, type: 'error' | 'success' = 'error') {
    if (Platform.OS === 'web') {
      // On web, show inline instead of Alert.alert
      if (type === 'error') setErrorMsg(`${title}: ${message}`);
      else setSuccessMsg(message);
    } else {
      Alert.alert(title, message);
    }
  }

  async function handleAuth() {
    setErrorMsg('');
    setSuccessMsg('');
    if (!email || !password) {
      showAlert('Missing fields', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        showAlert('Check your email', 'We sent you a confirmation link!', 'success');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // On success, onAuthStateChange in _layout.tsx will navigate automatically
      }
    } catch (err: any) {
      showAlert('Error', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
        <View style={styles.logoWrap}>
          <Text style={styles.logo}>👁️</Text>
          <Text style={[styles.title, { color: colors.text }]}>SubWatch</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Track subscriptions. Catch price hikes.</Text>
        </View>

        <View style={styles.form}>
          {errorMsg ? (
            <View style={{ backgroundColor: '#fee', borderColor: '#f33', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }}>
              <Text style={{ color: '#c00', fontSize: 14 }}>{errorMsg}</Text>
            </View>
          ) : null}
          {successMsg ? (
            <View style={{ backgroundColor: '#efe', borderColor: '#3c3', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }}>
              <Text style={{ color: '#060', fontSize: 14 }}>{successMsg}</Text>
            </View>
          ) : null}
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            placeholder="Email"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            placeholder="Password"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType={mode === 'signin' ? 'password' : 'newPassword'}
          />

          <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleAuth} disabled={loading}>
            <Text style={styles.buttonText}>
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.switchMode}
            onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          >
            <Text style={[styles.switchText, { color: colors.primary }]}>
              {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.footer, { color: colors.emptySubtext }]}>CryptoSI DAO · No bank linking · 100% private</Text>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    gap: 30,
  },
  logoWrap: {
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    fontSize: 56,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  form: {
    gap: 12,
  },
  input: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 17,
    borderWidth: 1,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  switchMode: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchText: {
    fontSize: 15,
  },
  footer: {
    textAlign: 'center',
    fontSize: 13,
  },
});
