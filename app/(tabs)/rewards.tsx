import React, { useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useRewards, useRewardCategories } from '@/hooks/use-rewards';
import { useAuthStore } from '@/stores/auth-store';
import { RewardCard } from '@/components/rewards/RewardCard';
import { CategoryFilter } from '@/components/rewards/CategoryFilter';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import { View as V, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function RewardsScreen() {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const user = useAuthStore((s) => s.user);
  const { data: categories = [] } = useRewardCategories();
  const { data: rewards = [], isLoading, refetch, isRefetching } = useRewards(selectedCategory);

  return (
    <View className="flex-1 bg-slate-50">
      <FlatList
        data={rewards}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ paddingHorizontal: 12, gap: 12 }}
        renderItem={({ item }) => (
          <RewardCard
            reward={item as any}
            onPress={() => router.push(`/(screens)/reward/${item.id}`)}
          />
        )}
        ListHeaderComponent={
          <View className="px-4 pt-4">
            {/* Balance */}
            <Card className="mb-4 flex-row items-center">
              <Ionicons name="star" size={28} color="#f59e0b" />
              <V className="ml-3">
                <Text className="text-xs text-slate-500">Your Stars</Text>
                <Text className="text-2xl font-bold text-slate-900">
                  {user?.starsBalance ?? 0}
                </Text>
              </V>
            </Card>

            <CategoryFilter
              categories={categories as any}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon="🎁"
              title="No rewards available"
              description="Check back soon for new rewards!"
            />
          ) : (
            <View className="px-4">
              {[1, 2].map((i) => <SkeletonCard key={i} />)}
            </View>
          )
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
