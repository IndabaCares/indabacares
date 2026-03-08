import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useLogout } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const company = useAuthStore((s) => s.company);
  const logout = useLogout();

  return (
    <ScrollView className="flex-1 bg-slate-50">
      {/* Account info */}
      <View className="mx-4 mt-4 rounded-2xl bg-white p-4">
        <Text className="mb-3 text-sm font-semibold text-slate-400">ACCOUNT</Text>
        <InfoRow label="Name" value={user?.fullName || ''} />
        <InfoRow label="Email" value={user?.email || ''} />
        <InfoRow label="Role" value={user?.role?.replace('_', ' ') || ''} />
        <InfoRow label="Company" value={company?.name || ''} />
      </View>

      {/* App info */}
      <View className="mx-4 mt-4 rounded-2xl bg-white p-4">
        <Text className="mb-3 text-sm font-semibold text-slate-400">APP</Text>
        <InfoRow label="Version" value={Constants.expoConfig?.version || '1.0.0'} />
        <InfoRow label="Build" value={Constants.expoConfig?.extra?.buildNumber || '1'} />
      </View>

      {/* Sign Out */}
      <Pressable
        onPress={() => logout.mutate()}
        className="mx-4 mt-6 flex-row items-center justify-center rounded-xl border border-danger-200 bg-danger-50 py-4"
      >
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text className="ml-2 text-base font-semibold text-danger-500">Sign Out</Text>
      </Pressable>

      <View className="mt-8 items-center pb-10">
        <Text className="text-xs text-slate-300">IndabaCares v{Constants.expoConfig?.version || '1.0.0'}</Text>
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-3 flex-row justify-between">
      <Text className="text-sm text-slate-500">{label}</Text>
      <Text className="text-sm font-medium text-slate-800">{value}</Text>
    </View>
  );
}
