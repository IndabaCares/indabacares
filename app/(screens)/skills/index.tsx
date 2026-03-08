import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSkillCategories } from '@/hooks/use-skills';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/Skeleton';

export default function SkillsHubScreen() {
  const { data: categories = [], isLoading } = useSkillCategories();

  return (
    <ScrollView className="flex-1 bg-slate-50 px-4 pt-4">
      {/* Action buttons */}
      <View className="mb-6 flex-row">
        <View className="mr-2 flex-1">
          <Button
            title="Rate a Colleague"
            onPress={() => router.push('/(screens)/skills/rate')}
            icon={<Ionicons name="star-outline" size={18} color="#fff" className="mr-2" />}
          />
        </View>
        <View className="flex-1">
          <Button
            title="My Scores"
            variant="outline"
            onPress={() => router.push('/(screens)/skills/my-scores')}
          />
        </View>
      </View>

      {/* Categories */}
      <Text className="mb-3 text-lg font-bold text-slate-900">Skill Categories</Text>
      {isLoading ? (
        [1, 2, 3].map((i) => <SkeletonCard key={i} />)
      ) : (
        categories.map((cat: any) => (
          <Card key={cat.id} className="mb-3">
            <Text className="text-base font-semibold text-slate-800">{cat.name}</Text>
            {cat.indicators && (
              <View className="mt-2">
                {cat.indicators.map((ind: any) => (
                  <View key={ind.id} className="mb-1 flex-row items-start">
                    <View className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-primary-400" />
                    <View className="flex-1">
                      <Text className="text-sm text-slate-600">{ind.name}</Text>
                      {ind.description && (
                        <Text className="text-xs text-slate-400">{ind.description}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Card>
        ))
      )}
    </ScrollView>
  );
}
