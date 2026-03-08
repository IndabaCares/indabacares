'use client';

import { useState } from 'react';
import { useBadges, useCreateBadge, useUpdateBadge } from '@/hooks/use-gamification';
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

interface BadgeRow { id: string; slug: string; name: string; description: string | null; icon: string; category: string; threshold: number | null; is_active: boolean; company_id: string | null; }

const defaultForm = { slug: '', name: '', description: '', icon: '', category: 'achievement', threshold: 1, is_active: true };

export default function BadgesPage() {
  const { data, isLoading } = useBadges();
  const create = useCreateBadge();
  const update = useUpdateBadge();
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  function openCreate() { setEditId(null); setForm(defaultForm); setIsOpen(true); }
  function openEdit(row: BadgeRow) {
    setEditId(row.id);
    setForm({ slug: row.slug, name: row.name, description: row.description ?? '', icon: row.icon, category: row.category ?? 'achievement', threshold: row.threshold ?? 1, is_active: row.is_active });
    setIsOpen(true);
  }
  function handleSave() {
    const payload = { slug: form.slug, name: form.name, description: form.description || undefined, icon: form.icon, category: form.category, threshold: form.threshold, is_active: form.is_active };
    if (editId) update.mutate({ id: editId, data: payload }, { onSuccess: () => setIsOpen(false) });
    else create.mutate(payload, { onSuccess: () => setIsOpen(false) });
  }

  const columns: ColumnDef<BadgeRow, unknown>[] = [
    { accessorKey: 'icon', header: '', cell: ({ row }) => <span className="text-2xl">{row.original.icon}</span> },
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <div><span className="font-medium">{row.original.name}</span><br /><span className="text-xs text-muted-foreground">{row.original.slug}</span></div> },
    { accessorKey: 'category', header: 'Category', cell: ({ row }) => <Badge variant="secondary">{row.original.category}</Badge> },
    { accessorKey: 'threshold', header: 'Threshold', cell: ({ row }) => <span>{row.original.threshold ?? '—'}</span> },
    { accessorKey: 'company_id', header: 'Scope', cell: ({ row }) => <Badge variant="outline">{row.original.company_id ? 'Company' : 'System'}</Badge> },
    { accessorKey: 'is_active', header: 'Status', cell: ({ row }) => <Badge variant={row.original.is_active ? 'default' : 'secondary'}>{row.original.is_active ? 'Active' : 'Inactive'}</Badge> },
    { id: 'actions', cell: ({ row }) => row.original.company_id ? <Button variant="ghost" size="sm" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button> : null },
  ];

  return (
    <div>
      <PageHeader title="Badges" description="Manage achievement badges" actions={<Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Badge</Button>} />
      <DataTable columns={columns} data={(data as BadgeRow[]) ?? []} isLoading={isLoading} />
      <ConfigFormDialog open={isOpen} onOpenChange={setIsOpen} title={editId ? 'Edit Badge' : 'Create Badge'} isPending={create.isPending || update.isPending} onSave={handleSave}>
        {!editId && <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} placeholder="e.g. team_hero" /></div>}
        <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Team Hero" /></div>
        <div><Label>Icon (emoji)</Label><Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></div>
        <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="achievement, streak, milestone" /></div>
        <div><Label>Threshold</Label><Input type="number" min={1} value={form.threshold} onChange={(e) => setForm({ ...form, threshold: parseInt(e.target.value) || 1 })} /></div>
        <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
      </ConfigFormDialog>
    </div>
  );
}
