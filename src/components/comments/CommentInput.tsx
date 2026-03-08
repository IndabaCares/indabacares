import React, { useState, useRef, useCallback } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CommentInputProps {
  onSubmit: (body: string) => void;
  onTyping?: () => void;
  loading?: boolean;
}

export function CommentInput({ onSubmit, onTyping, loading }: CommentInputProps) {
  const [text, setText] = useState('');
  const lastTypingRef = useRef(0);

  const handleChangeText = useCallback(
    (value: string) => {
      setText(value);

      // Throttle typing events to max 1 per 2 seconds
      if (onTyping && value.length > 0) {
        const now = Date.now();
        if (now - lastTypingRef.current > 2000) {
          lastTypingRef.current = now;
          onTyping();
        }
      }
    },
    [onTyping]
  );

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setText('');
  };

  return (
    <View className="flex-row items-center border-t border-slate-100 px-4 py-2">
      <TextInput
        value={text}
        onChangeText={handleChangeText}
        placeholder="Write a comment..."
        placeholderTextColor="#94a3b8"
        className="flex-1 rounded-full bg-slate-50 px-4 py-2.5 text-sm text-slate-900"
        multiline
        maxLength={500}
        editable={!loading}
      />
      <Pressable
        onPress={handleSubmit}
        disabled={!text.trim() || loading}
        className="ml-2 h-10 w-10 items-center justify-center rounded-full bg-primary-500 disabled:opacity-40"
      >
        <Ionicons name="send" size={18} color="#ffffff" />
      </Pressable>
    </View>
  );
}
