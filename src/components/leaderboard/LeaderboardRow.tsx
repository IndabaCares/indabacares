import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/stores/auth-store';

interface LeaderboardRowProps {
  entry: {
    rank: number;
    rank_change: number;
    total_points: number;
    user: {
      id: string;
      full_name: string;
      display_name: string | null;
      avatar_url: string | null;
    };
  };
}

export function LeaderboardRow({ entry }: LeaderboardRowProps) {
  const userId = useAuthStore((s) => s.user?.id);
  const isMe = entry.user.id === userId;
  const change = entry.rank_change;

  return (
    <Pressable
      onPress={() => router.push(`/(screens)/user/${entry.user.id}`)}
      className={`mx-4 mb-2 flex-row items-center rounded-xl px-4 py-3 ${
        isMe ? 'bg-primary-50 border border-primary-200' : 'bg-white border border-slate-50'
      }`}
    >
      {/* Rank */}
      <View className="w-8 items-center">
        <Text className={`text-sm font-bold ${isMe ? 'text-primary-600' : 'text-slate-500'}`}>
          #{entry.rank}
        </Text>
      </View>

      {/* Avatar + Name */}
      <Avatar uri={entry.user.avatar_url} name={entry.user.full_name} size="sm" />
      <View className="ml-3 flex-1">
        <Text className={`text-sm font-semibold ${isMe ? 'text-primary-800' : 'text-slate-800'}`}>
          {entry.user.display_name || entry.user.full_name}
          {isMe ? ' (You)' : ''}
        </Text>
      </View>

      {/* Points + Change */}
      <View className="items-end">
        <Text className="text-sm font-bold text-slate-800">{entry.total_points}</Text>
        {change !== 0 && (
          <Text className={`text-[10px] font-medium ${change > 0 ? 'text-success-500' : 'text-danger-500'}`}>
            {change > 0 ? `↑${change}` : `↓${Math.abs(change)}`}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
