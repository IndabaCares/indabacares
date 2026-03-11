import React, { useState } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useLeaderboard } from '@/hooks/use-leaderboard';
import { useEmployee } from '@/providers/EmployeeContext';
import { getBadgeLevel, BADGE_LEVELS, type PeriodType } from '@/api/leaderboard-service';
import { LeaderboardRow } from '@/components/leaderboard/LeaderboardRow';
import { TopThreePodium } from '@/components/leaderboard/TopThreePodium';
import { PeriodTabs } from '@/components/leaderboard/PeriodTabs';
import { EmptyState } from '@/components/ui/EmptyState';
import type { LeaderboardEntry } from '@/api/leaderboard-service';

// ─── My rank banner ───────────────────────────────────────────────────────────

function MyRankBanner({ entries }: { entries: LeaderboardEntry[] }) {
  const { employee } = useEmployee();
  if (!employee) return null;

  const myEntry = entries.find((e) => e.employee_id === employee.employee_id);
  if (!myEntry) return null;

  const badge = getBadgeLevel(myEntry.points_balance);

  return (
    <View
      className="mx-4 mb-4 flex-row items-center rounded-2xl px-4 py-3"
      style={{
        backgroundColor: '#ffffff',
        borderWidth: 1.5,
        borderColor: '#ddd6fe',
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 4,
      }}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: '#ede9fe' }}
      >
        <Text className="text-xl">{badge.emoji}</Text>
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-xs font-semibold text-violet-400">Your ranking</Text>
        <Text className="text-sm font-bold text-violet-900">
          #{myEntry.rank} · {badge.label}
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-2xl font-bold text-violet-700">
          {myEntry.total_points.toLocaleString()}
        </Text>
        <Text className="text-xs text-violet-400">points</Text>
      </View>
    </View>
  );
}

// ─── Badge legend ─────────────────────────────────────────────────────────────

function BadgeLegend() {
  return (
    <View className="mx-4 mb-4 overflow-hidden rounded-2xl border border-violet-100 bg-white">
      <View className="border-b border-violet-100 px-4 py-3">
        <Text className="text-xs font-bold uppercase tracking-widest text-violet-400">
          Badge Levels
        </Text>
      </View>
      <View className="flex-row flex-wrap px-4 py-3 gap-y-2">
        {BADGE_LEVELS.map((b) => (
          <View key={b.label} className="w-1/2 flex-row items-center">
            <View
              className="mr-2 h-6 w-6 items-center justify-center rounded-full"
              style={{ backgroundColor: b.color + '20' }}
            >
              <Text className="text-xs">{b.emoji}</Text>
            </View>
            <View>
              <Text className="text-xs font-semibold text-slate-700">{b.label}</Text>
              <Text className="text-[10px] text-slate-400">
                {b.minPoints === 0 ? '0–49 pts' : `${b.minPoints}+ pts`}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LeaderboardScreen() {
  const [period, setPeriod] = useState<PeriodType>('monthly');
  const { data: entries = [], isLoading, refetch, isRefetching } = useLeaderboard(period);

  const topThree = entries.slice(0, 3) as LeaderboardEntry[];
  const rest     = entries.slice(3)   as LeaderboardEntry[];

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={rest}
        keyExtractor={(item) => item.employee_id}
        renderItem={({ item }) => <LeaderboardRow entry={item} />}
        ListHeaderComponent={
          <View>
            {/* Purple hero header */}
            <View
              style={{
                backgroundColor: '#7C3AED',
                paddingBottom: 28,
              }}
            >
              {/* Period selector */}
              <PeriodTabs value={period} onChange={setPeriod} />

              {/* Podium for top 3 */}
              {entries.length > 0 && <TopThreePodium entries={topThree} />}
            </View>

            {entries.length > 0 ? (
              <View style={{ marginTop: -16, backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
                <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
                  <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#ddd6fe' }} />
                </View>

                {/* My rank */}
                <View className="pt-2">
                  <MyRankBanner entries={entries} />
                </View>

                {/* Divider */}
                {rest.length > 0 && (
                  <View className="mx-4 mb-3 flex-row items-center">
                    <View className="h-px flex-1 bg-violet-100" />
                    <Text className="mx-3 text-xs font-semibold text-violet-300">
                      Rankings 4–{entries.length}
                    </Text>
                    <View className="h-px flex-1 bg-violet-100" />
                  </View>
                )}
              </View>
            ) : null}
          </View>
        }
        ListFooterComponent={
          entries.length > 0 ? (
            <View className="mt-4">
              <BadgeLegend />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="🏆"
            title="No rankings yet"
            description="Start recognizing colleagues to earn points and appear here!"
          />
        }
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#7c3aed"
          />
        }
      />
    </View>
  );
}
