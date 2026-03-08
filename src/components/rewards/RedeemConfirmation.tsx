import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth-store';

interface RedeemConfirmationProps {
  reward: {
    name: string;
    image_url: string | null;
    star_cost: number;
  };
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function RedeemConfirmation({ reward, onConfirm, onCancel, loading }: RedeemConfirmationProps) {
  const starsBalance = useAuthStore((s) => s.user?.starsBalance ?? 0);
  const canAfford = starsBalance >= reward.star_cost;

  return (
    <View className="p-6">
      <Text className="mb-4 text-center text-lg font-bold text-slate-900">
        Confirm Redemption
      </Text>

      {reward.image_url && (
        <Image
          source={{ uri: reward.image_url }}
          className="mb-4 h-32 w-full self-center rounded-xl"
          contentFit="cover"
        />
      )}

      <Text className="mb-2 text-center text-base font-semibold text-slate-800">
        {reward.name}
      </Text>

      <View className="mb-4 flex-row items-center justify-center">
        <Ionicons name="star" size={20} color="#f59e0b" />
        <Text className="ml-1 text-xl font-bold text-warning-600">{reward.star_cost}</Text>
        <Text className="ml-1 text-sm text-slate-400">stars</Text>
      </View>

      <View className="mb-6 rounded-xl bg-slate-50 p-3">
        <View className="flex-row justify-between">
          <Text className="text-sm text-slate-500">Your balance</Text>
          <Text className="text-sm font-semibold text-slate-700">{starsBalance} stars</Text>
        </View>
        <View className="mt-1 flex-row justify-between">
          <Text className="text-sm text-slate-500">After redemption</Text>
          <Text className={`text-sm font-semibold ${canAfford ? 'text-success-600' : 'text-danger-500'}`}>
            {starsBalance - reward.star_cost} stars
          </Text>
        </View>
      </View>

      {!canAfford && (
        <Text className="mb-4 text-center text-sm text-danger-500">
          You don't have enough stars for this reward.
        </Text>
      )}

      <View className="flex-row">
        <View className="mr-2 flex-1">
          <Button title="Cancel" variant="outline" onPress={onCancel} />
        </View>
        <View className="flex-1">
          <Button
            title="Redeem"
            onPress={onConfirm}
            loading={loading}
            disabled={!canAfford}
          />
        </View>
      </View>
    </View>
  );
}
