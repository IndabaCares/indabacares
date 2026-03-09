import React, { memo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { formatRelativeTime } from '@/utils/format';
import { useLikes, useToggleLike } from '@/hooks/use-likes';
import { useEmployee } from '@/providers/EmployeeContext';
import { RECOGNITION_BADGES } from '@/lib/constants';
import { CommentSheet } from './CommentSheet';
import { RecognitionReactionBar } from './RecognitionReactionBar';
import type { RecognitionFeedItem } from '@/api/queries';

interface RecognitionCardProps {
  recognition: RecognitionFeedItem;
}

function getBadgeConfig(badge: string) {
  return (
    RECOGNITION_BADGES.find((b) => b.value === badge) ?? {
      value: badge,
      emoji: '🏅',
      color: '#94a3b8',
    }
  );
}

export const RecognitionCard = memo(function RecognitionCard({
  recognition,
}: RecognitionCardProps) {
  const { employee } = useEmployee();
  const [showComments, setShowComments] = useState(false);

  const { data: likes = [] } = useLikes(recognition.id);
  const toggleLike = useToggleLike(recognition.id);

  const myLike = likes.find((l) => l.employee_id === employee?.employee_id);
  const liked = !!myLike;
  const likeCount = likes.length;

  const commentsCount = recognition.comments_count?.[0]?.count ?? 0;
  const badgeConfig = getBadgeConfig(recognition.badge);

  const handleLike = () => {
    toggleLike.mutate({ likeId: myLike?.id ?? null });
  };

  return (
    <>
      <View className="mb-3 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {/* ── Card Header ────────────────────────────────────────── */}
        <View className="px-4 pt-4 pb-3">
          {/* Sender row */}
          <View className="flex-row items-center">
            <Avatar name={recognition.sender.full_name} size="md" />
            <View className="ml-3 flex-1">
              <Text className="text-sm font-bold text-slate-800">
                {recognition.sender.full_name}
              </Text>
              {recognition.sender.position && (
                <Text className="text-xs text-slate-400" numberOfLines={1}>
                  {recognition.sender.position}
                </Text>
              )}
            </View>
            <Text className="text-xs text-slate-400">
              {formatRelativeTime(recognition.created_at)}
            </Text>
          </View>

          {/* Badge pill */}
          <View className="mt-3 self-start flex-row items-center rounded-full px-3 py-1.5"
            style={{ backgroundColor: badgeConfig.color + '18' }}>
            <Text className="text-sm">{badgeConfig.emoji}</Text>
            <Text
              className="ml-1.5 text-xs font-semibold"
              style={{ color: badgeConfig.color }}
            >
              {recognition.badge}
            </Text>
          </View>

          {/* Receiver line */}
          <View className="mt-2.5 flex-row items-center">
            <Ionicons name="arrow-forward-circle" size={16} color="#ED6813" />
            <Text className="ml-1.5 text-sm text-slate-500">
              Recognizing{' '}
              <Text className="font-bold text-slate-800">
                {recognition.receiver.full_name}
              </Text>
            </Text>
          </View>

          {/* Message */}
          <Text className="mt-2.5 text-base leading-6 text-slate-700" numberOfLines={5}>
            {recognition.message}
          </Text>

          {/* Reactions */}
          <RecognitionReactionBar recognitionId={recognition.id} />
        </View>

        {/* ── Divider ───────────────────────────────────────────── */}
        <View className="mx-4 h-px bg-slate-100" />

        {/* ── Action Bar ────────────────────────────────────────── */}
        <View className="flex-row px-2 py-1">
          {/* Like */}
          <Pressable
            onPress={handleLike}
            disabled={toggleLike.isPending}
            className="flex-1 flex-row items-center justify-center py-2 active:opacity-60"
          >
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={20}
              color={liked ? '#ED6813' : '#94a3b8'}
            />
            <Text
              className="ml-1.5 text-sm font-medium"
              style={{ color: liked ? '#ED6813' : '#94a3b8' }}
            >
              {likeCount > 0 ? likeCount : 'Like'}
            </Text>
          </Pressable>

          {/* Comment */}
          <Pressable
            onPress={() => setShowComments(true)}
            className="flex-1 flex-row items-center justify-center py-2 active:opacity-60"
          >
            <Ionicons name="chatbubble-outline" size={19} color="#94a3b8" />
            <Text className="ml-1.5 text-sm font-medium text-slate-400">
              {commentsCount > 0 ? commentsCount : 'Comment'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Comment bottom sheet */}
      <CommentSheet
        recognitionId={recognition.id}
        visible={showComments}
        onClose={() => setShowComments(false)}
      />
    </>
  );
});
