import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useEmployee } from '@/providers/EmployeeContext';
import { supabase } from '@/lib/supabase';

const PURPLE = '#7B1FA2';
const ACCENT  = '#CE21FB';

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
  const hour      = new Date().getHours();
  const greeting  =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={styles.container}>

      {/* Purple header section */}
      <View style={styles.header}>

        {/* Greeting */}
        <Text style={styles.greeting}>{greeting}, {firstName}!</Text>
        <Text style={styles.subtext}>Let's make today great</Text>

        {/* Points card */}
        <Pressable onPress={() => router.push('/(screens)/wallet')} style={styles.pointsCard}>
          <View style={styles.pointsIconBox}>
            <Ionicons name="star" size={22} color="#fbbf24" />
          </View>
          <View style={styles.pointsInfo}>
            <Text style={styles.pointsLabel}>Points Balance</Text>
            <Text style={styles.pointsValue}>{points ?? '—'}</Text>
          </View>
          <Pressable onPress={() => router.push('/(tabs)/give')} style={styles.giveButton}>
            <Text style={styles.giveButtonText}>Give Recognition</Text>
          </Pressable>
        </Pressable>

      </View>

      {/* Spacer so cards start below the rounded header */}
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },

  header: {
    backgroundColor: PURPLE,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },

  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  subtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
    marginBottom: 16,
  },

  pointsCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  pointsIconBox: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pointsInfo: {
    flex: 1,
    marginLeft: 12,
  },

  pointsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  pointsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  giveButton: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  giveButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },

  spacer: {
    height: 12,
  },
});
