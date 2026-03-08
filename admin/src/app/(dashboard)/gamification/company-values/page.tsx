'use client';

import { useState } from 'react';
import { useCompanyValues, useCreateCompanyValue, useUpdateCompanyValue } from '@/hooks/use-gamification';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable } from '@/components/data-table/data-table';
import { ConfigFormDialog } from '@/components/forms/config-form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

interface ValueRow { id: string; name: string; description: string | null; icon: string; sort_order: number; is_active: boolean; }

const defaultForm = { name: '', description: '', icon: '', sort_order: 0, is_active: true };

export default function CompanyValuesPage() {
  const { data, isLoading } = useCompanyValues();
  const create = useCreateCompanyValue();
  const update = useUpdateCompanyValue();
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  function openCreate() { setEditId(null); setForm(defaultForm); setIsOpen(true); }
  function openEdit(row: ValueRow) {
    setEditId(row.id);
    setForm({ name: row.name, description: row.description ?? '', icon: row.icon, sort_order: row.sort_order, is_active: row.is_active });
    setIsOpen(true);
  }
  function handleSave() {
    if (editId) update.mutate({ id: editId, data: form }, { onSuccess: () => setIsOpen(false) });
    else create.mutate(form, { onSuccess: () => setIsOpen(false) });
  }

  const columns: ColumnDef<ValueRow, unknown>[] = [
    { accessorKey: 'icon', header: '', cell: ({ row }) => <span className="text-2xl">{row.original.icon}</span> },
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: 'description', header: 'Description', cell: ({ row }) => <span className="text-sm text-muted-foreground line-clamp-1">{row.original.description ?? '—'}</span> },
    { accessorKey: 'is_active', header: 'Status', cell: ({ row }) => <Badge variant={row.original.is_active ? 'default' : 'secondary'}>{row.original.is_active ? 'Active' : 'Inactive'}</Badge> },
    { id: 'actions', cell: ({ row }) => <Button variant="ghost" size="sm" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button> },
  ];

  return (
    <div>
      <PageHeader title="Company Values" description="Define the values your organization recognizes" actions={<Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Value</Button>} />
      <DataTable columns={columns} data={(data as ValueRow[]) ?? []} isLoading={isLoading} />
      <ConfigFormDialog open={isOpen} onOpenChange={setIsOpen} title={editId ? 'Edit Value' : 'Create Value'} isPending={create.isPending || update.isPending} onSave={handleSave}>
        <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Innovation" /></div>
        <div><Label>Icon (emoji)</Label><Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></div>
        <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div><Label>Sort Order</Label><Input type="number" min={0} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} /></div>
        <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
      </ConfigFormDialog>
    </div>
  );
}
