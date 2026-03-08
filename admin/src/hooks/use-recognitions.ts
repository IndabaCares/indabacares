'use client';

import { useQuery } from '@tanstack/react-query';
import { recognitionsTimeSeriesQuery, topSendersQuery } from '@/api/queries';
import { QUERY_KEYS } from '@/lib/constants';

export function useRecognitionAnalytics(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: QUERY_KEYS.recognitions({ dateFrom, dateTo }),
    queryFn: async () => {
      const [recRes, senderRes] = await Promise.all([
        recognitionsTimeSeriesQuery(dateFrom, dateTo),
        topSendersQuery(dateFrom, dateTo),
      ]);
      if (recRes.error) throw recRes.error;
      if (senderRes.error) throw senderRes.error;
      return {
        recognitions: (recRes.data ?? []) as Array<{ id: string; created_at: string; is_boosted: boolean; thumbs_up_type_id: string; stars_per_recipient: number; sender_id: string }>,
        senders: (senderRes.data ?? []) as Array<{ sender_id: string; sender: { id: string; full_name: string; avatar_url: string | null } }>,
      };
    },
    enabled: !!dateFrom && !!dateTo,
  });
}
