'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersListQuery, userDetailQuery } from '@/api/queries';
import { inviteUsers, updateUserRole, deactivateUser } from '@/api/edge-functions';
import { updateProfileAdmin } from '@/api/mutations';
import { QUERY_KEYS } from '@/lib/constants';
import { toast } from 'sonner';
import type { InviteRequest } from '@/types/api';

export function useUsers(params: {
  search?: string;
  role?: string;
  departmentId?: string;
  isActive?: boolean;
  page?: number;
}) {
  return useQuery({
    queryKey: QUERY_KEYS.users(params),
    queryFn: async () => {
      const { data, error, count } = await usersListQuery(params);
      if (error) throw error;
      return { users: data ?? [], total: count ?? 0 };
    },
  });
}

export function useUserDetail(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.user(id),
    queryFn: async () => {
      const { data, error } = await userDetailQuery(id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useInviteUsers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invites: InviteRequest[]) => inviteUsers(invites),
    onSuccess: (data) => {
      toast.success(`${data.invited} user(s) invited successfully`);
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, newRole }: { userId: string; newRole: string }) =>
      updateUserRole(userId, newRole),
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-user'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      active,
      reason,
    }: {
      userId: string;
      active: boolean;
      reason?: string;
    }) => deactivateUser(userId, active, reason),
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-user'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<{
        department_id: string | null;
        manager_id: string | null;
        job_title: string | null;
      }>;
    }) => updateProfileAdmin(id, data),
    onSuccess: () => {
      toast.success('Profile updated');
      qc.invalidateQueries({ queryKey: ['admin-user'] });
    },
    onError: () => toast.error('Failed to update profile'),
  });
}
