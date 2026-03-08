import React from 'react';
import { View, ScrollView } from 'react-native';
import { Chip } from '@/components/ui/Chip';

interface PeriodTabsProps {
  value: string;
  onChange: (value: any) => void;
}

const PERIODS = [
  { key: 'monthly', label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'annual', label: 'Annual' },
] as const;

export function PeriodTabs({ value, onChange }: PeriodTabsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-4">
      {PERIODS.map((p) => (
        <Chip
          key={p.key}
          label={p.label}
          selected={value === p.key}
          onPress={() => onChange(p.key)}
        />
      ))}
    </ScrollView>
  );
}
