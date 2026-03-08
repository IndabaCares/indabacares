import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { MOOD_MAP } from '@/lib/constants';

export function MoodPromptCard() {
  const moodSubmittedToday = useAuthStore((s) => s.moodSubmittedToday);

  if (moodSubmittedToday) return null;

  return (
    <Pressable
      onPress={() => router.push('/(screens)/mood')}
      className="mb-4 flex-row items-center rounded-2xl bg-primary-50 px-4 py-3"
    >
      <Text className="text-2xl">😊</Text>
      <View className="ml-3 flex-1">
        <Text className="text-sm font-semibold text-primary-800">
          How are you feeling today?
        </Text>
        <Text className="text-xs text-primary-600">
          Tap to check in and earn 5 points
        </Text>
      </View>
      <View className="flex-row">
        {Object.values(MOOD_MAP).map((m) => (
          <Text key={m.label} className="text-lg">
            {m.emoji}
          </Text>
        ))}
      </View>
    </Pressable>
  );
}
