'use client';

import { useState } from 'react';
import { useThumbsUpTypes, useCreateThumbsUpType, useUpdateThumbsUpType } from '@/hooks/use-gamification';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable } from '@/components/data-table/data-table';
import { ConfigFormDialog } from '@/components/forms/config-form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

interface TypeRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  stars_awarded: number;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

const defaultForm = {
  name: '',
  icon: '',
  color: '#4F46E5',
  stars_awarded: 1,
  description: '',
  sort_order: 0,
  is_active: true,
};

export default function ThumbsUpTypesPage() {
  const { data, isLoading } = useThumbsUpTypes();
  const create = useCreateThumbsUpType();
  const update = useUpdateThumbsUpType();

  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  function openCreate() {
    setEditId(null);
    setForm(defaultForm);
    setIsOpen(true);
  }

  function openEdit(row: TypeRow) {
    setEditId(row.id);
    setForm({
      name: row.name,
      icon: row.icon,
      color: row.color,
      stars_awarded: row.stars_awarded,
      description: row.description ?? '',
      sort_order: row.sort_order,
      is_active: row.is_active,
    });
    setIsOpen(true);
  }

  function handleSave() {
    if (editId) {
      update.mutate({ id: editId, data: form }, { onSuccess: () => setIsOpen(false) });
    } else {
      create.mutate(form, { onSuccess: () => setIsOpen(false) });
    }
  }

  const columns: ColumnDef<TypeRow, unknown>[] = [
    {
      accessorKey: 'icon',
      header: '',
      cell: ({ row }) => (
        <span className="text-2xl">{row.original.icon}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'stars_awarded',
      header: 'Stars',
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.stars_awarded} stars</Badge>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      accessorKey: 'sort_order',
      header: 'Order',
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => openEdit(row.original)}>
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Thumbs Up Types"
        description="Configure recognition categories and star values"
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Type
          </Button>
        }
      />

      <DataTable columns={columns} data={(data as TypeRow[]) ?? []} isLoading={isLoading} />

      <ConfigFormDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title={editId ? 'Edit Thumbs Up Type' : 'Create Thumbs Up Type'}
        isPending={create.isPending || update.isPending}
        onSave={handleSave}
      >
        <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Great Teamwork" /></div>
        <div><Label>Icon (emoji)</Label><Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="e.g. ..." /></div>
        <div><Label>Color (hex)</Label><Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
        <div><Label>Stars Awarded</Label><Input type="number" min={1} value={form.stars_awarded} onChange={(e) => setForm({ ...form, stars_awarded: parseInt(e.target.value) || 1 })} /></div>
        <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div><Label>Sort Order</Label><Input type="number" min={0} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} /></div>
        <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
      </ConfigFormDialog>
    </div>
  );
}
