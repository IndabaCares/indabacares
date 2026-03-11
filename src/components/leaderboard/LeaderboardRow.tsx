import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { getBadgeLevel, type LeaderboardEntry } from '@/api/leaderboard-service';
import { useEmployee } from '@/providers/EmployeeContext';

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
}

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export const LeaderboardRow = memo(function LeaderboardRow({ entry }: LeaderboardRowProps) {
  const { employee } = useEmployee();
  const isMe  = entry.employee_id === employee?.employee_id;
  const badge = getBadgeLevel(entry.points_balance);
  const medal = RANK_MEDAL[entry.rank];

  return (
    <View
      className="mx-4 mb-2 overflow-hidden rounded-2xl border"
      style={{
        borderColor: isMe ? '#c4b5fd' : '#f1f5f9',
        backgroundColor: isMe ? '#f5f3ff' : '#fff',
      }}
    >
      <View className="flex-row items-center px-4 py-3">
        {/* Rank */}
        <View className="w-9 items-center">
          {medal ? (
            <Text className="text-lg">{medal}</Text>
          ) : (
            <Text
              className="text-sm font-bold"
              style={{ color: isMe ? '#7c3aed' : '#94a3b8' }}
            >
              #{entry.rank}
            </Text>
          )}
        </View>

        {/* Avatar */}
        <Avatar name={entry.full_name} size="sm" />

        {/* Name */}
        <View className="ml-3 flex-1">
          <Text
            className="text-sm font-bold"
            style={{ color: isMe ? '#7c3aed' : '#0f172a' }}
            numberOfLines={1}
          >
            {entry.full_name}
            {isMe ? ' · You' : ''}
          </Text>
        </View>

        {/* Badge + points */}
        <View className="items-end">
          {/* Badge pill */}
          <View
            className="mb-1 flex-row items-center rounded-full px-2 py-0.5"
            style={{ backgroundColor: badge.color + '18' }}
          >
            <Text className="text-[10px]">{badge.emoji}</Text>
            <Text
              className="ml-1 text-[10px] font-bold"
              style={{ color: badge.color }}
            >
              {badge.label}
            </Text>
          </View>
          {/* Period points */}
          <Text className="text-sm font-bold text-slate-800">
            {entry.total_points.toLocaleString()} pts
          </Text>
        </View>
      </View>

      {/* Highlight bar for current user */}
      {isMe && (
        <View className="h-0.5" style={{ backgroundColor: '#c4b5fd50' }} />
      )}
    </View>
  );
});
