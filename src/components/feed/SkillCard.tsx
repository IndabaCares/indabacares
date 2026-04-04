import React, { memo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { CommentSheet } from './CommentSheet';
import { RecognitionReactionBar } from './RecognitionReactionBar';
import { useLikes, useToggleLike } from '@/hooks/use-likes';
import { useEmployee } from '@/providers/EmployeeContext';
import { useSubmitResponse } from '@/hooks/use-recognition-response';
import { ResponsePicker } from './ResponsePicker';
import type { RecognitionFeedItem } from '@/api/queries';

const PURPLE = '#7B1FA2';

const SKILL_BADGES = [
  { value: 'Leadership',       emoji: '👑', color: '#F59E0B' },
  { value: 'Teamwork',         emoji: '🤝', color: '#3B82F6' },
  { value: 'Communication',    emoji: '💬', color: '#10B981' },
  { value: 'Problem Solving',  emoji: '🧩', color: '#8B5CF6' },
  { value: 'Customer Service', emoji: '🌟', color: '#EC4899' },
  { value: 'Creativity',       emoji: '💡', color: '#F97316' },
  { value: 'Reliability',      emoji: '⏰', color: '#06B6D4' },
  { value: 'Positivity',       emoji: '😊', color: '#84CC16' },
];

function getSkillConfig(badge: string) {
  return (
    SKILL_BADGES.find((b) => b.value === badge) ?? {
      value: badge,
      emoji: '⭐',
      color: '#94a3b8',
    }
  );
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface SkillCardProps {
  recognition: RecognitionFeedItem;
}

export const SkillCard = memo(function SkillCard({ recognition }: SkillCardProps) {
  const { employee } = useEmployee();
  const [showComments, setShowComments] = useState(false);
  const [showPicker, setShowPicker]     = useState(false);
  const [pickerY, setPickerY]           = useState(0);

  const handleLongPress = (e: GestureResponderEvent) => {
    setPickerY(e.nativeEvent.pageY);
    setShowPicker(true);
  };

  const { data: likes = [] } = useLikes(recognition.id);
  const toggleLike = useToggleLike(recognition.id);

  const myLike    = likes.find((l) => l.employee_id === employee?.employee_id);
  const liked     = !!myLike;
  const likeCount = likes.length;
  const commentsCount = recognition.comments_count?.[0]?.count ?? 0;
  const skillConfig   = getSkillConfig(recognition.badge);
  const isRecipient   = employee?.employee_id === recognition.receiver.id;

  const [localResponse, setLocalResponse] = useState<string | null>(recognition.recipient_response ?? null);
  const submitResponse = useSubmitResponse(recognition.id);

  const handleLike = () => toggleLike.mutate({ likeId: myLike?.id ?? null });

  const handleResponse = (text: string) => {
    setLocalResponse(text);
    submitResponse.mutate(text);
  };

  return (
    <>
      <Pressable onLongPress={handleLongPress} delayLongPress={350}>
      <View style={s.card}>

        {/* ── Sender row ─────────────────────────────────── */}
        <View style={s.senderRow}>
          <Avatar name={recognition.sender.full_name} size="md" />
          <View style={s.senderInfo}>
            <Text style={s.senderName}>{recognition.sender.full_name}</Text>
            {recognition.sender.position && (
              <Text style={s.senderTitle}>{recognition.sender.position}</Text>
            )}
          </View>
          <Text style={s.timeAgo}>{formatRelativeTime(recognition.created_at)}</Text>
        </View>

        {/* ── Skill badge pill ────────────────────────────── */}
        <View style={[s.badgePill, { backgroundColor: skillConfig.color + '18' }]}>
          <Text style={s.badgeEmoji}>{skillConfig.emoji}</Text>
          <Text style={[s.badgeText, { color: skillConfig.color }]}>{recognition.badge}</Text>
        </View>

        {/* ── Recipient card ──────────────────────────────── */}
        <View style={s.recipientCard}>
          <Ionicons name="star" size={17} color={PURPLE} />
          <Text style={s.recognisingLabel}> Skill awarded to </Text>
          <Avatar name={recognition.receiver.full_name} size="xs" />
          <View style={s.recipientTextWrap}>
            <Text style={s.recipientName}>{recognition.receiver.full_name}</Text>
            {recognition.receiver.position && (
              <Text style={s.recipientTitle} numberOfLines={1}>
                {' · '}{recognition.receiver.position}
              </Text>
            )}
          </View>
        </View>

        {/* ── Message ─────────────────────────────────────── */}
        <Text style={s.message}>{recognition.message}</Text>

        {/* ── Recipient response ──────────────────────────── */}
        <ResponsePicker
          response={localResponse}
          isRecipient={isRecipient}
          onSelect={handleResponse}
          loading={submitResponse.isPending}
        />

        {/* ── Emoji reactions ─────────────────────────────── */}
        <RecognitionReactionBar
          recognitionId={recognition.id}
          pickerVisible={showPicker}
          pickerY={pickerY}
          onPickerClose={() => setShowPicker(false)}
        />

        {/* ── Date/time ───────────────────────────────────── */}
        <Text style={s.dateText}>{formatDateTime(recognition.created_at)}</Text>

        {/* ── Divider ─────────────────────────────────────── */}
        <View style={s.divider} />

        {/* ── Action bar ──────────────────────────────────── */}
        <View style={s.actionBar}>
          <Pressable
            onPress={handleLike}
            disabled={toggleLike.isPending}
            style={s.actionBtn}
          >
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={20}
              color={liked ? '#ef4444' : '#94a3b8'}
            />
            <Text style={[s.actionText, liked && { color: '#ef4444' }]}>
              {likeCount > 0 ? likeCount : 'Like'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setShowComments(true)}
            style={s.actionBtn}
          >
            <Ionicons name="chatbubble-outline" size={19} color="#94a3b8" />
            <Text style={s.actionText}>
              {commentsCount > 0 ? commentsCount : 'Comment'}
            </Text>
          </Pressable>
        </View>

      </View>
      </Pressable>

      <CommentSheet
        recognitionId={recognition.id}
        visible={showComments}
        onClose={() => setShowComments(false)}
      />
    </>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e0f2fe',
    marginBottom: 14,
    padding: 16,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },

  // Sender
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  senderInfo: {
    flex: 1,
    marginLeft: 10,
  },
  senderName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e1b4b',
  },
  senderTitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 1,
  },
  timeAgo: {
    fontSize: 11,
    color: '#94a3b8',
  },

  // Badge
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 10,
  },
  badgeEmoji: { fontSize: 14 },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 5,
  },

  // Recipient
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
  },
  recognisingLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  recipientTextWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  recipientName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e1b4b',
  },
  recipientTitle: {
    fontSize: 12,
    color: '#94a3b8',
    flex: 1,
  },

  // Message
  message: {
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
    marginBottom: 4,
  },

  // Date
  dateText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 10,
    marginBottom: 12,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 4,
  },

  // Actions
  actionBar: {
    flexDirection: 'row',
    paddingTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  actionText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '500',
    color: '#94a3b8',
  },
});
