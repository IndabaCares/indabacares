'use client';

import { useState } from 'react';
import { useRewards, useCreateReward, useUpdateReward, useRewardCategories } from '@/hooks/use-rewards';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable } from '@/components/data-table/data-table';
import { ConfigFormDialog } from '@/components/forms/config-form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Star, Package, Zap, Calendar } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

type RewardType = 'physical' | 'digital' | 'experience';

interface RewardRow {
  id: string; name: string; description: string | null; image_url: string | null;
  star_cost: number; stock: number | null; sort_order: number; is_active: boolean;
  reward_type: RewardType; fulfillment_instructions: string | null; digital_content: string | null;
  category: { id: string; name: string } | null;
}

const REWARD_TYPE_CONFIG: Record<RewardType, { label: string; icon: typeof Package; color: string }> = {
  physical: { label: 'Physical', icon: Package, color: 'bg-blue-100 text-blue-700' },
  digital: { label: 'Digital', icon: Zap, color: 'bg-purple-100 text-purple-700' },
  experience: { label: 'Experience', icon: Calendar, color: 'bg-green-100 text-green-700' },
};

const defaultForm = {
  category_id: '', name: '', description: '', image_url: '',
  star_cost: 10, stock: '' as string, sort_order: 0, is_active: true,
  reward_type: 'physical' as RewardType,
  fulfillment_instructions: '', digital_content: '',
};

export default function RewardsPage() {
  const { data: rewards, isLoading } = useRewards();
  const { data: categories } = useRewardCategories();
  const create = useCreateReward();
  const update = useUpdateReward();
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  function openCreate() { setEditId(null); setForm(defaultForm); setIsOpen(true); }
  function openEdit(row: RewardRow) {
    setEditId(row.id);
    setForm({
      category_id: row.category?.id ?? '', name: row.name,
      description: row.description ?? '', image_url: row.image_url ?? '',
      star_cost: row.star_cost, stock: row.stock !== null ? String(row.stock) : '',
      sort_order: row.sort_order, is_active: row.is_active,
      reward_type: row.reward_type || 'physical',
      fulfillment_instructions: row.fulfillment_instructions ?? '',
      digital_content: row.digital_content ?? '',
    });
    setIsOpen(true);
  }

  function handleSave() {
    const payload = {
      category_id: form.category_id,
      name: form.name,
      description: form.description || undefined,
      image_url: form.image_url || undefined,
      star_cost: form.star_cost,
      stock: form.stock !== '' ? parseInt(form.stock) : null,
      sort_order: form.sort_order,
      is_active: form.is_active,
      reward_type: form.reward_type,
      fulfillment_instructions: form.fulfillment_instructions || undefined,
      digital_content: form.digital_content || undefined,
    };
    if (editId) update.mutate({ id: editId, data: payload }, { onSuccess: () => setIsOpen(false) });
    else create.mutate(payload, { onSuccess: () => setIsOpen(false) });
  }

  const columns: ColumnDef<RewardRow, unknown>[] = [
    { accessorKey: 'name', header: 'Reward', cell: ({ row }) => (
      <div>
        <span className="font-medium">{row.original.name}</span>
        {row.original.category && <span className="ml-2 text-xs text-muted-foreground">{row.original.category.name}</span>}
      </div>
    )},
    { accessorKey: 'reward_type', header: 'Type', cell: ({ row }) => {
      const config = REWARD_TYPE_CONFIG[row.original.reward_type] || REWARD_TYPE_CONFIG.physical;
      const Icon = config.icon;
      return <Badge variant="outline" className={config.color}><Icon className="mr-1 h-3 w-3" />{config.label}</Badge>;
    }},
    { accessorKey: 'star_cost', header: 'Cost', cell: ({ row }) => (
      <div className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500" /><span className="font-medium">{row.original.star_cost}</span></div>
    )},
    { accessorKey: 'stock', header: 'Stock', cell: ({ row }) => <span>{row.original.stock !== null ? row.original.stock : 'Unlimited'}</span> },
    { accessorKey: 'is_active', header: 'Status', cell: ({ row }) => <Badge variant={row.original.is_active ? 'default' : 'secondary'}>{row.original.is_active ? 'Active' : 'Inactive'}</Badge> },
    { id: 'actions', cell: ({ row }) => <Button variant="ghost" size="sm" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button> },
  ];

  return (
    <div>
      <PageHeader title="Reward Catalog" description="Manage rewards that employees can redeem with stars" actions={<Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Reward</Button>} />
      <DataTable columns={columns} data={(rewards as RewardRow[]) ?? []} isLoading={isLoading} />
      <ConfigFormDialog open={isOpen} onOpenChange={setIsOpen} title={editId ? 'Edit Reward' : 'Create Reward'} isPending={create.isPending || update.isPending} onSave={handleSave}>
        <div><Label>Category</Label>
          <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>{((categories ?? []) as any[]).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." /></div>

        {/* Reward Type */}
        <div><Label>Reward Type</Label>
          <Select value={form.reward_type} onValueChange={(v) => setForm({ ...form, reward_type: v as RewardType })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="physical">Physical (shipped)</SelectItem>
              <SelectItem value="digital">Digital (code/link)</SelectItem>
              <SelectItem value="experience">Experience (scheduled)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div><Label>Star Cost</Label><Input type="number" min={1} value={form.star_cost} onChange={(e) => setForm({ ...form, star_cost: parseInt(e.target.value) || 1 })} /></div>
        <div><Label>Stock (blank = unlimited)</Label><Input type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="Unlimited" /></div>
        <div><Label>Sort Order</Label><Input type="number" min={0} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} /></div>

        {/* Fulfillment Instructions (admin-only) */}
        <div>
          <Label>Fulfillment Instructions (internal)</Label>
          <Textarea
            value={form.fulfillment_instructions}
            onChange={(e) => setForm({ ...form, fulfillment_instructions: e.target.value })}
            placeholder={form.reward_type === 'digital' ? 'e.g., Generate code from vendor portal...' : form.reward_type === 'experience' ? 'e.g., Coordinate with HR for scheduling...' : 'e.g., Ship from warehouse, include branded packaging...'}
          />
          <p className="mt-1 text-xs text-muted-foreground">Not shown to employees. Instructions for admins processing orders.</p>
        </div>

        {/* Digital Content (for digital rewards) */}
        {form.reward_type === 'digital' && (
          <div>
            <Label>Digital Content Template</Label>
            <Textarea
              value={form.digital_content}
              onChange={(e) => setForm({ ...form, digital_content: e.target.value })}
              placeholder="e.g., Vendor API endpoint, code pool reference, or template for delivery info"
            />
            <p className="mt-1 text-xs text-muted-foreground">Template or reference for generating digital delivery content.</p>
          </div>
        )}

        <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
      </ConfigFormDialog>
    </div>
  );
}
