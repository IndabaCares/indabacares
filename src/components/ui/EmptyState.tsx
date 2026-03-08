import React from 'react';
import { View, Text } from 'react-native';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      {icon && <Text className="mb-4 text-5xl">{icon}</Text>}
      <Text className="mb-2 text-center text-lg font-bold text-slate-800">{title}</Text>
      {description && (
        <Text className="mb-6 text-center text-sm text-slate-500">{description}</Text>
      )}
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} size="sm" />
      )}
    </View>
  );
}
