import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { skillCategoriesQuery, mySkillScoresQuery, submitSkillRating } from '@/api/queries';
import { QUERY_KEYS } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';

export function useSkillCategories() {
  const company = useAuthStore((s) => s.company);

  return useQuery({
    queryKey: QUERY_KEYS.skillCategories,
    queryFn: async () => {
      if (!company) return [];
      const { data, error } = await skillCategoriesQuery(company.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!company,
    staleTime: Infinity,
  });
}

export function useMySkillScores() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['my-skill-scores'],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await mySkillScoresQuery(user.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSubmitSkillRating() {
  const company = useAuthStore((s) => s.company);
  const showToast = useUIStore((s) => s.showToast);

  return useMutation({
    mutationFn: async ({
      recipientId,
      ratings,
    }: {
      recipientId: string;
      ratings: Array<{ indicatorId: string; score: number }>;
    }) => {
      if (!company) throw new Error('No company context');
      const { error } = await submitSkillRating(company.id, recipientId, ratings);
      if (error) throw error;
    },
    onSuccess: () => {
      showToast({ type: 'success', message: 'Skill ratings submitted!' });
    },
    onError: (error: Error) => {
      showToast({ type: 'error', message: error.message });
    },
  });
}
