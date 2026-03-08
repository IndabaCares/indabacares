import React from 'react';
import { View, Text } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import type { AuthMeResponse } from '@/types/api';

interface ProfileHeaderProps {
  user: AuthMeResponse['user'];
  company: AuthMeResponse['company'];
}

export function ProfileHeader({ user, company }: ProfileHeaderProps) {
  return (
    <View className="items-center bg-white px-6 pb-6 pt-4">
      <Avatar uri={user.avatarUrl} name={user.fullName} size="xl" />
      <Text className="mt-3 text-xl font-bold text-slate-900">
        {user.displayName || user.fullName}
      </Text>
      {user.jobTitle && (
        <Text className="mt-0.5 text-sm text-slate-500">{user.jobTitle}</Text>
      )}
      <View className="mt-2 flex-row items-center">
        <Badge label={user.role.replace('_', ' ')} />
        {user.department && (
          <Badge label={user.department.name} color="#22c55e" />
        )}
      </View>
      <Text className="mt-2 text-xs text-slate-400">{company.name}</Text>
      {user.loginStreak > 1 && (
        <Text className="mt-1 text-sm font-medium text-warning-500">
          🔥 {user.loginStreak} day streak
        </Text>
      )}
    </View>
  );
}
