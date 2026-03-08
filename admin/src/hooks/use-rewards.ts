'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rewardsAdminQuery, rewardCategoriesAdminQuery, redemptionsAdminQuery } from '@/api/queries';
import * as mut from '@/api/mutations';
import { manageRedemption } from '@/api/edge-functions';
import { QUERY_KEYS } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';
import type { RedemptionAction } from '@/types/api';

export function useRewards() {
  return useQuery({
    queryKey: QUERY_KEYS.rewards,
    queryFn: async () => { const { data, error } = await rewardsAdminQuery(); if (error) throw error; return data ?? []; },
  });
}

export function useCreateReward() {
  const qc = useQueryClient();
  const companyId = useAuthStore((s) => s.company?.id);
  return useMutation({
    mutationFn: (data: Omit<Parameters<typeof mut.createReward>[0], 'company_id'>) =>
      mut.createReward({ ...data, company_id: companyId! }),
    onSuccess: () => { toast.success('Reward created'); qc.invalidateQueries({ queryKey: QUERY_KEYS.rewards }); },
    onError: () => toast.error('Failed to create reward'),
  });
}

export function useUpdateReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof mut.updateReward>[1] }) =>
      mut.updateReward(id, data),
    onSuccess: () => { toast.success('Reward updated'); qc.invalidateQueries({ queryKey: QUERY_KEYS.rewards }); },
    onError: () => toast.error('Failed to update reward'),
  });
}

export function useRewardCategories() {
  return useQuery({
    queryKey: QUERY_KEYS.rewardCategories,
    queryFn: async () => { const { data, error } = await rewardCategoriesAdminQuery(); if (error) throw error; return data ?? []; },
  });
}

export function useCreateRewardCategory() {
  const qc = useQueryClient();
  const companyId = useAuthStore((s) => s.company?.id);
  return useMutation({
    mutationFn: (data: { name: string; sort_order: number }) =>
      mut.createRewardCategory({ ...data, company_id: companyId! }),
    onSuccess: () => { toast.success('Category created'); qc.invalidateQueries({ queryKey: QUERY_KEYS.rewardCategories }); },
    onError: () => toast.error('Failed to create category'),
  });
}

export function useUpdateRewardCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof mut.updateRewardCategory>[1] }) =>
      mut.updateRewardCategory(id, data),
    onSuccess: () => { toast.success('Category updated'); qc.invalidateQueries({ queryKey: QUERY_KEYS.rewardCategories }); },
    onError: () => toast.error('Failed to update category'),
  });
}

export function useRedemptions(params: { status?: string; page?: number }) {
  return useQuery({
    queryKey: QUERY_KEYS.redemptions(params),
    queryFn: async () => {
      const { data, error, count } = await redemptionsAdminQuery(params);
      if (error) throw error;
      return { redemptions: data ?? [], total: count ?? 0 };
    },
  });
}

export function useManageRedemption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, note }: { id: string; action: RedemptionAction; note?: string }) =>
      manageRedemption(id, action, note),
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ['admin-redemptions'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
