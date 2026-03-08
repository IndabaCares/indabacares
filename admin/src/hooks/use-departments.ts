'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentsQuery } from '@/api/queries';
import {
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '@/api/mutations';
import { QUERY_KEYS } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';

export function useDepartments() {
  return useQuery({
    queryKey: QUERY_KEYS.departments,
    queryFn: async () => {
      const { data, error } = await departmentsQuery();
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  const companyId = useAuthStore((s) => s.company?.id);

  return useMutation({
    mutationFn: (name: string) =>
      createDepartment({ company_id: companyId!, name }),
    onSuccess: () => {
      toast.success('Department created');
      qc.invalidateQueries({ queryKey: QUERY_KEYS.departments });
    },
    onError: () => toast.error('Failed to create department'),
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateDepartment(id, { name }),
    onSuccess: () => {
      toast.success('Department updated');
      qc.invalidateQueries({ queryKey: QUERY_KEYS.departments });
    },
    onError: () => toast.error('Failed to update department'),
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDepartment(id),
    onSuccess: () => {
      toast.success('Department deleted');
      qc.invalidateQueries({ queryKey: QUERY_KEYS.departments });
    },
    onError: () => toast.error('Failed to delete department. It may still have users assigned.'),
  });
}
