'use client';

import { useState } from 'react';
import { useSkillCategories, useCreateSkillCategory, useCreateSkillIndicator, useUpdateSkillIndicator } from '@/hooks/use-gamification';
import { PageHeader } from '@/components/layout/page-header';
import { ConfigFormDialog } from '@/components/forms/config-form-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil } from 'lucide-react';

interface Indicator { id: string; name: string; description: string | null; sort_order: number; is_active: boolean; }
interface Category { id: string; name: string; sort_order: number; indicators: Indicator[]; }

export default function SkillsPage() {
  const { data: categories, isLoading } = useSkillCategories();
  const createCat = useCreateSkillCategory();
  const createInd = useCreateSkillIndicator();
  const updateInd = useUpdateSkillIndicator();

  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catSort, setCatSort] = useState(0);

  const [indDialogOpen, setIndDialogOpen] = useState(false);
  const [indCategoryId, setIndCategoryId] = useState('');
  const [indEditId, setIndEditId] = useState<string | null>(null);
  const [indName, setIndName] = useState('');
  const [indDesc, setIndDesc] = useState('');
  const [indSort, setIndSort] = useState(0);

  function openAddIndicator(categoryId: string) {
    setIndCategoryId(categoryId);
    setIndEditId(null);
    setIndName('');
    setIndDesc('');
    setIndSort(0);
    setIndDialogOpen(true);
  }

  function openEditIndicator(ind: Indicator) {
    setIndEditId(ind.id);
    setIndName(ind.name);
    setIndDesc(ind.description ?? '');
    setIndSort(ind.sort_order);
    setIndDialogOpen(true);
  }

  function handleSaveCategory() {
    createCat.mutate({ name: catName, sort_order: catSort }, { onSuccess: () => setCatDialogOpen(false) });
  }

  function handleSaveIndicator() {
    if (indEditId) {
      updateInd.mutate({ id: indEditId, data: { name: indName, description: indDesc || undefined, sort_order: indSort } }, { onSuccess: () => setIndDialogOpen(false) });
    } else {
      createInd.mutate({ category_id: indCategoryId, name: indName, description: indDesc || undefined, sort_order: indSort }, { onSuccess: () => setIndDialogOpen(false) });
    }
  }

  if (isLoading) return <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;

  return (
    <div>
      <PageHeader title="Skills & Indicators" description="Define skill categories and behavioral indicators for peer assessment"
        actions={<Button size="sm" onClick={() => { setCatName(''); setCatSort(0); setCatDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add Category</Button>} />

      <div className="space-y-4">
        {((categories as Category[]) ?? []).map((cat) => (
          <Card key={cat.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">{cat.name}</CardTitle>
              <Button variant="outline" size="sm" onClick={() => openAddIndicator(cat.id)}>
                <Plus className="mr-1 h-3 w-3" />Add Indicator
              </Button>
            </CardHeader>
            <CardContent>
              {cat.indicators.length === 0 ? (
                <p className="text-sm text-muted-foreground">No indicators yet.</p>
              ) : (
                <div className="space-y-2">
                  {cat.indicators.sort((a, b) => a.sort_order - b.sort_order).map((ind) => (
                    <div key={ind.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div>
                        <span className="text-sm font-medium">{ind.name}</span>
                        {ind.description && <span className="ml-2 text-xs text-muted-foreground">{ind.description}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={ind.is_active ? 'default' : 'secondary'}>{ind.is_active ? 'Active' : 'Inactive'}</Badge>
                        <Button variant="ghost" size="sm" onClick={() => openEditIndicator(ind)}><Pencil className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfigFormDialog open={catDialogOpen} onOpenChange={setCatDialogOpen} title="Add Skill Category" isPending={createCat.isPending} onSave={handleSaveCategory}>
        <div><Label>Name</Label><Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Leadership" /></div>
        <div><Label>Sort Order</Label><Input type="number" min={0} value={catSort} onChange={(e) => setCatSort(parseInt(e.target.value) || 0)} /></div>
      </ConfigFormDialog>

      <ConfigFormDialog open={indDialogOpen} onOpenChange={setIndDialogOpen} title={indEditId ? 'Edit Indicator' : 'Add Indicator'} isPending={createInd.isPending || updateInd.isPending} onSave={handleSaveIndicator}>
        <div><Label>Name</Label><Input value={indName} onChange={(e) => setIndName(e.target.value)} placeholder="e.g. Takes initiative" /></div>
        <div><Label>Description</Label><Input value={indDesc} onChange={(e) => setIndDesc(e.target.value)} placeholder="Optional description" /></div>
        <div><Label>Sort Order</Label><Input type="number" min={0} value={indSort} onChange={(e) => setIndSort(parseInt(e.target.value) || 0)} /></div>
      </ConfigFormDialog>
    </div>
  );
}
