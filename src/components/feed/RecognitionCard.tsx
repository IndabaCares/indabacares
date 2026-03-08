import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { formatRelativeTime } from '@/utils/format';

interface RecognitionCardProps {
  recognition: {
    id: string;
    message: string;
    stars_per_recipient: number;
    image_url: string | null;
    hashtags: string[];
    is_boosted: boolean;
    created_at: string;
    sender: { id: string; full_name: string; display_name: string | null; avatar_url: string | null };
    thumbs_up_type: { id: string; name: string; icon: string; color: string; stars_awarded: number };
    recipients: Array<{ recipient: { id: string; full_name: string; display_name: string | null; avatar_url: string | null } }>;
    reactions_count: Array<{ count: number }>;
    comments_count: Array<{ count: number }>;
  };
}

export const RecognitionCard = memo(function RecognitionCard({ recognition }: RecognitionCardProps) {
  const sender = recognition.sender;
  const recipients = recognition.recipients.map((r) => r.recipient);
  const thumbsUpType = recognition.thumbs_up_type;
  const reactionsCount = recognition.reactions_count?.[0]?.count || 0;
  const commentsCount = recognition.comments_count?.[0]?.count || 0;

  const recipientNames = recipients
    .map((r) => r.display_name || r.full_name)
    .join(', ');

  return (
    <Card
      onPress={() => router.push(`/(screens)/recognition/${recognition.id}`)}
      className="mb-3"
    >
      {/* Boost indicator */}
      {recognition.is_boosted && (
        <View className="mb-2 flex-row items-center rounded-lg bg-warning-50 px-3 py-1.5">
          <Ionicons name="rocket" size={14} color="#f59e0b" />
          <Text className="ml-1.5 text-xs font-semibold text-warning-600">
            Manager Boosted
          </Text>
        </View>
      )}

      {/* Sender row */}
      <View className="mb-3 flex-row items-center">
        <Avatar uri={sender.avatar_url} name={sender.full_name} size="md" />
        <View className="ml-3 flex-1">
          <Text className="text-sm font-bold text-slate-800">
            {sender.display_name || sender.full_name}
          </Text>
          <Text className="text-xs text-slate-400">
            {formatRelativeTime(recognition.created_at)}
          </Text>
        </View>
        <View
          className="items-center justify-center rounded-full px-3 py-1"
          style={{ backgroundColor: thumbsUpType.color + '20' }}
        >
          <Text className="text-sm">
            {thumbsUpType.icon} {thumbsUpType.name}
          </Text>
        </View>
      </View>

      {/* Recipients */}
      <View className="mb-2 flex-row flex-wrap items-center">
        <Ionicons name="arrow-forward" size={14} color="#94a3b8" />
        <Text className="ml-1 text-sm text-slate-600">
          To{' '}
          <Text className="font-semibold text-slate-800">{recipientNames}</Text>
        </Text>
      </View>

      {/* Message */}
      <Text className="mb-3 text-base leading-6 text-slate-700" numberOfLines={4}>
        {recognition.message}
      </Text>

      {/* Hashtags */}
      {recognition.hashtags.length > 0 && (
        <View className="mb-3 flex-row flex-wrap gap-1">
          {recognition.hashtags.map((tag) => (
            <View key={tag} className="rounded-full bg-primary-50 px-2.5 py-1">
              <Text className="text-xs font-semibold text-primary-600">#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Footer: reactions + comments count */}
      <View className="flex-row items-center border-t border-slate-50 pt-3">
        <View className="flex-row items-center">
          <Ionicons name="heart-outline" size={16} color="#94a3b8" />
          <Text className="ml-1 text-xs text-slate-400">{reactionsCount}</Text>
        </View>
        <View className="ml-4 flex-row items-center">
          <Ionicons name="chatbubble-outline" size={16} color="#94a3b8" />
          <Text className="ml-1 text-xs text-slate-400">{commentsCount}</Text>
        </View>
        <View className="ml-auto flex-row items-center">
          <Ionicons name="star" size={14} color="#f59e0b" />
          <Text className="ml-1 text-xs font-semibold text-slate-500">
            {recognition.stars_per_recipient}
          </Text>
        </View>
      </View>
    </Card>
  );
});
