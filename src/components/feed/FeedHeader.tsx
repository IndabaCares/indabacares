import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useEmployee } from '@/providers/EmployeeContext';
import { supabase } from '@/lib/supabase';
import { MoodPromptCard } from '@/components/mood/MoodPromptCard';

function usePointsBalance(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['points-balance', employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      const { data, error } = await supabase
        .from('employees')
        .select('points_balance')
        .eq('id', employeeId)
        .single();
      if (error) throw error;
      return (data as { points_balance: number }).points_balance;
    },
    enabled: !!employeeId,
    staleTime: 60 * 1000,
  });
}

export function FeedHeader() {
  const { employee } = useEmployee();
  const { data: points } = usePointsBalance(employee?.employee_id);

  if (!employee) return null;

  const firstName = employee.full_name.split(' ')[0];
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <View className="mb-4">
      <View className="mb-4 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-violet-900">
            {greeting}, {firstName}!
          </Text>
          <Text className="mt-0.5 text-sm text-violet-400">Let's make today great</Text>
        </View>
      </View>

      {/* Points balance card */}
      <Pressable
        onPress={() => router.push('/(screens)/wallet')}
        className="mb-4 overflow-hidden rounded-2xl"
        style={{
          backgroundColor: '#7C3AED',
          shadowColor: '#7c3aed',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 5,
        }}
      >
        <View className="flex-row items-center px-5 py-4">
          <View
            className="h-11 w-11 items-center justify-center rounded-xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
          >
            <Ionicons name="star" size={22} color="#fbbf24" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Points Balance
            </Text>
            <Text className="text-2xl font-bold text-white">{points ?? '—'}</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)/give')}
            className="rounded-xl px-3 py-2"
            style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
          >
            <Text className="text-xs font-semibold text-white">Give Recognition</Text>
          </Pressable>
        </View>
      </Pressable>

      <MoodPromptCard />
    </View>
  );
}
