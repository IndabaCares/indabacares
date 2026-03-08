import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { BADGE_ICONS } from '@/lib/constants';

interface BadgeItem {
  badge_id: string;
  earned_at: string;
  badges: { slug: string; name: string; icon: string };
}

interface BadgeShowcaseProps {
  badges: BadgeItem[];
}

export function BadgeShowcase({ badges }: BadgeShowcaseProps) {
  if (!badges || badges.length === 0) {
    return (
      <View className="rounded-2xl bg-white p-4">
        <Text className="text-sm font-semibold text-slate-700">Badges</Text>
        <Text className="mt-2 text-center text-sm text-slate-400">
          No badges earned yet. Keep recognizing colleagues!
        </Text>
      </View>
    );
  }

  return (
    <View className="rounded-2xl bg-white p-4">
      <Text className="mb-3 text-sm font-semibold text-slate-700">
        Badges ({badges.length})
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {badges.map((item) => (
          <View key={item.badge_id} className="mr-4 items-center" style={{ width: 64 }}>
            <View className="h-12 w-12 items-center justify-center rounded-full bg-primary-50">
              <Text className="text-2xl">
                {BADGE_ICONS[item.badges.slug] || item.badges.icon}
              </Text>
            </View>
            <Text className="mt-1 text-center text-[10px] font-medium text-slate-600" numberOfLines={2}>
              {item.badges.name}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
