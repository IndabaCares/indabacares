import React from 'react';
import { Pressable, Text } from 'react-native';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ label, selected = false, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`mr-2 rounded-full px-4 py-2 ${
        selected ? 'bg-primary-500' : 'bg-slate-100'
      }`}
    >
      <Text
        className={`text-sm font-medium ${
          selected ? 'text-white' : 'text-slate-600'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
