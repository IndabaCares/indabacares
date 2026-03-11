import React from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRewards, useEmployeePoints } from '@/hooks/use-rewards';
import { RewardCard } from '@/components/rewards/RewardCard';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Reward } from '@/api/reward-service';

// ─── Points Banner ────────────────────────────────────────────────────────────

function PointsBanner({ points }: { points: number }) {
  return (
    <View
      style={{
        backgroundColor: '#7C3AED',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 32,
      }}
    >
      <View className="flex-row items-center">
        <View
          className="h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
        >
          <Ionicons name="star" size={28} color="#fbbf24" />
        </View>
        <View className="ml-4 flex-1">
          <Text className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Your Points Balance
          </Text>
          <Text className="text-4xl font-bold text-white">{points}</Text>
        </View>
        <View className="items-end">
          <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>Earn more by</Text>
          <Text className="text-xs font-semibold text-white">getting recognized</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RewardsScreen() {
  const { data: rewards = [], isLoading, refetch, isRefetching } = useRewards();
  const { data: points = 0, isLoading: pointsLoading } = useEmployeePoints();

  if (isLoading || pointsLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={rewards as Reward[]}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ paddingHorizontal: 12, gap: 12 }}
        renderItem={({ item }) => (
          <RewardCard
            reward={item}
            pointsBalance={points}
            onPress={() => router.push(`/(screens)/reward/${item.id}` as any)}
          />
        )}
        ListHeaderComponent={
          <View>
            <PointsBanner points={points} />
            {/* White sheet pulls up over purple */}
            <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, paddingTop: 16 }}>
              <View style={{ alignItems: 'center', marginBottom: 12 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#ddd6fe' }} />
              </View>
              <View className="px-4 pb-1">
                <Text className="text-lg font-bold text-violet-900">
                  Rewards Catalogue
                </Text>
                <Text className="text-xs text-violet-400">
                  {rewards.length} reward{rewards.length !== 1 ? 's' : ''} available
                </Text>
              </View>
              <View className="mb-3 mt-3 h-px bg-violet-50" />
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="🎁"
            title="No rewards yet"
            description="Rewards for your hotel will appear here."
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
