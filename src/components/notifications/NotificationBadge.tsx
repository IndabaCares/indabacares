import React from 'react';
import { View, Text } from 'react-native';

interface NotificationBadgeProps {
  count: number;
}

export function NotificationBadge({ count }: NotificationBadgeProps) {
  if (count <= 0) return null;

  return (
    <View className="absolute -right-1 -top-1 h-5 min-w-[20px] items-center justify-center rounded-full bg-danger-500 px-1">
      <Text className="text-[10px] font-bold text-white">
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}
