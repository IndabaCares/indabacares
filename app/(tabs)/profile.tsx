import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth-store';
import { useLogout } from '@/hooks/use-auth';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { BadgeShowcase } from '@/components/profile/BadgeShowcase';
import { BalanceCards } from '@/components/profile/BalanceCards';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const company = useAuthStore((s) => s.company);
  const logout = useLogout();

  if (!user || !company) return null;

  const menuItems = [
    { label: 'My Orders', icon: 'receipt-outline' as const, route: '/(screens)/orders' },
    { label: 'Mood History', icon: 'heart-outline' as const, route: '/(screens)/mood' },
    { label: 'Skills', icon: 'bar-chart-outline' as const, route: '/(screens)/skills' },
    { label: 'Settings', icon: 'settings-outline' as const, route: '/(screens)/settings' },
  ];

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
    >
      <ProfileHeader user={user} company={company} />
      <BalanceCards user={user} />

      <View className="px-4">
        <BadgeShowcase badges={user.badges} />
      </View>

      {/* Menu */}
      <View className="mx-4 mt-4 rounded-2xl bg-white">
        {menuItems.map((item, index) => (
          <Pressable
            key={item.label}
            onPress={() => router.push(item.route as any)}
            className={`flex-row items-center px-4 py-4 active:bg-slate-50 ${
              index < menuItems.length - 1 ? 'border-b border-slate-50' : ''
            }`}
          >
            <Ionicons name={item.icon} size={20} color="#64748b" />
            <Text className="ml-3 flex-1 text-base text-slate-700">{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </Pressable>
        ))}
      </View>

      {/* Edit Profile */}
      <Pressable
        onPress={() => router.push('/(screens)/edit-profile')}
        className="mx-4 mt-4 flex-row items-center justify-center rounded-xl border border-primary-200 bg-primary-50 py-3"
      >
        <Ionicons name="create-outline" size={18} color="#6366f1" />
        <Text className="ml-2 text-sm font-semibold text-primary-600">Edit Profile</Text>
      </Pressable>

      {/* Logout */}
      <Pressable
        onPress={() => logout.mutate()}
        className="mx-4 mt-4 flex-row items-center justify-center rounded-xl py-3"
      >
        <Ionicons name="log-out-outline" size={18} color="#ef4444" />
        <Text className="ml-2 text-sm font-medium text-danger-500">Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}
