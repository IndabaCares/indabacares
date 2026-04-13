import React, { memo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, GestureResponderEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar } from '@/components/ui/Avatar';
import { RECOGNITION_BADGES } from '@/lib/constants';
import { RecognitionReactionBar } from './RecognitionReactionBar';
import { useEmployee } from '@/providers/EmployeeContext';
import { useSubmitResponse, RESPONSE_OPTIONS } from '@/hooks/use-recognition-response';
import type { RecognitionFeedItem } from '@/api/queries';

const LOGO = require('../../../assets/usedlogo.png');

function getBadgeConfig(badge: string) {
  return (
    RECOGNITION_BADGES.find((b) => b.value === badge) ?? {
      value: badge,
      emoji: '🏅',
      color: '#e9d5ff',
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
  const [showPicker, setShowPicker]           = useState(false);
  const [pickerY, setPickerY]                 = useState(0);
  const [showResponseMenu, setShowResponseMenu] = useState(false);

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
    setShowResponseMenu(false);
    submitResponse.mutate(text);
  };

  const senderDept   = recognition.sender.department   ?? recognition.sender.position   ?? null;
  const receiverDept = recognition.receiver.department ?? recognition.receiver.position ?? null;

  return (
    <TouchableOpacity onLongPress={handleLongPress} delayLongPress={350} activeOpacity={0.97}>
      <LinearGradient
        colors={['#3b0764', '#6d28d9', '#7B1FA2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.card}
      >
        {/* ── Logo watermark — bottom-right edge ───────────── */}
        <Image source={LOGO} style={s.logo} resizeMode="contain" />

        {/* ── Receiver row: avatar · name · dept · time ─────── */}
        <View style={s.receiverBlock}>
          <Avatar name={recognition.receiver.full_name} size="lg" />
          <View style={s.receiverInfo}>
            <View style={s.nameRow}>
              <Text style={s.receiverName} numberOfLines={1}>
                {recognition.receiver.full_name}
              </Text>
              {receiverDept ? (
                <Text style={s.receiverDept} numberOfLines={1}> · {receiverDept}</Text>
              ) : null}
            </View>
          </View>
          <Text style={s.timeAgo}>{formatRelativeTime(recognition.created_at)}</Text>
        </View>

        {/* ── Badge pill ────────────────────────────────────── */}
        <View style={[s.badgePill, { backgroundColor: badgeConfig.color + '28' }]}>
          <Text style={s.badgeEmoji}>{badgeConfig.emoji}</Text>
          <Text style={[s.badgeText, { color: badgeConfig.color }]}>{recognition.badge}</Text>
        </View>

        {/* ── Message ───────────────────────────────────────── */}
        <Text style={s.message}>{recognition.message}</Text>

        {/* ── Given by ──────────────────────────────────────── */}
        <View style={s.givenByRow}>
          <Text style={s.givenByLabel}>Given by </Text>
          <Text style={s.givenByName}>{recognition.sender.full_name}</Text>
          {senderDept ? (
            <Text style={s.givenByDept} numberOfLines={1}> · {senderDept}</Text>
          ) : null}
        </View>

        {/* ── Response section ──────────────────────────────── */}
        {localResponse ? (
          <View style={s.responseDisplay}>
            <Text style={s.responseQuote}>"{localResponse}"</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={[s.respondBtn, !isRecipient && s.respondBtnDisabled]}
              onPress={() => isRecipient && setShowResponseMenu((v) => !v)}
              activeOpacity={isRecipient ? 0.7 : 1}
            >
              <Text style={s.respondBtnText}>
                {showResponseMenu ? 'Cancel' : 'Respond'}
              </Text>
            </TouchableOpacity>

            {showResponseMenu && (
              <View style={s.dropdown}>
                {RESPONSE_OPTIONS.map((opt, i) => (
                  <TouchableOpacity
                    key={opt}
                    style={[s.dropdownOption, i === RESPONSE_OPTIONS.length - 1 && s.dropdownOptionLast]}
                    onPress={() => handleResponse(opt)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.dropdownText}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── Emoji reactions (long-press) ──────────────────── */}
        <RecognitionReactionBar
          recognitionId={recognition.id}
          pickerVisible={showPicker}
          pickerY={pickerY}
          onPickerClose={() => setShowPicker(false)}
        />

      </LinearGradient>
    </TouchableOpacity>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginBottom: 14,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    overflow: 'hidden',
    shadowColor: '#3b0764',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },

  // Logo — large watermark bottom-right
  logo: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    width: 100,
    height: 100,
    opacity: 0.12,
  },

  // Receiver row
  receiverBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  receiverInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  receiverName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  receiverDept: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
  },
  timeAgo: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    alignSelf: 'flex-start',
    paddingTop: 2,
  },

  // Badge pill
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 14,
  },
  badgeEmoji: { fontSize: 14 },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },

  // Message
  message: {
    fontSize: 14,
    lineHeight: 22,
    color: '#fff',
    marginBottom: 14,
  },

  // Given by
  givenByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  givenByLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  givenByName: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },
  givenByDept: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    flex: 1,
  },

  // Response display (after responding)
  responseDisplay: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  responseQuote: {
    fontSize: 13,
    color: '#e9d5ff',
    fontStyle: 'italic',
    fontWeight: '600',
  },

  // Respond button
  respondBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginBottom: 8,
  },
  respondBtnDisabled: {
    opacity: 0.4,
  },
  respondBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },

  // Dropdown
  dropdown: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  dropdownOption: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#ede9fe',
  },
  dropdownOptionLast: {
    borderBottomWidth: 0,
  },
  dropdownText: {
    fontSize: 14,
    color: '#3b0764',
    fontWeight: '600',
  },
});
