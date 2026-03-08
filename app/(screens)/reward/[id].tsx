import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRewardDetail, useRedeemReward } from '@/hooks/use-rewards';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { RedeemConfirmation } from '@/components/rewards/RedeemConfirmation';

export default function RewardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showConfirm, setShowConfirm] = useState(false);
  const starsBalance = useAuthStore((s) => s.user?.starsBalance ?? 0);

  const { data: reward, isLoading } = useRewardDetail(id);
  const redeemReward = useRedeemReward();

  if (isLoading || !reward) {
    return (
      <View className="flex-1 bg-white p-4">
        <SkeletonCard />
      </View>
    );
  }

  const outOfStock = reward.stock !== null && reward.stock <= 0;
  const canAfford = starsBalance >= reward.star_cost;

  const handleRedeem = () => {
    redeemReward.mutate(reward.id, {
      onSuccess: () => setShowConfirm(false),
    });
  };

  if (showConfirm) {
    return (
      <View className="flex-1 justify-center bg-white">
        <RedeemConfirmation
          reward={reward}
          onConfirm={handleRedeem}
          onCancel={() => setShowConfirm(false)}
          loading={redeemReward.isPending}
        />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white">
      {reward.image_url ? (
        <Image
          source={{ uri: reward.image_url }}
          className="h-64 w-full"
          contentFit="cover"
        />
      ) : (
        <View className="h-64 w-full items-center justify-center bg-slate-100">
          <Ionicons name="gift" size={64} color="#94a3b8" />
        </View>
      )}

      <View className="p-6">
        <Text className="text-2xl font-bold text-slate-900">{reward.name}</Text>

        <View className="mt-3 flex-row items-center">
          <Ionicons name="star" size={24} color="#f59e0b" />
          <Text className="ml-2 text-2xl font-bold text-warning-600">
            {reward.star_cost}
          </Text>
          <Text className="ml-1 text-sm text-slate-400">stars</Text>
        </View>

        {(reward as any).category && (
          <View className="mt-2 self-start rounded-full bg-slate-100 px-3 py-1">
            <Text className="text-xs font-medium text-slate-500">
              {(reward as any).category.name}
            </Text>
          </View>
        )}

        {reward.description && (
          <Text className="mt-4 text-base leading-6 text-slate-600">
            {reward.description}
          </Text>
        )}

        {/* Stock info */}
        {reward.stock !== null && (
          <View className="mt-4 flex-row items-center">
            <Ionicons
              name={outOfStock ? 'close-circle' : 'checkmark-circle'}
              size={18}
              color={outOfStock ? '#ef4444' : '#22c55e'}
            />
            <Text className={`ml-1 text-sm ${outOfStock ? 'text-danger-500' : 'text-success-600'}`}>
              {outOfStock ? 'Out of stock' : `${reward.stock} remaining`}
            </Text>
          </View>
        )}

        {/* Balance info */}
        <Card className="mt-6 flex-row items-center justify-between">
          <Text className="text-sm text-slate-500">Your balance</Text>
          <View className="flex-row items-center">
            <Ionicons name="star" size={16} color="#f59e0b" />
            <Text className="ml-1 text-base font-bold text-slate-800">
              {starsBalance}
            </Text>
          </View>
        </Card>

        <Button
          title={outOfStock ? 'Out of Stock' : !canAfford ? 'Not Enough Stars' : 'Redeem Reward'}
          onPress={() => setShowConfirm(true)}
          disabled={outOfStock || !canAfford}
          size="lg"
          className="mt-6"
        />
      </View>
    </ScrollView>
  );
}
