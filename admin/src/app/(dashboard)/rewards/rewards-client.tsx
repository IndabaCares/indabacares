'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Filter, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { HOTELS } from '@/lib/hotels';
import { createReward, updateReward, deleteReward } from '@/app/actions/rewards';

interface Reward {
  id:              string;
  title:           string;
  description:     string | null;
  points_required: number;
  hotel:           string;
  stock:           number | null;
  image_url:       string | null;
  created_at:      string;
}

interface RewardForm {
  title:           string;
  description:     string;
  points_required: string;
  hotel:           string;
  stock:           string;
  image_url:       string;
}

const EMPTY: RewardForm = {
  title: '', description: '', points_required: '', hotel: '', stock: '', image_url: '',
};

export function RewardsClient({
  rewards,
  selectedHotel,
}: {
  rewards:       Reward[];
  selectedHotel?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm]       = useState<RewardForm>(EMPTY);
  const [editId, setEditId]   = useState<string | null>(null);
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [deleteId, setDeleteId]       = useState<string | null>(null);

  function handleHotelFilter(val: string) {
    const url = new URLSearchParams();
    if (val !== 'all') url.set('hotel', val);
    router.push(`/rewards${url.toString() ? '?' + url.toString() : ''}`);
  }

  function openCreate() {
    setForm({ ...EMPTY, hotel: selectedHotel ?? '' });
    setEditId(null);
    setDialogOpen(true);
  }

  function openEdit(r: Reward) {
    setForm({
      title:           r.title,
      description:     r.description ?? '',
      points_required: String(r.points_required),
      hotel:           r.hotel,
      stock:           r.stock != null ? String(r.stock) : '',
      image_url:       r.image_url ?? '',
    });
    setEditId(r.id);
    setDialogOpen(true);
  }

  function handleSave() {
    const payload = {
      title:           form.title.trim(),
      description:     form.description.trim() || undefined,
      points_required: Number(form.points_required),
      hotel:           form.hotel,
      stock:           form.stock !== '' ? Number(form.stock) : null,
      image_url:       form.image_url.trim() || undefined,
    };

    if (!payload.title || !payload.hotel || !payload.points_required) {
      toast.error('Title, hotel, and points required are mandatory.');
      return;
    }

    startTransition(async () => {
      try {
        if (editId) {
          await updateReward(editId, payload);
          toast.success('Reward updated');
        } else {
          await createReward(payload);
          toast.success('Reward created');
        }
        setDialogOpen(false);
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  }

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      try {
        await deleteReward(deleteId);
        toast.success('Reward deleted');
        setDeleteId(null);
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <Select value={selectedHotel ?? 'all'} onValueChange={handleHotelFilter}>
          <SelectTrigger className="w-52">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="All hotels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Hotels</SelectItem>
            {HOTELS.map((h) => (
              <SelectItem key={h} value={h}>{h}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Reward
        </Button>
      </div>

      {/* Grid */}
      {rewards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-muted-foreground">
          <Package className="mb-3 h-10 w-10 opacity-40" />
          <p className="font-medium">No rewards yet</p>
          <p className="text-sm">Create your first reward to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rewards.map((r) => (
            <Card key={r.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{r.title}</CardTitle>
                  <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">
                    {r.points_required} pts
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{r.hotel}</p>
              </CardHeader>

              <CardContent className="flex-1 text-sm text-muted-foreground">
                {r.description ?? <span className="italic opacity-50">No description</span>}
              </CardContent>

              <CardFooter className="flex items-center justify-between border-t pt-3">
                <span className="text-xs text-muted-foreground">
                  Stock: {r.stock != null ? r.stock : '∞'}
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(r.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Reward' : 'New Reward'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Weekend spa voucher"
              />
            </div>

            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="Optional details…"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Points Required *</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.points_required}
                  onChange={(e) => setForm({ ...form, points_required: e.target.value })}
                  placeholder="100"
                />
              </div>
              <div className="space-y-1">
                <Label>Stock (blank = unlimited)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  placeholder="∞"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Hotel *</Label>
              <Select value={form.hotel} onValueChange={(v) => setForm({ ...form, hotel: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select hotel…" />
                </SelectTrigger>
                <SelectContent>
                  {HOTELS.map((h) => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Image URL</Label>
              <Input
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://…"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? 'Saving…' : editId ? 'Save Changes' : 'Create Reward'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete reward?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Redemptions that reference this reward will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
