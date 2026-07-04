import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/src/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { ThemeProvider, useTheme } from '@/src/lib/theme';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function AppContent() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { colors, isDark } = useTheme();
  const isInitialLoad = useRef(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // If we have a session but the token is expired, try to refresh it
      if (session) {
        const expiresAt = session.expires_at ?? 0;
        const now = Math.floor(Date.now() / 1000);
        if (expiresAt && expiresAt < now) {
          const { data: { session: refreshed } } = await supabase.auth.refreshSession();
          setSession(refreshed);
        } else {
          setSession(session);
        }
      } else {
        setSession(null);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      
      // Skip navigation on initial load — getSession already handled it
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        return;
      }
      
      // Only navigate on actual auth state changes (not initial check)
      if (event === 'SIGNED_IN') {
        router.replace('/(tabs)');
      } else if (event === 'SIGNED_OUT') {
        router.replace('/(auth)');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {session ? (
          <Stack.Screen name="(tabs)" />
        ) : (
          <Stack.Screen name="(auth)" />
        )}
        <Stack.Screen
          name="subscription/[id]"
          options={{
            headerShown: true,
            title: 'Details',
            headerStyle: { backgroundColor: colors.headerBg },
            headerTintColor: colors.text,
            headerShadowVisible: false,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
