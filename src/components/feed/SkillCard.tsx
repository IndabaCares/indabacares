import React, { memo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { CommentSheet } from './CommentSheet';
import { RecognitionReactionBar } from './RecognitionReactionBar';
import { useLikes, useToggleLike } from '@/hooks/use-likes';
import { useEmployee } from '@/providers/EmployeeContext';
import { useSubmitResponse } from '@/hooks/use-recognition-response';
import { ResponsePicker } from './ResponsePicker';
import type { RecognitionFeedItem } from '@/api/queries';

const BLUE = '#0284c7';
const LOGO = require('../../../assets/IndabaCaresLogo.png');

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

export const SKILL_BADGE_VALUES = new Set(SKILL_BADGES.map((b) => b.value));

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

  const [localResponse, setLocalResponse] = useState<string | null>(
    recognition.recipient_response ?? null,
  );
  const submitResponse = useSubmitResponse(recognition.id);

  const handleLike = () => toggleLike.mutate({ likeId: myLike?.id ?? null });

  const handleResponse = (text: string) => {
    setLocalResponse(text);
    submitResponse.mutate(text);
  };

  return (
    <>
      <TouchableOpacity onLongPress={handleLongPress} delayLongPress={350} activeOpacity={0.97}>
        <View style={s.card}>

          {/* ── IndabaCares logo — bottom-right watermark ─────── */}
          <Image source={LOGO} style={s.logo} resizeMode="contain" />

          {/* ── Time ──────────────────────────────────────────── */}
          <Text style={s.timeAgo}>{formatRelativeTime(recognition.created_at)}</Text>

          {/* ── Receiver header row ───────────────────────────── */}
          <View style={s.receiverBlock}>
            <Avatar name={recognition.receiver.full_name} uri={recognition.receiver.photo_url ?? undefined} size="lg" />
            <View style={s.receiverInfo}>
              <Text style={s.receiverName} numberOfLines={1}>{recognition.receiver.full_name}</Text>
              {(recognition.receiver.department ?? recognition.receiver.position) ? (
                <Text style={s.receiverDept} numberOfLines={1}>
                  {recognition.receiver.department ?? recognition.receiver.position}
                </Text>
              ) : null}
            </View>
          </View>

          {/* ── Skill badge pill ──────────────────────────────── */}
          <View style={[s.badgePill, { backgroundColor: skillConfig.color + '18' }]}>
            <Text style={s.badgeEmoji}>{skillConfig.emoji}</Text>
            <Text style={[s.badgeText, { color: skillConfig.color }]} numberOfLines={1}>{recognition.badge}</Text>
          </View>

          {/* ── Sent by ───────────────────────────────────────── */}
          <View style={s.sentByRow}>
            <Avatar name={recognition.sender.full_name} uri={recognition.sender.photo_url ?? undefined} size="xs" />
            <View style={s.sentByInfo}>
              <Text style={s.sentByLabel}>Sent by</Text>
              <Text style={s.sentByName} numberOfLines={1}>{recognition.sender.full_name}</Text>
              {(recognition.sender.department ?? recognition.sender.position) ? (
                <Text style={s.sentByDept} numberOfLines={1}>
                  {recognition.sender.department ?? recognition.sender.position}
                </Text>
              ) : null}
            </View>
          </View>

          {/* ── Message ───────────────────────────────────────── */}
          <Text style={s.message} numberOfLines={4}>{recognition.message}</Text>

          {/* ── Recipient response ────────────────────────────── */}
          <ResponsePicker
            response={localResponse}
            isRecipient={isRecipient}
            onSelect={handleResponse}
            loading={submitResponse.isPending}
          />

          {/* ── Emoji reactions (long-press) ──────────────────── */}
          <RecognitionReactionBar
            recognitionId={recognition.id}
            pickerVisible={showPicker}
            pickerY={pickerY}
            onPickerClose={() => setShowPicker(false)}
          />

          {/* ── Divider ───────────────────────────────────────── */}
          <View style={s.divider} />

          {/* ── Action bar ────────────────────────────────────── */}
          <View style={s.actionBar}>
            <TouchableOpacity
              onPress={handleLike}
              disabled={toggleLike.isPending}
              style={s.actionBtn}
              activeOpacity={0.7}
            >
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={20}
                color={liked ? '#ef4444' : '#94a3b8'}
              />
              <Text style={[s.actionText, liked && { color: '#ef4444' }]}>
                {likeCount > 0 ? likeCount : 'Like'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowComments(true)}
              style={s.actionBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-outline" size={19} color="#94a3b8" />
              <Text style={s.actionText}>
                {commentsCount > 0 ? commentsCount : 'Comment'}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </TouchableOpacity>

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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0f2fe',
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },

  // Logo
  logo: {
    position: 'absolute',
    bottom: 4,
    right: 6,
    width: 34,
    height: 34,
    opacity: 0.12,
  },

  // Time
  timeAgo: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 14,
  },

  // Receiver — header row
  receiverBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    paddingTop: 2,
  },
  receiverInfo: {
    flex: 1,
  },
  receiverName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0c4a6e',
  },
  receiverDept: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },

  // Badge
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  badgeEmoji: { fontSize: 14 },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },

  // Sent by
  sentByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 8,
  },
  sentByInfo: {
    flex: 1,
  },
  sentByLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  sentByName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0c4a6e',
  },
  sentByDept: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 1,
  },

  // Message
  message: {
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
    marginBottom: 4,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#f0f9ff',
    marginTop: 8,
    marginBottom: 2,
  },

  // Actions
  actionBar: {
    flexDirection: 'row',
    paddingTop: 2,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  actionText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '500',
    color: '#94a3b8',
  },
});
