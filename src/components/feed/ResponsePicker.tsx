import React, { useState } from 'react';
import {
  View, Text, Pressable, Modal,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RESPONSE_OPTIONS } from '@/hooks/use-recognition-response';

const PURPLE      = '#7B1FA2';
const PURPLE_SOFT = '#ede9fe';

interface ResponsePickerProps {
  /** Existing response text — if set, shows the response instead of the button. */
  response:    string | null;
  /** Whether the current user is the recipient. */
  isRecipient: boolean;
  /** Called with the chosen response string. */
  onSelect:    (response: string) => void;
  /** True while the mutation is in-flight. */
  loading?:    boolean;
}

export function ResponsePicker({
  response,
  isRecipient,
  onSelect,
  loading,
}: ResponsePickerProps) {
  const [open, setOpen] = useState(false);

  // Already responded — show the response for everyone
  if (response) {
    return (
      <View style={s.responseRow}>
        <Ionicons name="chatbubble-ellipses" size={14} color={PURPLE} />
        <Text style={s.responseText}>{response}</Text>
      </View>
    );
  }

  // Not the recipient — nothing to show
  if (!isRecipient) return null;

  return (
    <>
      {/* Trigger button */}
      <Pressable
        onPress={() => setOpen(true)}
        style={s.triggerBtn}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={PURPLE} />
        ) : (
          <>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={PURPLE} />
            <Text style={s.triggerText}>Respond</Text>
          </>
        )}
      </Pressable>

      {/* Options modal */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={s.overlay} onPress={() => setOpen(false)}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Choose a response</Text>
            <Text style={s.sheetSub}>+5 pts awarded for responding</Text>

            {RESPONSE_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                style={s.option}
                onPress={() => {
                  setOpen(false);
                  onSelect(opt);
                }}
              >
                <Ionicons name="chatbubble-outline" size={16} color={PURPLE} />
                <Text style={s.optionText}>{opt}</Text>
              </Pressable>
            ))}

            <Pressable style={s.cancelBtn} onPress={() => setOpen(false)}>
              <Text style={s.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  // Existing response
  responseRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            6,
    marginTop:      8,
    alignSelf:      'flex-end',
  },
  responseText: {
    fontSize:   13,
    color:      PURPLE,
    fontWeight: '600',
    fontStyle:  'italic',
  },

  // Trigger
  triggerBtn: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              5,
    alignSelf:        'flex-end',
    marginTop:        8,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:     20,
    backgroundColor:  PURPLE_SOFT,
  },
  triggerText: {
    fontSize:   12,
    fontWeight: '600',
    color:      PURPLE,
  },

  // Modal
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent:  'flex-end',
  },
  sheet: {
    backgroundColor:      '#fff',
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    paddingHorizontal:    20,
    paddingTop:           20,
    paddingBottom:        36,
  },
  sheetTitle: {
    fontSize:     17,
    fontWeight:   '700',
    color:        '#1e1b4b',
    marginBottom:  4,
  },
  sheetSub: {
    fontSize:     12,
    color:        '#94a3b8',
    marginBottom: 18,
  },
  option: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  optionText: {
    fontSize:   15,
    color:      '#1e1b4b',
    fontWeight: '500',
  },
  cancelBtn: {
    marginTop:      16,
    alignItems:     'center',
    paddingVertical: 12,
  },
  cancelText: {
    fontSize:   14,
    color:      '#94a3b8',
    fontWeight: '600',
  },
});
