import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { Reward } from '@/api/reward-service';

interface RewardCardProps {
  reward: Reward;
  pointsBalance: number;
  onPress: () => void;
}

export function RewardCard({ reward, pointsBalance, onPress }: RewardCardProps) {
  const outOfStock = reward.stock <= 0;
  const canAfford  = pointsBalance >= reward.points_required;

  return (
    <Pressable
      onPress={onPress}
      disabled={outOfStock}
      className="mb-3 flex-1 overflow-hidden rounded-2xl border border-slate-100 bg-white active:bg-slate-50"
      style={{ opacity: outOfStock ? 0.55 : 1 }}
    >
      {/* Image */}
      {reward.image_url ? (
        <Image
          source={{ uri: reward.image_url }}
          className="h-28 w-full"
          contentFit="cover"
        />
      ) : (
        <View className="h-28 w-full items-center justify-center bg-slate-100">
          <Ionicons name="gift" size={36} color="#a78bfa" />
        </View>
      )}

      {/* Info */}
      <View className="p-3">
        <Text className="text-sm font-semibold text-slate-800" numberOfLines={2}>
          {reward.title}
        </Text>

        {/* Points cost */}
        <View className="mt-2 flex-row items-center justify-between">
          <View
            className="flex-row items-center rounded-full px-2 py-0.5"
            style={{ backgroundColor: canAfford ? '#ede9fe' : '#fee2e2' }}
          >
            <Ionicons
              name="star"
              size={12}
              color={canAfford ? '#7c3aed' : '#ef4444'}
            />
            <Text
              className="ml-1 text-xs font-bold"
              style={{ color: canAfford ? '#6d28d9' : '#ef4444' }}
            >
              {reward.points_required} pts
            </Text>
          </View>

          {outOfStock ? (
            <Text className="text-[10px] font-semibold text-red-400">Out of stock</Text>
          ) : (
            <Text className="text-[10px] text-slate-400">{reward.stock} left</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
