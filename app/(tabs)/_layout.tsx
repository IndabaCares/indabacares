import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCompanyTheme } from '@/hooks/use-company-theme';
import { useFeatureFlags } from '@/hooks/use-feature-flags';
import { useUnreadCount } from '@/hooks/use-notifications';


function HeaderRight() {
  const unread = useUnreadCount();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {/* Notifications */}
      <Pressable
        onPress={() => router.push('/(screens)/notifications')}
        style={{ marginRight: 16, height: 40, width: 40, alignItems: 'center', justifyContent: 'center' }}
        hitSlop={8}
      >
        <Ionicons name="notifications-outline" size={24} color="#7c3aed" />
        {unread > 0 && (
          <View className="absolute -right-0.5 -top-0.5 h-5 min-w-[20px] items-center justify-center rounded-full bg-danger-500 px-1">
            <Text className="text-[10px] font-bold text-white">
              {unread > 99 ? '99+' : unread}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

export default function TabLayout() {
  const { primaryColor } = useCompanyTheme();
  const flags = useFeatureFlags();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: primaryColor,
        tabBarInactiveTintColor: '#a78bfa',
        tabBarStyle: {
          height: 85,
          paddingBottom: 25,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: '#ede9fe',
          backgroundColor: '#ffffff',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerRight: () => <HeaderRight />,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { fontWeight: '700', fontSize: 18, color: '#4c1d95' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
          headerTitle: 'IndabaCares',
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaders',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy-outline" size={size} color={color} />
          ),
          href: flags.leaderboards_enabled ? '/(tabs)/leaderboard' : null,
        }}
      />
      <Tabs.Screen
        name="give"
        options={{
          title: 'Give',
          tabBarIcon: ({ focused }) => (
            <View
              className="-mt-4 h-14 w-14 items-center justify-center rounded-full shadow-lg"
              style={{ backgroundColor: primaryColor, opacity: focused ? 1 : 0.85 }}
            >
              <Ionicons name="add" size={28} color="#ffffff" />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Rewards',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="gift-outline" size={size} color={color} />
          ),
          href: flags.rewards_enabled ? '/(tabs)/rewards' : null,
          headerRight: () => null,
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: '#7B1FA2' },
          headerTitleStyle: { fontWeight: '700', fontSize: 18, color: '#ffffff' },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
