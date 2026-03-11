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

const PURPLE = '#7B1FA2';

// ─── Points Banner ────────────────────────────────────────────────────────────

function PointsBanner({ points }: { points: number }) {
  return (
    <View
      style={{
        backgroundColor: PURPLE,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 32,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            height: 56,
            width: 56,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 16,
            backgroundColor: 'rgba(255,255,255,0.18)',
          }}
        >
          <Ionicons name="star" size={28} color="#CE21FB" />
        </View>
        <View style={{ marginLeft: 16 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase' }}>
            Your Points Balance
          </Text>
          <Text style={{ fontSize: 36, fontWeight: 'bold', color: '#ffffff' }}>
            {points}
          </Text>
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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
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
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#ddd6fe' }} />
              </View>
              <View style={{ height: 1, backgroundColor: '#f5f0ff', marginBottom: 4 }} />
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
            tintColor={PURPLE}
          />
        }
      />
    </View>
  );
}
