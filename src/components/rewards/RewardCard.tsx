import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

interface RewardCardProps {
  reward: {
    id: string;
    name: string;
    image_url: string | null;
    star_cost: number;
    stock: number | null;
  };
  onPress: () => void;
}

export function RewardCard({ reward, onPress }: RewardCardProps) {
  const outOfStock = reward.stock !== null && reward.stock <= 0;

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-1 overflow-hidden rounded-2xl border border-slate-100 bg-white active:bg-slate-50"
    >
      {reward.image_url ? (
        <Image
          source={{ uri: reward.image_url }}
          className="h-28 w-full"
          contentFit="cover"
        />
      ) : (
        <View className="h-28 w-full items-center justify-center bg-slate-100">
          <Ionicons name="gift" size={36} color="#94a3b8" />
        </View>
      )}

      <View className="p-3">
        <Text className="text-sm font-semibold text-slate-800" numberOfLines={2}>
          {reward.name}
        </Text>
        <View className="mt-2 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Ionicons name="star" size={14} color="#f59e0b" />
            <Text className="ml-1 text-sm font-bold text-warning-600">
              {reward.star_cost}
            </Text>
          </View>
          {outOfStock && (
            <Text className="text-[10px] font-semibold text-danger-500">Out of stock</Text>
          )}
          {reward.stock !== null && !outOfStock && (
            <Text className="text-[10px] text-slate-400">{reward.stock} left</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
