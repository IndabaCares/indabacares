import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEmployee } from '@/providers/EmployeeContext';
import type { RecognitionFeedItem } from '@/api/queries';

export function useFeedSearch(searchTerm: string) {
  const { employee } = useEmployee();
  const trimmed = searchTerm.trim();

  return useQuery<RecognitionFeedItem[]>({
    queryKey: ['feed-search', employee?.hotel, trimmed],
    queryFn: async () => {
      if (!employee || !trimmed) return [];

      const { data, error } = await supabase.rpc('search_recognitions', {
        p_hotel:  employee.hotel,
        p_search: trimmed,
        p_limit:  100,
      });

      if (error) throw error;
      return (data as RecognitionFeedItem[]) ?? [];
    },
    enabled: !!employee && trimmed.length > 0,
    staleTime: 30_000,
  });
}
