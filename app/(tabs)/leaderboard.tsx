import React, { useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { useLeaderboard } from '@/hooks/use-leaderboard';
import { getPeriodKey } from '@/utils/format';
import { LeaderboardRow } from '@/components/leaderboard/LeaderboardRow';
import { TopThreePodium } from '@/components/leaderboard/TopThreePodium';
import { PeriodTabs } from '@/components/leaderboard/PeriodTabs';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

type PeriodType = 'monthly' | 'quarterly' | 'annual';

export default function LeaderboardScreen() {
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const periodKey = getPeriodKey(periodType);

  const { data: entries = [], isLoading, refetch, isRefetching } = useLeaderboard(periodType, periodKey);

  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <View className="flex-1 bg-slate-50">
      <FlatList
        data={rest}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <LeaderboardRow entry={item as any} />}
        ListHeaderComponent={
          <View>
            <PeriodTabs value={periodType} onChange={setPeriodType} />
            {isLoading ? (
              <View className="px-4">
                {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
              </View>
            ) : entries.length > 0 ? (
              <TopThreePodium entries={topThree as any} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon="🏆"
              title="No leaderboard data"
              description="Leaderboard updates daily. Start recognizing colleagues!"
            />
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#6366f1"
          />
        }
      />
    </View>
  );
}
