import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useMySkillScores } from '@/hooks/use-skills';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

export default function MyScoresScreen() {
  const { data: scores = [], isLoading } = useMySkillScores();

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50 px-4 pt-4">
        {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </View>
    );
  }

  if (scores.length === 0) {
    return (
      <EmptyState
        icon="📊"
        title="No skill ratings yet"
        description="Ask your colleagues to rate you!"
      />
    );
  }

  // Group scores by category
  type GroupedCategory = { name: string; indicators: Array<{ name: string; avg: number; count: number }> };
  const grouped = (scores as any[]).reduce<Record<string, GroupedCategory>>((acc: Record<string, GroupedCategory>, s: any) => {
    const catName = s.indicator?.category?.name || 'Other';
    const catId = s.indicator?.category?.id || 'other';
    if (!acc[catId]) {
      acc[catId] = { name: catName, indicators: [] };
    }

    const existing = acc[catId].indicators.find((i: any) => i.name === s.indicator?.name);
    if (existing) {
      existing.avg = (existing.avg * existing.count + s.score) / (existing.count + 1);
      existing.count++;
    } else {
      acc[catId].indicators.push({
        name: s.indicator?.name || 'Unknown',
        avg: s.score,
        count: 1,
      });
    }

    return acc;
  }, {});

  return (
    <ScrollView className="flex-1 bg-slate-50 px-4 pt-4">
      <Text className="mb-4 text-lg font-bold text-slate-900">Your Skill Scores</Text>

      {Object.entries(grouped).map(([catId, cat]) => (
        <Card key={catId} className="mb-4">
          <Text className="mb-3 text-base font-semibold text-slate-800">{cat.name}</Text>
          {cat.indicators.map((ind) => (
            <View key={ind.name} className="mb-3">
              <View className="mb-1 flex-row items-center justify-between">
                <Text className="text-sm text-slate-600">{ind.name}</Text>
                <Text className="text-sm font-bold text-primary-600">
                  {ind.avg.toFixed(1)}/5
                </Text>
              </View>
              <ProgressBar progress={ind.avg / 5} />
              <Text className="mt-0.5 text-right text-[10px] text-slate-400">
                {ind.count} rating{ind.count !== 1 ? 's' : ''}
              </Text>
            </View>
          ))}
        </Card>
      ))}
    </ScrollView>
  );
}
