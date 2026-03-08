import React, { useState } from 'react';
import { View, Text, FlatList, RefreshControl, Pressable, Alert } from 'react-native';
import { useRedemptions, useCancelRedemption } from '@/hooks/use-redemptions';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { REDEMPTION_STATUS } from '@/lib/constants';
import { formatDate } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

export default function OrdersScreen() {
  const { data: orders = [], isLoading, refetch, isRefetching } = useRedemptions();
  const cancelRedemption = useCancelRedemption();

  const handleCancel = (orderId: string, rewardName: string) => {
    Alert.alert(
      'Cancel Order',
      `Are you sure you want to cancel your order for "${rewardName}"? Your stars will be refunded.`,
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: () => cancelRedemption.mutate(orderId),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50 px-4 pt-4">
        {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </View>
    );
  }

  return (
    <FlatList
      data={orders}
      keyExtractor={(item) => item.id}
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      renderItem={({ item }: { item: any }) => {
        const status = REDEMPTION_STATUS[item.status as keyof typeof REDEMPTION_STATUS];
        const isPending = item.status === 'pending';
        return (
          <Card className="mb-3">
            <View className="flex-row">
              {item.reward?.image_url ? (
                <Image
                  source={{ uri: item.reward.image_url }}
                  className="h-16 w-16 rounded-xl"
                  contentFit="cover"
                />
              ) : (
                <View className="h-16 w-16 items-center justify-center rounded-xl bg-slate-100">
                  <Ionicons name="gift" size={24} color="#94a3b8" />
                </View>
              )}
              <View className="ml-3 flex-1">
                <Text className="text-sm font-semibold text-slate-800">
                  {item.reward?.name || 'Reward'}
                </Text>
                <View className="mt-1 flex-row items-center">
                  <Ionicons name="star" size={12} color="#f59e0b" />
                  <Text className="ml-1 text-xs text-slate-500">
                    {item.star_cost} stars
                  </Text>
                </View>
                <Text className="mt-0.5 text-[10px] text-slate-400">
                  {formatDate(item.created_at)}
                </Text>
              </View>
              <Badge label={status?.label || item.status} color={status?.color} />
            </View>

            {/* Delivery info (shown for fulfilled digital rewards) */}
            {item.delivery_info && (
              <View className="mt-2 rounded-lg bg-success-50 px-3 py-2">
                <Text className="text-xs font-medium text-success-700">
                  {item.delivery_info}
                </Text>
              </View>
            )}

            {item.admin_note && (
              <Text className="mt-2 text-xs text-slate-500">
                Note: {item.admin_note}
              </Text>
            )}

            {/* Cancel button for pending orders */}
            {isPending && (
              <Pressable
                onPress={() => handleCancel(item.id, item.reward?.name || 'this reward')}
                disabled={cancelRedemption.isPending}
                className="mt-3 items-center rounded-lg border border-danger-200 bg-danger-50 py-2"
              >
                <Text className="text-xs font-semibold text-danger-600">
                  {cancelRedemption.isPending ? 'Cancelling...' : 'Cancel Order'}
                </Text>
              </Pressable>
            )}
          </Card>
        );
      }}
      ListEmptyComponent={
        <EmptyState
          icon="🛍️"
          title="No orders yet"
          description="Redeem rewards with your stars!"
        />
      }
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#CE21FB" />
      }
    />
  );
}
