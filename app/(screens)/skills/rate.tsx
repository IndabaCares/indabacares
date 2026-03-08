import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSkillCategories, useSubmitSkillRating } from '@/hooks/use-skills';
import { useSearchProfiles } from '@/hooks/use-profiles';
import { RecipientPicker } from '@/components/recognition/RecipientPicker';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface SelectedProfile {
  id: string;
  full_name: string;
  display_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
}

export default function RateColleagueScreen() {
  const [recipient, setRecipient] = useState<SelectedProfile | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const { data: categories = [] } = useSkillCategories();
  const submitRating = useSubmitSkillRating();

  const allIndicators = categories.flatMap((cat: any) => cat.indicators || []);

  const updateRating = (indicatorId: string, score: number) => {
    setRatings((prev) => ({ ...prev, [indicatorId]: score }));
  };

  const handleSubmit = () => {
    if (!recipient) return;

    const ratingsList = Object.entries(ratings)
      .filter(([_, score]) => score > 0)
      .map(([indicatorId, score]) => ({ indicatorId, score }));

    if (ratingsList.length === 0) return;

    submitRating.mutate(
      { recipientId: recipient.id, ratings: ratingsList },
      { onSuccess: () => router.back() }
    );
  };

  return (
    <ScrollView className="flex-1 bg-slate-50 px-4 pt-4">
      <Text className="mb-2 text-sm font-semibold text-slate-700">Who are you rating?</Text>
      <RecipientPicker
        selected={recipient ? [recipient] : []}
        onSelect={(p) => setRecipient(p)}
        onRemove={() => setRecipient(null)}
      />

      {recipient && categories.map((cat: any) => (
        <Card key={cat.id} className="mb-3 mt-4">
          <Text className="mb-3 text-base font-semibold text-slate-800">{cat.name}</Text>
          {(cat.indicators || []).map((ind: any) => (
            <View key={ind.id} className="mb-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-slate-600">{ind.name}</Text>
                <Text className="text-sm font-bold text-primary-600">
                  {ratings[ind.id] || 0}/5
                </Text>
              </View>
              <View className="mt-1 flex-row items-center">
                {[1, 2, 3, 4, 5].map((score) => (
                  <Text
                    key={score}
                    onPress={() => updateRating(ind.id, score)}
                    className={`mr-3 text-2xl ${
                      (ratings[ind.id] || 0) >= score ? '' : 'opacity-30'
                    }`}
                  >
                    ⭐
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </Card>
      ))}

      {recipient && (
        <Button
          title="Submit Ratings"
          onPress={handleSubmit}
          loading={submitRating.isPending}
          disabled={Object.keys(ratings).length === 0}
          className="mb-10 mt-4"
          size="lg"
        />
      )}
    </ScrollView>
  );
}
