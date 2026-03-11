import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { PERIOD_LABELS, type PeriodType } from '@/api/leaderboard-service';

interface PeriodTabsProps {
  value: PeriodType;
  onChange: (value: PeriodType) => void;
}

const PERIODS: PeriodType[] = ['all_time', 'monthly', 'quarterly', 'annual'];

export function PeriodTabs({ value, onChange }: PeriodTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
    >
      {PERIODS.map((period) => {
        const active = value === period;
        return (
          <Pressable
            key={period}
            onPress={() => onChange(period)}
            className="rounded-full px-4 py-2 active:opacity-70"
            style={{
              backgroundColor: active ? '#ffffff' : 'rgba(255,255,255,0.18)',
              shadowColor: active ? '#4c1d95' : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: active ? 0.2 : 0,
              shadowRadius: 6,
              elevation: active ? 3 : 0,
            }}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: active ? '#7c3aed' : 'rgba(255,255,255,0.85)' }}
            >
              {PERIOD_LABELS[period]}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
