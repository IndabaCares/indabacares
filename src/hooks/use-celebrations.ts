import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEmployee } from '@/providers/EmployeeContext';

export interface CelebrationFeedItem {
  _type:        'celebration';
  id:           string;
  type:         'birthday' | 'anniversary';
  milestone:    number | null;
  celebrated_on: string;
  created_at:   string;
  employee: {
    id:        string;
    full_name: string;
    hotel:     string;
  };
}

export function useCelebrations() {
  const { employee } = useEmployee();

  return useQuery({
    queryKey: ['celebrations', employee?.hotel],
    queryFn: async (): Promise<CelebrationFeedItem[]> => {
      if (!employee) return [];

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('celebrations')
        .select(`
          id,
          type,
          milestone,
          celebrated_on,
          created_at,
          employee:employees!employee_id ( id, full_name, hotel )
        `)
        .eq('celebrated_on', today)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        _type:         'celebration' as const,
        id:            row.id,
        type:          row.type,
        milestone:     row.milestone,
        celebrated_on: row.celebrated_on,
        created_at:    row.created_at,
        employee:      row.employee,
      }));
    },
    enabled:   !!employee,
    staleTime: 60 * 60 * 1000, // 1 hour — celebrations don't change during the day
  });
}
