'use client';

import { useQuery } from '@tanstack/react-query';
import { happinessScoresQuery, moodEntriesQuery, activeUserCountQuery } from '@/api/queries';
import { QUERY_KEYS } from '@/lib/constants';

export function useMoodAnalytics(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: QUERY_KEYS.moodAnalytics({ dateFrom, dateTo }),
    queryFn: async () => {
      const [happinessRes, moodRes, usersRes] = await Promise.all([
        happinessScoresQuery(dateFrom, dateTo),
        moodEntriesQuery(dateFrom, dateTo),
        activeUserCountQuery(),
      ]);
      if (happinessRes.error) throw happinessRes.error;
      if (moodRes.error) throw moodRes.error;
      return {
        happinessScores: (happinessRes.data ?? []) as Array<{ company_id: string; department_id: string | null; entry_date: string; submission_count: number; happiness_score: number }>,
        moodEntries: (moodRes.data ?? []) as Array<{ id: string; mood: string; entry_date: string; user_id: string }>,
        activeUserCount: usersRes.count ?? 0,
      };
    },
    enabled: !!dateFrom && !!dateTo,
  });
}
