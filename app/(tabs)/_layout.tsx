import { Tabs } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { useTheme } from '@/src/lib/theme';

function TabBarIcon({ icon }: { icon: string }) {
  return <Text style={{ fontSize: 24 }}>{icon}</Text>;
}

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + (Platform.OS === 'android' ? Math.max(insets.bottom, 8) : 0);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.tabBarBorder,
          paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 8) : 4,
          height: tabBarHeight,
        },
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: '700',
          color: colors.text,
        },
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: colors.headerBg,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: () => <TabBarIcon icon="📊" />,
        }}
      />
      <Tabs.Screen
        name="subscriptions"
        options={{
          title: 'Subscriptions',
          tabBarIcon: () => <TabBarIcon icon="📋" />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarIcon: () => <TabBarIcon icon="➕" />,
        }}
      />
      <Tabs.Screen
        name="offers"
        options={{
          title: 'Offers',
          tabBarIcon: () => <TabBarIcon icon="🏷️" />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: () => <TabBarIcon icon="⚙️" />,
        }}
      />
    </Tabs>
  );
}
