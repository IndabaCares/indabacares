import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AuthMeResponse } from '@/types/api';

interface BalanceCardsProps {
  user: AuthMeResponse['user'];
}

export function BalanceCards({ user }: BalanceCardsProps) {
  const cards = [
    {
      label: 'Points',
      value: user.pointsBalance,
      icon: 'trophy' as const,
      color: '#CE21FB',
      bg: 'bg-primary-50',
    },
    {
      label: 'Stars',
      value: user.starsBalance,
      icon: 'star' as const,
      color: '#f59e0b',
      bg: 'bg-warning-50',
    },
    {
      label: 'To Give',
      value: user.givingBalance,
      icon: 'heart' as const,
      color: '#22c55e',
      bg: 'bg-success-50',
    },
  ];

  return (
    <View className="flex-row px-4 py-4">
      {cards.map((card) => (
        <View key={card.label} className={`mr-2 flex-1 items-center rounded-2xl ${card.bg} p-4`}>
          <Ionicons name={card.icon} size={22} color={card.color} />
          <Text className="mt-1 text-2xl font-bold" style={{ color: card.color }}>
            {card.value}
          </Text>
          <Text className="text-xs text-slate-500">{card.label}</Text>
        </View>
      ))}
    </View>
  );
}
