import { Stack } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useState } from 'react';
import {
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
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
      }
    } catch (err: any) {
      showAlert('Error', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ImageBackground
      source={require('@/assets/illustrations/login-bg.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
        <View style={styles.logoWrap}>
          <Image source={require('@/assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>SubWatch</Text>
          <Text style={styles.subtitle}>Track subscriptions. Catch price hikes.</Text>
        </View>

        <View style={styles.form}>
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}
          {successMsg ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{successMsg}</Text>
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

        <Text style={styles.footer}>CryptoSI DAO · No bank linking · 100% private</Text>
      </KeyboardAvoidingView>
    </ImageBackground>
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
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  logoWrap: {
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
    color: '#000',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    color: '#8E8E93',
  },
  form: {
    gap: 12,
  },
  errorBox: {
    backgroundColor: '#fee',
    borderColor: '#f33',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    color: '#c00',
    fontSize: 14,
  },
  successBox: {
    backgroundColor: '#efe',
    borderColor: '#3c3',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  successText: {
    color: '#060',
    fontSize: 14,
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
    color: '#C7C7CC',
  },
});
