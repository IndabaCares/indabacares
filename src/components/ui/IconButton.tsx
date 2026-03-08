import React from 'react';
import { Pressable, type PressableProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface IconButtonProps extends PressableProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  badge?: number;
}

export function IconButton({
  name,
  size = 24,
  color = '#334155',
  ...props
}: IconButtonProps) {
  return (
    <Pressable
      className="h-10 w-10 items-center justify-center rounded-full active:bg-slate-100"
      hitSlop={8}
      {...props}
    >
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  );
}
