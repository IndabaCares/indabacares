import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEmployee } from '@/providers/EmployeeContext';
import { supabase } from '@/lib/supabase';
import { ReactionBalance } from '@/components/reactions/ReactionBalance';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { employee, clearEmployee } = useEmployee();
  const [pointsBalance, setPointsBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!employee) return;
    supabase
      .from('employees')
      .select('points_balance')
      .eq('id', employee.employee_id)
      .single()
      .then(({ data }) => {
        if (data) setPointsBalance((data as { points_balance: number }).points_balance);
      });
  }, [employee?.employee_id]);

  if (!employee) return null;

  const menuItems = [
    { label: 'My Orders',    icon: 'receipt-outline'  as const, route: '/(screens)/orders'   },
    { label: 'Mood History', icon: 'heart-outline'    as const, route: '/(screens)/mood'     },
    { label: 'Skills',       icon: 'bar-chart-outline'as const, route: '/(screens)/skills'   },
    { label: 'Settings',     icon: 'settings-outline' as const, route: '/(screens)/settings' },
  ];

  const initials = employee.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View className="items-center bg-primary-50 px-6 pb-8 pt-6">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-primary-200">
          <Text className="text-2xl font-bold text-primary-700">{initials}</Text>
        </View>
        <Text className="mt-3 text-xl font-bold text-slate-900">{employee.full_name}</Text>
        <Text className="mt-0.5 text-sm text-slate-500">{employee.employee_code}</Text>
        <Text className="mt-1 text-xs font-medium text-primary-600">{employee.hotel}</Text>
      </View>

      {/* ── Points balance ─────────────────────────────────────────────── */}
      <View className="mx-4 mt-4 flex-row">
        <View className="flex-1 items-center rounded-2xl bg-primary-50 p-4">
          <Ionicons name="trophy" size={22} color="#ED6813" />
          {pointsBalance === null ? (
            <ActivityIndicator size="small" color="#ED6813" style={{ marginTop: 4 }} />
          ) : (
            <Text className="mt-1 text-2xl font-bold text-primary-600">{pointsBalance}</Text>
          )}
          <Text className="text-xs text-slate-500">Points</Text>
        </View>
      </View>

      {/* ── Reaction Balance ───────────────────────────────────────────── */}
      <ReactionBalance />

      {/* ── Menu ───────────────────────────────────────────────────────── */}
      <View className="mx-4 mt-4 rounded-2xl bg-white">
        {menuItems.map((item, index) => (
          <Pressable
            key={item.label}
            onPress={() => router.push(item.route as any)}
            className={`flex-row items-center px-4 py-4 active:bg-primary-50 ${
              index < menuItems.length - 1 ? 'border-b border-slate-100' : ''
            }`}
          >
            <Ionicons name={item.icon} size={20} color="#64748b" />
            <Text className="ml-3 flex-1 text-base text-slate-700">{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </Pressable>
        ))}
      </View>

      {/* ── Sign Out ───────────────────────────────────────────────────── */}
      <Pressable
        onPress={() => clearEmployee()}
        className="mx-4 mt-4 flex-row items-center rounded-2xl bg-red-50 px-4 py-4 active:bg-red-100"
      >
        <Ionicons name="log-out-outline" size={22} color="#ef4444" />
        <Text className="ml-3 flex-1 text-base font-semibold text-red-500">Sign Out</Text>
        <Ionicons name="chevron-forward" size={18} color="#fca5a5" />
      </Pressable>
    </ScrollView>
  );
}
