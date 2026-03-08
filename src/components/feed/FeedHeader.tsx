import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { MoodPromptCard } from '@/components/mood/MoodPromptCard';

export function FeedHeader() {
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  const firstName = (user.displayName || user.fullName).split(' ')[0];
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <View className="mb-4">
      <View className="mb-4 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-slate-900">
            {greeting}, {firstName}!
          </Text>
          <Text className="mt-0.5 text-sm text-slate-500">
            {user.loginStreak > 1
              ? `${user.loginStreak} day streak 🔥`
              : "Let's make today great"}
          </Text>
        </View>
      </View>

      {/* Balance cards */}
      <View className="mb-4 flex-row">
        <Pressable
          onPress={() => router.push('/(tabs)/profile')}
          className="mr-2 flex-1 rounded-xl bg-primary-50 p-3"
        >
          <Text className="text-xs text-primary-600">Points</Text>
          <Text className="text-xl font-bold text-primary-700">{user.pointsBalance}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/(tabs)/rewards')}
          className="mr-2 flex-1 rounded-xl bg-warning-50 p-3"
        >
          <Text className="text-xs text-warning-600">Stars</Text>
          <Text className="text-xl font-bold text-warning-600">{user.starsBalance}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/(tabs)/give')}
          className="flex-1 rounded-xl bg-success-50 p-3"
        >
          <Text className="text-xs text-success-600">To Give</Text>
          <Text className="text-xl font-bold text-success-600">{user.givingBalance}</Text>
        </Pressable>
      </View>

      <MoodPromptCard />
    </View>
  );
}
