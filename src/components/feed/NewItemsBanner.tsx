import React from 'react';
import { Pressable, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useUIStore } from '@/stores/ui-store';

interface NewItemsBannerProps {
  onRefresh: () => void;
}

export function NewItemsBanner({ onRefresh }: NewItemsBannerProps) {
  const count = useUIStore((s) => s.newFeedItemCount);
  const reset = useUIStore((s) => s.resetNewFeedItems);

  if (count === 0) return null;

  const handlePress = () => {
    reset();
    onRefresh();
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      exiting={FadeOutUp.duration(200)}
      className="absolute left-4 right-4 top-2 z-40"
    >
      <Pressable
        onPress={handlePress}
        className="flex-row items-center justify-center rounded-full bg-primary-500 px-4 py-2.5 shadow-lg"
      >
        <Ionicons name="arrow-up" size={16} color="#ffffff" />
        <Text className="ml-2 text-sm font-semibold text-white">
          {count} new recognition{count > 1 ? 's' : ''}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
