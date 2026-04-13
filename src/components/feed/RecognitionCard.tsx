import React, { memo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, GestureResponderEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar } from '@/components/ui/Avatar';
import { RECOGNITION_BADGES } from '@/lib/constants';
import { RecognitionReactionBar } from './RecognitionReactionBar';
import { useEmployee } from '@/providers/EmployeeContext';
import { useSubmitResponse } from '@/hooks/use-recognition-response';
import { ResponsePicker } from './ResponsePicker';
import type { RecognitionFeedItem } from '@/api/queries';

const LOGO = require('../../../assets/IndabaCaresLogo.png');

function getBadgeConfig(badge: string) {
  return (
    RECOGNITION_BADGES.find((b) => b.value === badge) ?? {
      value: badge,
      emoji: '🏅',
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

interface RecognitionCardProps {
  recognition: RecognitionFeedItem;
}

export const RecognitionCard = memo(function RecognitionCard({
  recognition,
}: RecognitionCardProps) {
  const { employee } = useEmployee();
  const [showPicker, setShowPicker] = useState(false);
  const [pickerY, setPickerY]       = useState(0);

  const handleLongPress = (e: GestureResponderEvent) => {
    setPickerY(e.nativeEvent.pageY);
    setShowPicker(true);
  };

  const badgeConfig = getBadgeConfig(recognition.badge);
  const isRecipient = employee?.employee_id === recognition.receiver.id;

  const [localResponse, setLocalResponse] = useState<string | null>(
    recognition.recipient_response ?? null,
  );
  const submitResponse = useSubmitResponse(recognition.id);

  const handleResponse = (text: string) => {
    setLocalResponse(text);
    submitResponse.mutate(text);
  };

  return (
    <TouchableOpacity onLongPress={handleLongPress} delayLongPress={350} activeOpacity={0.97}>
      <View style={s.card}>

        {/* ── Gradient hero ─────────────────────────────────── */}
        <LinearGradient
          colors={['#4a0072', '#7B1FA2', '#ddd6fe']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          {/* Logo watermark — white on gradient */}
          <Image source={LOGO} style={s.logo} resizeMode="contain" />

          {/* Receiver + Time */}
          <View style={s.receiverBlock}>
            <Avatar name={recognition.receiver.full_name} size="lg" />
            <View style={s.receiverInfo}>
              <Text style={s.receiverName}>{recognition.receiver.full_name}</Text>
              {(recognition.receiver.department ?? recognition.receiver.position) ? (
                <Text style={s.receiverDept} numberOfLines={1}>
                  {recognition.receiver.department ?? recognition.receiver.position}
                </Text>
              ) : null}
            </View>
            <Text style={s.timeAgo}>{formatRelativeTime(recognition.created_at)}</Text>
          </View>

          {/* Badge pill */}
          <View style={[s.badgePill, { backgroundColor: badgeConfig.color + '28' }]}>
            <Text style={s.badgeEmoji}>{badgeConfig.emoji}</Text>
            <Text style={[s.badgeText, { color: badgeConfig.color }]}>{recognition.badge}</Text>
          </View>
        </LinearGradient>

        {/* ── White body ────────────────────────────────────── */}
        <View style={s.body}>

          {/* Message */}
          <Text style={s.message}>{recognition.message}</Text>

          {/* Sent by */}
          <View style={s.sentByRow}>
            <Avatar name={recognition.sender.full_name} size="xs" />
            <View style={s.sentByInfo}>
              <Text style={s.sentByLabel}>Sent by</Text>
              <Text style={s.sentByName}>{recognition.sender.full_name}</Text>
              {(recognition.sender.department ?? recognition.sender.position) ? (
                <Text style={s.sentByDept} numberOfLines={1}>
                  {recognition.sender.department ?? recognition.sender.position}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Receiver response */}
          <ResponsePicker
            response={localResponse}
            isRecipient={isRecipient}
            onSelect={handleResponse}
            loading={submitResponse.isPending}
          />

          {/* Emoji reactions (long-press) */}
          <RecognitionReactionBar
            recognitionId={recognition.id}
            pickerVisible={showPicker}
            pickerY={pickerY}
            onPickerClose={() => setShowPicker(false)}
          />

        </View>
      </View>
    </TouchableOpacity>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#a78bfa',
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#4a0072',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },

  // ── Hero (gradient) ──────────────────────────────────
  hero: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
  },

  logo: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    opacity: 0.2,
  },

  timeAgo: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    alignSelf: 'flex-start',
    paddingTop: 2,
  },

  receiverBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  receiverInfo: {
    flex: 1,
  },
  receiverName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
  },
  receiverDept: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 3,
  },

  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  badgeEmoji: { fontSize: 14 },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },

  // ── Body (white) ─────────────────────────────────────
  body: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },

  sentByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8f7ff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
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
    color: '#1e1b4b',
  },
  sentByDept: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 1,
  },

  message: {
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
    marginBottom: 12,
  },
});
