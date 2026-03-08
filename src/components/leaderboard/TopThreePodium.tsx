import React from 'react';
import { View, Text } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';

interface LeaderEntry {
  rank: number;
  rank_change: number;
  total_points: number;
  user: {
    id: string;
    full_name: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface TopThreePodiumProps {
  entries: LeaderEntry[];
}

const PODIUM_HEIGHTS = [100, 130, 80]; // 2nd, 1st, 3rd
const PODIUM_COLORS = ['bg-slate-300', 'bg-warning-500', 'bg-amber-700'];
const MEDALS = ['🥈', '🥇', '🥉'];
const ORDER = [1, 0, 2]; // Display order: 2nd, 1st, 3rd

export function TopThreePodium({ entries }: TopThreePodiumProps) {
  if (entries.length === 0) return null;

  return (
    <View className="mb-6 flex-row items-end justify-center px-8 pt-8">
      {ORDER.map((index) => {
        const entry = entries[index];
        if (!entry) return <View key={index} className="flex-1" />;

        const name = entry.user.display_name || entry.user.full_name;
        const change = entry.rank_change;

        return (
          <View key={entry.user.id} className="flex-1 items-center">
            {/* Medal + Name */}
            <Text className="mb-1 text-2xl">{MEDALS[index]}</Text>
            <Avatar
              uri={entry.user.avatar_url}
              name={entry.user.full_name}
              size={index === 1 ? 'lg' : 'md'}
            />
            <Text className="mt-1.5 text-center text-xs font-bold text-slate-800" numberOfLines={1}>
              {name.split(' ')[0]}
            </Text>
            <Text className="text-xs font-medium text-primary-600">
              {entry.total_points} pts
            </Text>
            {change !== 0 && (
              <Text className={`text-[10px] font-medium ${change > 0 ? 'text-success-500' : 'text-danger-500'}`}>
                {change > 0 ? `↑${change}` : `↓${Math.abs(change)}`}
              </Text>
            )}

            {/* Podium bar */}
            <View
              className={`mt-2 w-full rounded-t-xl ${PODIUM_COLORS[index]}`}
              style={{ height: PODIUM_HEIGHTS[index] }}
            />
          </View>
        );
      })}
    </View>
  );
}
