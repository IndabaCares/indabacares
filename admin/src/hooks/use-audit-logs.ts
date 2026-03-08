'use client';

import { useQuery } from '@tanstack/react-query';
import { auditLogsQuery } from '@/api/queries';
import { QUERY_KEYS } from '@/lib/constants';

export function useAuditLogs(params: {
  action?: string;
  actorId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
}) {
  return useQuery({
    queryKey: QUERY_KEYS.auditLogs(params),
    queryFn: async () => {
      const { data, error, count } = await auditLogsQuery(params);
      if (error) throw error;
      return { logs: data ?? [], total: count ?? 0 };
    },
  });
}
