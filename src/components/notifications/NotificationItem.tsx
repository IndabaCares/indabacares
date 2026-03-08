import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatRelativeTime } from '@/utils/format';
import type { NotificationType } from '@/types/database';

interface NotificationItemProps {
  notification: {
    id: string;
    type: NotificationType;
    title: string;
    body: string | null;
    is_read: boolean;
    created_at: string;
  };
  onPress: () => void;
}

const TYPE_ICONS: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  recognition_received: { name: 'thumbs-up', color: '#6366f1' },
  recognition_boosted: { name: 'rocket', color: '#f59e0b' },
  reaction: { name: 'heart', color: '#ef4444' },
  comment: { name: 'chatbubble', color: '#3b82f6' },
  badge_earned: { name: 'ribbon', color: '#8b5cf6' },
  reward_approved: { name: 'checkmark-circle', color: '#22c55e' },
  reward_fulfilled: { name: 'gift', color: '#22c55e' },
  reward_rejected: { name: 'close-circle', color: '#ef4444' },
  budget_reset: { name: 'refresh', color: '#6366f1' },
  system: { name: 'information-circle', color: '#64748b' },
};

export function NotificationItem({ notification, onPress }: NotificationItemProps) {
  const icon = TYPE_ICONS[notification.type] || TYPE_ICONS.system;

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row px-4 py-3.5 active:bg-slate-50 ${
        !notification.is_read ? 'bg-primary-50/30' : ''
      }`}
    >
      <View
        className="mr-3 h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: icon.color + '15' }}
      >
        <Ionicons name={icon.name} size={20} color={icon.color} />
      </View>
      <View className="flex-1">
        <Text className={`text-sm ${notification.is_read ? 'text-slate-700' : 'font-semibold text-slate-900'}`}>
          {notification.title}
        </Text>
        {notification.body && (
          <Text className="mt-0.5 text-xs text-slate-500" numberOfLines={2}>
            {notification.body}
          </Text>
        )}
        <Text className="mt-1 text-[10px] text-slate-400">
          {formatRelativeTime(notification.created_at)}
        </Text>
      </View>
      {!notification.is_read && (
        <View className="ml-2 h-2.5 w-2.5 self-center rounded-full bg-primary-500" />
      )}
    </Pressable>
  );
}
