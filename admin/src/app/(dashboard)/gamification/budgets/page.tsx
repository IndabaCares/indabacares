'use client';

import { useState } from 'react';
import { useBudgetConfigs, useCreateBudgetConfig, useUpdateBudgetConfig, useDeleteBudgetConfig } from '@/hooks/use-gamification';
import { useDepartments } from '@/hooks/use-departments';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable } from '@/components/data-table/data-table';
import { ConfigFormDialog } from '@/components/forms/config-form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { ROLE_LABELS } from '@/lib/constants';
import type { ColumnDef } from '@tanstack/react-table';

interface BudgetRow {
  id: string; role: string | null; department_id: string | null;
  monthly_giving_stars: number; max_stars_per_recognition: number;
  max_recognitions_per_day: number; carry_over: boolean;
  effective_from: string; effective_to: string | null;
  department: { id: string; name: string } | null;
}

const defaultForm = { role: '', department_id: '', monthly_giving_stars: 50, max_stars_per_recognition: 10, max_recognitions_per_day: 5, carry_over: false, effective_from: new Date().toISOString().split('T')[0], effective_to: '' };

export default function BudgetsPage() {
  const { data, isLoading } = useBudgetConfigs();
  const { data: depts } = useDepartments();
  const create = useCreateBudgetConfig();
  const update = useUpdateBudgetConfig();
  const remove = useDeleteBudgetConfig();
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  function openCreate() { setEditId(null); setForm(defaultForm); setIsOpen(true); }
  function openEdit(row: BudgetRow) {
    setEditId(row.id);
    setForm({ role: row.role ?? '', department_id: row.department_id ?? '', monthly_giving_stars: row.monthly_giving_stars, max_stars_per_recognition: row.max_stars_per_recognition, max_recognitions_per_day: row.max_recognitions_per_day, carry_over: row.carry_over, effective_from: row.effective_from, effective_to: row.effective_to ?? '' });
    setIsOpen(true);
  }
  function handleSave() {
    const payload = { role: form.role || null, department_id: form.department_id || null, monthly_giving_stars: form.monthly_giving_stars, max_stars_per_recognition: form.max_stars_per_recognition, max_recognitions_per_day: form.max_recognitions_per_day, carry_over: form.carry_over, effective_from: form.effective_from, effective_to: form.effective_to || null };
    if (editId) update.mutate({ id: editId, data: payload }, { onSuccess: () => setIsOpen(false) });
    else create.mutate(payload, { onSuccess: () => setIsOpen(false) });
  }

  const columns: ColumnDef<BudgetRow, unknown>[] = [
    { accessorKey: 'role', header: 'Role', cell: ({ row }) => <span>{row.original.role ? ROLE_LABELS[row.original.role] : 'All Roles'}</span> },
    { accessorKey: 'department', header: 'Department', cell: ({ row }) => <span>{row.original.department?.name ?? 'All Departments'}</span> },
    { accessorKey: 'monthly_giving_stars', header: 'Monthly Stars', cell: ({ row }) => <Badge variant="secondary">{row.original.monthly_giving_stars}</Badge> },
    { accessorKey: 'max_stars_per_recognition', header: 'Max/Recognition', cell: ({ row }) => <span>{row.original.max_stars_per_recognition}</span> },
    { accessorKey: 'carry_over', header: 'Carry Over', cell: ({ row }) => <Badge variant={row.original.carry_over ? 'default' : 'secondary'}>{row.original.carry_over ? 'Yes' : 'No'}</Badge> },
    { accessorKey: 'effective_from', header: 'Effective', cell: ({ row }) => <span className="text-sm">{formatDate(row.original.effective_from)}{row.original.effective_to ? ` - ${formatDate(row.original.effective_to)}` : ' - ongoing'}</span> },
    { id: 'actions', cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Delete this budget config?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate(row.original.id)}>Delete</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="Budget Configs" description="Configure monthly giving star allocations by role and department" actions={<Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Config</Button>} />
      <DataTable columns={columns} data={(data as BudgetRow[]) ?? []} isLoading={isLoading} />
      <ConfigFormDialog open={isOpen} onOpenChange={setIsOpen} title={editId ? 'Edit Budget' : 'Create Budget'} isPending={create.isPending || update.isPending} onSave={handleSave}>
        <div><Label>Role (optional)</Label>
          <Select value={form.role || 'all'} onValueChange={(v) => setForm({ ...form, role: v === 'all' ? '' : v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="employee">Employee</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Department (optional)</Label>
          <Select value={form.department_id || 'all'} onValueChange={(v) => setForm({ ...form, department_id: v === 'all' ? '' : v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {(depts ?? []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Monthly Giving Stars</Label><Input type="number" min={1} value={form.monthly_giving_stars} onChange={(e) => setForm({ ...form, monthly_giving_stars: parseInt(e.target.value) || 1 })} /></div>
        <div><Label>Max Stars per Recognition</Label><Input type="number" min={1} value={form.max_stars_per_recognition} onChange={(e) => setForm({ ...form, max_stars_per_recognition: parseInt(e.target.value) || 1 })} /></div>
        <div><Label>Max Recognitions per Day</Label><Input type="number" min={1} value={form.max_recognitions_per_day} onChange={(e) => setForm({ ...form, max_recognitions_per_day: parseInt(e.target.value) || 1 })} /></div>
        <div className="flex items-center gap-2"><Switch checked={form.carry_over} onCheckedChange={(v) => setForm({ ...form, carry_over: v })} /><Label>Carry Over Unused Stars</Label></div>
        <div><Label>Effective From</Label><Input type="date" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} /></div>
        <div><Label>Effective To (optional)</Label><Input type="date" value={form.effective_to} onChange={(e) => setForm({ ...form, effective_to: e.target.value })} /></div>
      </ConfigFormDialog>
    </div>
  );
}
