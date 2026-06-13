import { Tabs } from 'expo-router';
import { Pressable, Text } from 'react-native';

function TabBarIcon({ icon }: { icon: string }) {
  return <Text style={{ fontSize: 24 }}>{icon}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          paddingBottom: 4,
          height: 56,
        },
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: '700',
          color: '#000',
        },
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: '#fff',
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
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: () => <TabBarIcon icon="⚙️" />,
        }}
      />
    </Tabs>
  );
}
