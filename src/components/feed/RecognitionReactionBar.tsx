import React, { memo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useEmployee } from '@/providers/EmployeeContext';
import {
  useRecognitionReactions,
  useSubmitReaction,
  type ReactionType,
} from '@/hooks/use-recognition-reactions';
import { useReactionBalance } from '@/hooks/use-reaction-balance';
import { ReactionExhaustedModal } from '@/components/reactions/ReactionExhaustedModal';

// ─── Config ───────────────────────────────────────────────────────────────────

const REACTIONS: { type: ReactionType; emoji: string }[] = [
  { type: 'heart',     emoji: '❤️' },
  { type: 'smile',     emoji: '😊' },
  { type: 'thumbs_up', emoji: '👍' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface RecognitionReactionBarProps {
  recognitionId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const RecognitionReactionBar = memo(function RecognitionReactionBar({
  recognitionId,
}: RecognitionReactionBarProps) {
  const { employee } = useEmployee();
  const { data: reactions = [] } = useRecognitionReactions(recognitionId);
  const { data: balance }        = useReactionBalance();
  const submit                   = useSubmitReaction(recognitionId);

  const [exhaustedType, setExhaustedType] = useState<ReactionType | null>(null);

  // Current employee's reaction row (null if they haven't reacted)
  const myReaction = reactions.find((r) => r.employee_id === employee?.employee_id) ?? null;

  // Per-type counts
  const counts = reactions.reduce<Record<ReactionType, number>>(
    (acc, r) => { acc[r.reaction_type] = (acc[r.reaction_type] ?? 0) + 1; return acc; },
    { heart: 0, smile: 0, thumbs_up: 0 },
  );

  const handlePress = (type: ReactionType) => {
    if (submit.isPending) return;

    // Pressing the active reaction → remove it (toggle off)
    const existingId = myReaction?.reaction_type === type ? myReaction.id : null;

    submit.mutate({ reactionType: type, existingId }, {
      onError: (error) => {
        // Only show exhausted modal when adding (not removing)
        if (!existingId) {
          setExhaustedType(type);
        }
      },
    });
  };

  return (
    <>
      <View className="mt-3 flex-row items-center gap-2">
        {REACTIONS.map(({ type, emoji }) => {
          const count    = counts[type];
          const isActive = myReaction?.reaction_type === type;

          return (
            <Pressable
              key={type}
              onPress={() => handlePress(type)}
              disabled={submit.isPending}
              className="flex-row items-center rounded-full px-3 py-1.5 active:opacity-60"
              style={{
                backgroundColor: isActive ? '#ED681318' : '#f1f5f9',
                borderWidth:     1,
                borderColor:     isActive ? '#ED681340' : 'transparent',
              }}
            >
              <Text className="text-sm leading-none">{emoji}</Text>
              {count > 0 && (
                <Text
                  className="ml-1 text-xs font-semibold"
                  style={{ color: isActive ? '#ED6813' : '#64748b' }}
                >
                  {count}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {exhaustedType && balance && (
        <ReactionExhaustedModal
          visible
          onClose={() => setExhaustedType(null)}
          exhaustedType={exhaustedType}
          balance={balance}
        />
      )}
    </>
  );
});
