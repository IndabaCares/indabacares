import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VISIBILITY_OPTIONS } from '@/lib/constants';
import type { Visibility } from '@/types/database';

interface VisibilityPickerProps {
  value: Visibility;
  onChange: (value: Visibility) => void;
}

export function VisibilityPicker({ value, onChange }: VisibilityPickerProps) {
  return (
    <View className="mb-4 flex-row">
      {VISIBILITY_OPTIONS.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className={`mr-2 flex-row items-center rounded-full px-3 py-2 ${
              isSelected ? 'bg-primary-500' : 'bg-slate-100'
            }`}
          >
            <Ionicons
              name={option.icon as any}
              size={14}
              color={isSelected ? '#ffffff' : '#64748b'}
            />
            <Text
              className={`ml-1.5 text-xs font-medium ${
                isSelected ? 'text-white' : 'text-slate-600'
              }`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
