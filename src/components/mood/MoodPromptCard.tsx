import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSubmitMood, useMoodHistory } from '@/hooks/use-mood';
import { MOOD_MAP, type MoodValue } from '@/lib/constants';

const PURPLE = '#7B1FA2';
const ACCENT = '#CE21FB';

export function MoodPromptCard() {
  const { data: history = [] } = useMoodHistory();
  const submitMood = useSubmitMood();

  const [visible,      setVisible]      = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodValue | null>(null);
  const [note,         setNote]         = useState('');

  const today             = new Date().toISOString().split('T')[0];
  const moodSubmittedToday = history.some((e: any) => e.entry_date === today);

  // Auto-close after successful submission
  useEffect(() => {
    if (submitMood.isSuccess) {
      setVisible(false);
      setSelectedMood(null);
      setNote('');
    }
  }, [submitMood.isSuccess]);

  // Don't show the prompt card if already submitted today
  if (moodSubmittedToday) return null;

  function handleSubmit() {
    if (!selectedMood) return;
    submitMood.mutate({ mood: selectedMood, note: note || undefined });
  }

  function handleClose() {
    setVisible(false);
    setSelectedMood(null);
    setNote('');
  }

  return (
    <>
      {/* ── Prompt card (tap to open modal) ── */}
      <Pressable style={styles.card} onPress={() => setVisible(true)}>
        <Text style={styles.cardEmoji}>😊</Text>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>How are you feeling today?</Text>
          <Text style={styles.cardSub}>Tap to check in and earn 5 points</Text>
        </View>
        <View style={styles.cardIcons}>
          {Object.values(MOOD_MAP).map((m) => (
            <Text key={m.label} style={styles.cardIconEmoji}>{m.emoji}</Text>
          ))}
        </View>
      </Pressable>

      {/* ── Modal popup ── */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={handleClose}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.centeredView}
          >
            {/* Stop backdrop tap propagating into modal card */}
            <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>

              {/* Title */}
              <Text style={styles.modalTitle}>How are you feeling?</Text>

              {/* Mood emojis */}
              <View style={styles.emojiRow}>
                {(Object.entries(MOOD_MAP) as [MoodValue, (typeof MOOD_MAP)[MoodValue]][]).map(
                  ([key, val]) => {
                    const active = selectedMood === key;
                    return (
                      <Pressable
                        key={key}
                        onPress={() => setSelectedMood(key)}
                        style={[styles.emojiButton, active && { borderColor: val.color, borderWidth: 2, backgroundColor: val.color + '18' }]}
                      >
                        <Text style={styles.emojiText}>{val.emoji}</Text>
                        <Text style={[styles.emojiLabel, active && { color: val.color, fontWeight: '700' }]}>
                          {val.label}
                        </Text>
                      </Pressable>
                    );
                  }
                )}
              </View>

              {/* Note input */}
              <TextInput
                style={styles.noteInput}
                placeholder="Add a note (optional, only visible to admins)"
                placeholderTextColor="#9CA3AF"
                value={note}
                onChangeText={setNote}
                multiline
                maxLength={500}
              />

              {/* Submit button */}
              <Pressable
                style={[styles.submitButton, !selectedMood && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={!selectedMood || submitMood.isPending}
              >
                {submitMood.isPending ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.submitText}>Submit Mood</Text>
                )}
              </Pressable>

            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // ── Prompt card ────────────────────────────────────────────────────────────
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE7F6',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 0,
  },
  cardEmoji: {
    fontSize: 24,
  },
  cardText: {
    flex: 1,
    marginLeft: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: PURPLE,
  },
  cardSub: {
    fontSize: 11,
    color: '#7C3AED',
    marginTop: 1,
  },
  cardIcons: {
    flexDirection: 'row',
    gap: 2,
  },
  cardIconEmoji: {
    fontSize: 16,
  },

  // ── Modal ──────────────────────────────────────────────────────────────────
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredView: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
  },

  // ── Emoji row ──────────────────────────────────────────────────────────────
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  emojiButton: {
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiText: {
    fontSize: 32,
  },
  emojiLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },

  // ── Note input ─────────────────────────────────────────────────────────────
  noteInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    color: '#374151',
    minHeight: 72,
    textAlignVertical: 'top',
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },

  // ── Submit button ──────────────────────────────────────────────────────────
  submitButton: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#C4B5FD',
  },
  submitText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
