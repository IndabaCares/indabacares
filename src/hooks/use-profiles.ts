import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { searchProfilesQuery, profileDetailQuery, updateProfile } from '@/api/queries';
import { QUERY_KEYS } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';

export function useSearchProfiles(search: string) {
  const company = useAuthStore((s) => s.company);

  return useQuery({
    queryKey: QUERY_KEYS.profiles(search),
    queryFn: async () => {
      if (!company || !search) return [];
      const { data, error } = await searchProfilesQuery(company.id, search);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!company && search.length >= 2,
    staleTime: 2 * 60 * 1000,
  });
}

export function useProfileDetail(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.profile(id),
    queryFn: async () => {
      const { data, error } = await profileDetailQuery(id);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  return useMutation({
    mutationFn: async (data: { display_name?: string; job_title?: string; avatar_url?: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await updateProfile(user.id, data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.me });
      showToast({ type: 'success', message: 'Profile updated' });
    },
    onError: (error: Error) => {
      showToast({ type: 'error', message: error.message });
    },
  });
}
