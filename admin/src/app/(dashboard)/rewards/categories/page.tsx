'use client';

import { useState } from 'react';
import { useRewardCategories, useCreateRewardCategory, useUpdateRewardCategory } from '@/hooks/use-rewards';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable } from '@/components/data-table/data-table';
import { ConfigFormDialog } from '@/components/forms/config-form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Pencil } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

interface CatRow { id: string; name: string; sort_order: number; }

export default function RewardCategoriesPage() {
  const { data, isLoading } = useRewardCategories();
  const create = useCreateRewardCategory();
  const update = useUpdateRewardCategory();
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState(0);

  function openCreate() { setEditId(null); setName(''); setSortOrder(0); setIsOpen(true); }
  function openEdit(row: CatRow) { setEditId(row.id); setName(row.name); setSortOrder(row.sort_order); setIsOpen(true); }
  function handleSave() {
    if (editId) update.mutate({ id: editId, data: { name, sort_order: sortOrder } }, { onSuccess: () => setIsOpen(false) });
    else create.mutate({ name, sort_order: sortOrder }, { onSuccess: () => setIsOpen(false) });
  }

  const columns: ColumnDef<CatRow, unknown>[] = [
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: 'sort_order', header: 'Order' },
    { id: 'actions', cell: ({ row }) => <Button variant="ghost" size="sm" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button> },
  ];

  return (
    <div>
      <PageHeader title="Reward Categories" description="Organize rewards into categories" actions={<Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Category</Button>} />
      <DataTable columns={columns} data={(data as CatRow[]) ?? []} isLoading={isLoading} />
      <ConfigFormDialog open={isOpen} onOpenChange={setIsOpen} title={editId ? 'Edit Category' : 'Create Category'} isPending={create.isPending || update.isPending} onSave={handleSave}>
        <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Gift Cards" /></div>
        <div><Label>Sort Order</Label><Input type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)} /></div>
      </ConfigFormDialog>
    </div>
  );
}
