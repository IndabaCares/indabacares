import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { REACTION_EMOJIS } from '@/lib/constants';

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function ReactionPicker({ onSelect, onClose }: ReactionPickerProps) {
  return (
    <Pressable onPress={onClose} className="absolute -top-14 left-0 z-10">
      <View className="flex-row rounded-2xl border border-slate-100 bg-white px-2 py-2 shadow-lg">
        {REACTION_EMOJIS.map((item) => (
          <Pressable
            key={item.emoji}
            onPress={() => onSelect(item.emoji)}
            className="mx-1 h-9 w-9 items-center justify-center rounded-full active:bg-slate-100"
          >
            <Text className="text-xl">{item.emoji}</Text>
          </Pressable>
        ))}
      </View>
    </Pressable>
  );
}
