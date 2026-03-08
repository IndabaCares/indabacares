import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moodHistoryQuery } from '@/api/queries';
import { submitMood } from '@/api/edge-functions';
import { QUERY_KEYS } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import type { SubmitMoodRequest } from '@/types/api';

export function useMoodHistory() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: QUERY_KEYS.moodHistory,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await moodHistoryQuery(user.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useSubmitMood() {
  const queryClient = useQueryClient();
  const setMoodSubmitted = useAuthStore((s) => s.setMoodSubmitted);
  const showToast = useUIStore((s) => s.showToast);

  return useMutation({
    mutationFn: (body: SubmitMoodRequest) => submitMood(body),
    onSuccess: (data) => {
      setMoodSubmitted(true);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.moodHistory });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.me });
      showToast({
        type: 'success',
        message: `${data.message} (+${data.pointsEarned} points)`,
      });
    },
    onError: (error: Error) => {
      showToast({ type: 'error', message: error.message });
    },
  });
}
