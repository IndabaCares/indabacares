import React from 'react';
import { View, Pressable, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  onPress?: () => void;
  padded?: boolean;
}

export function Card({ children, onPress, padded = true, className, ...props }: CardProps) {
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress}
      className={`rounded-2xl border border-slate-100 bg-white shadow-sm ${
        padded ? 'p-4' : ''
      } ${onPress ? 'active:bg-slate-50' : ''} ${className || ''}`}
      {...(props as any)}
    >
      {children}
    </Wrapper>
  );
}
