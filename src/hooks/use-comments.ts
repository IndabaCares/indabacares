import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentsQuery, addComment, deleteComment } from '@/api/queries';
import { QUERY_KEYS } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth-store';

export function useComments(recognitionId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.comments(recognitionId),
    queryFn: async () => {
      const { data, error } = await commentsQuery(recognitionId);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useAddComment(recognitionId: string) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const company = useAuthStore((s) => s.company);

  return useMutation({
    mutationFn: async (body: string) => {
      if (!company) throw new Error('No company context');
      const { error } = await addComment(recognitionId, company.id, body);
      if (error) throw error;
    },
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.comments(recognitionId) });
      const previous = queryClient.getQueryData(QUERY_KEYS.comments(recognitionId));

      // Optimistic insert
      queryClient.setQueryData(QUERY_KEYS.comments(recognitionId), (old: any[]) => [
        ...(old || []),
        {
          id: `temp-${Date.now()}`,
          body,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user: {
            id: user?.id,
            full_name: user?.fullName,
            display_name: user?.displayName,
            avatar_url: user?.avatarUrl,
          },
        },
      ]);

      return { previous };
    },
    onError: (_err, _body, context) => {
      queryClient.setQueryData(QUERY_KEYS.comments(recognitionId), context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.comments(recognitionId) });
    },
  });
}

export function useDeleteComment(recognitionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await deleteComment(commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.comments(recognitionId) });
    },
  });
}
