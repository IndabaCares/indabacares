import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useUIStore, type RealtimeStatus } from '@/stores/ui-store';

export function ConnectionBanner() {
  const status = useUIStore((s) => s.realtimeStatus);

  if (status === 'connected' || status === 'connecting') return null;

  return (
    <Animated.View
      entering={FadeInUp.duration(300)}
      exiting={FadeOutUp.duration(200)}
      className="absolute left-0 right-0 top-0 z-50"
    >
      <BannerContent status={status} />
    </Animated.View>
  );
}

function BannerContent({ status }: { status: RealtimeStatus }) {
  if (status === 'reconnecting') {
    return (
      <View className="flex-row items-center justify-center bg-amber-500 px-4 py-2">
        <Ionicons name="cloud-offline-outline" size={14} color="#ffffff" />
        <Text className="ml-2 text-xs font-medium text-white">
          Reconnecting...
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => {
        // Supabase handles reconnection automatically;
        // forcing a page-level refresh if user taps
      }}
      className="flex-row items-center justify-center bg-red-500 px-4 py-2"
    >
      <Ionicons name="cloud-offline" size={14} color="#ffffff" />
      <Text className="ml-2 text-xs font-medium text-white">
        Connection lost. Tap to retry.
      </Text>
    </Pressable>
  );
}
