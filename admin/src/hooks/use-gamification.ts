'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  thumbsUpTypesAdminQuery,
  companyValuesAdminQuery,
  badgesAdminQuery,
  skillCategoriesAdminQuery,
  budgetConfigsQuery,
} from '@/api/queries';
import * as mutations from '@/api/mutations';
import { QUERY_KEYS } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';

// ─── Thumbs Up Types ────────────────────────────────────────────────────────

export function useThumbsUpTypes() {
  return useQuery({
    queryKey: QUERY_KEYS.thumbsUpTypes,
    queryFn: async () => {
      const { data, error } = await thumbsUpTypesAdminQuery();
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateThumbsUpType() {
  const qc = useQueryClient();
  const companyId = useAuthStore((s) => s.company?.id);
  return useMutation({
    mutationFn: (data: Omit<Parameters<typeof mutations.createThumbsUpType>[0], 'company_id'>) =>
      mutations.createThumbsUpType({ ...data, company_id: companyId! }),
    onSuccess: () => { toast.success('Thumbs up type created'); qc.invalidateQueries({ queryKey: QUERY_KEYS.thumbsUpTypes }); },
    onError: () => toast.error('Failed to create thumbs up type'),
  });
}

export function useUpdateThumbsUpType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof mutations.updateThumbsUpType>[1] }) =>
      mutations.updateThumbsUpType(id, data),
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: QUERY_KEYS.thumbsUpTypes }); },
    onError: () => toast.error('Failed to update'),
  });
}

// ─── Company Values ─────────────────────────────────────────────────────────

export function useCompanyValues() {
  return useQuery({
    queryKey: QUERY_KEYS.companyValues,
    queryFn: async () => {
      const { data, error } = await companyValuesAdminQuery();
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateCompanyValue() {
  const qc = useQueryClient();
  const companyId = useAuthStore((s) => s.company?.id);
  return useMutation({
    mutationFn: (data: Omit<Parameters<typeof mutations.createCompanyValue>[0], 'company_id'>) =>
      mutations.createCompanyValue({ ...data, company_id: companyId! }),
    onSuccess: () => { toast.success('Company value created'); qc.invalidateQueries({ queryKey: QUERY_KEYS.companyValues }); },
    onError: () => toast.error('Failed to create company value'),
  });
}

export function useUpdateCompanyValue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof mutations.updateCompanyValue>[1] }) =>
      mutations.updateCompanyValue(id, data),
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: QUERY_KEYS.companyValues }); },
    onError: () => toast.error('Failed to update'),
  });
}

// ─── Badges ─────────────────────────────────────────────────────────────────

export function useBadges() {
  return useQuery({
    queryKey: QUERY_KEYS.badges,
    queryFn: async () => {
      const { data, error } = await badgesAdminQuery();
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateBadge() {
  const qc = useQueryClient();
  const companyId = useAuthStore((s) => s.company?.id);
  return useMutation({
    mutationFn: (data: Omit<Parameters<typeof mutations.createBadge>[0], 'company_id'>) =>
      mutations.createBadge({ ...data, company_id: companyId! }),
    onSuccess: () => { toast.success('Badge created'); qc.invalidateQueries({ queryKey: QUERY_KEYS.badges }); },
    onError: () => toast.error('Failed to create badge'),
  });
}

export function useUpdateBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof mutations.updateBadge>[1] }) =>
      mutations.updateBadge(id, data),
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: QUERY_KEYS.badges }); },
    onError: () => toast.error('Failed to update'),
  });
}

// ─── Skill Categories ───────────────────────────────────────────────────────

export function useSkillCategories() {
  return useQuery({
    queryKey: QUERY_KEYS.skillCategories,
    queryFn: async () => {
      const { data, error } = await skillCategoriesAdminQuery();
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateSkillCategory() {
  const qc = useQueryClient();
  const companyId = useAuthStore((s) => s.company?.id);
  return useMutation({
    mutationFn: (data: Omit<Parameters<typeof mutations.createSkillCategory>[0], 'company_id'>) =>
      mutations.createSkillCategory({ ...data, company_id: companyId! }),
    onSuccess: () => { toast.success('Category created'); qc.invalidateQueries({ queryKey: QUERY_KEYS.skillCategories }); },
    onError: () => toast.error('Failed to create category'),
  });
}

export function useCreateSkillIndicator() {
  const qc = useQueryClient();
  const companyId = useAuthStore((s) => s.company?.id);
  return useMutation({
    mutationFn: (data: Omit<Parameters<typeof mutations.createSkillIndicator>[0], 'company_id'>) =>
      mutations.createSkillIndicator({ ...data, company_id: companyId! }),
    onSuccess: () => { toast.success('Indicator created'); qc.invalidateQueries({ queryKey: QUERY_KEYS.skillCategories }); },
    onError: () => toast.error('Failed to create indicator'),
  });
}

export function useUpdateSkillIndicator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof mutations.updateSkillIndicator>[1] }) =>
      mutations.updateSkillIndicator(id, data),
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: QUERY_KEYS.skillCategories }); },
    onError: () => toast.error('Failed to update'),
  });
}

// ─── Budget Configs ─────────────────────────────────────────────────────────

export function useBudgetConfigs() {
  return useQuery({
    queryKey: QUERY_KEYS.budgetConfigs,
    queryFn: async () => {
      const { data, error } = await budgetConfigsQuery();
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateBudgetConfig() {
  const qc = useQueryClient();
  const companyId = useAuthStore((s) => s.company?.id);
  return useMutation({
    mutationFn: (data: Omit<Parameters<typeof mutations.createBudgetConfig>[0], 'company_id'>) =>
      mutations.createBudgetConfig({ ...data, company_id: companyId! }),
    onSuccess: () => { toast.success('Budget config created'); qc.invalidateQueries({ queryKey: QUERY_KEYS.budgetConfigs }); },
    onError: () => toast.error('Failed to create budget config'),
  });
}

export function useUpdateBudgetConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof mutations.updateBudgetConfig>[1] }) =>
      mutations.updateBudgetConfig(id, data),
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: QUERY_KEYS.budgetConfigs }); },
    onError: () => toast.error('Failed to update'),
  });
}

export function useDeleteBudgetConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mutations.deleteBudgetConfig(id),
    onSuccess: () => { toast.success('Budget config deleted'); qc.invalidateQueries({ queryKey: QUERY_KEYS.budgetConfigs }); },
    onError: () => toast.error('Failed to delete budget config'),
  });
}
