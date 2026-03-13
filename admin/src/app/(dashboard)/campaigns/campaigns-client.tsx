'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Zap, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input }  from '@/components/ui/input';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { HOTELS } from '@/lib/hotels';
import {
  createCampaign,
  updateCampaign,
  deleteCampaign,
} from '@/app/actions/campaigns';
import type { Campaign } from './page';

// ── Status helpers ─────────────────────────────────────────────────────────────

type CampaignStatus = 'active' | 'upcoming' | 'ended';

function getStatus(campaign: Campaign): CampaignStatus {
  const today = new Date().toISOString().slice(0, 10);
  if (campaign.end_date < today)   return 'ended';
  if (campaign.start_date > today) return 'upcoming';
  return 'active';
}

const STATUS_STYLES: Record<CampaignStatus, string> = {
  active:   'bg-emerald-100 text-emerald-700',
  upcoming: 'bg-blue-100    text-blue-700',
  ended:    'bg-slate-100   text-slate-500',
};

const STATUS_LABEL: Record<CampaignStatus, string> = {
  active:   'Active',
  upcoming: 'Upcoming',
  ended:    'Ended',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ── Blank form ─────────────────────────────────────────────────────────────────

const BLANK = {
  title:             '',
  description:       '',
  points_multiplier: 2,
  hotel:             '' as string,
  start_date:        '',
  end_date:          '',
};

type FormState = typeof BLANK;

// ── Campaign form dialog ───────────────────────────────────────────────────────

function CampaignDialog({
  open,
  initial,
  onClose,
  onSave,
  saving,
}: {
  open:    boolean;
  initial: FormState;
  onClose: () => void;
  onSave:  (form: FormState) => void;
  saving:  boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);

  // Sync when dialog reopens with different data
  const handleOpenChange = (open: boolean) => {
    if (open) setForm(initial);
    else      onClose();
  };

  function set(key: keyof FormState, value: string | number) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const valid =
    form.title.trim().length >= 3 &&
    form.hotel !== '' &&
    form.start_date !== '' &&
    form.end_date   !== '' &&
    form.end_date   >= form.start_date &&
    form.points_multiplier >= 1;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial.title ? 'Edit Campaign' : 'New Campaign'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Title</label>
            <Input
              placeholder="e.g. Customer Service Week"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Description <span className="text-muted-foreground">(optional)</span></label>
            <Input
              placeholder="Brief description shown to employees"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          {/* Hotel */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Hotel</label>
            <Select value={form.hotel} onValueChange={(v) => set('hotel', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select hotel" />
              </SelectTrigger>
              <SelectContent>
                {HOTELS.map((h) => (
                  <SelectItem key={h} value={h}>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Multiplier */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Points Multiplier</label>
            <Select
              value={String(form.points_multiplier)}
              onValueChange={(v) => set('points_multiplier', Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5].map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m}× — {10 * m} pts per recognition (base: 10)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Employees earn {form.points_multiplier * 10} pts per recognition during this campaign
              ({form.points_multiplier - 1 > 0 ? `+${(form.points_multiplier - 1) * 10} bonus` : 'no bonus'}).
            </p>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => set('start_date', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={form.end_date}
                min={form.start_date}
                onChange={(e) => set('end_date', e.target.value)}
              />
            </div>
          </div>
          {form.start_date && form.end_date && form.end_date < form.start_date && (
            <p className="text-xs text-red-600">End date must be on or after start date.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!valid || saving}>
            {saving ? 'Saving…' : 'Save Campaign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function CampaignsClient({
  campaigns,
  selectedHotel,
}: {
  campaigns:     Campaign[];
  selectedHotel?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Campaign | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);

  // ── Filters ──────────────────────────────────────────────────────────────────

  function handleHotelFilter(val: string) {
    const url = new URLSearchParams();
    if (val !== 'all') url.set('hotel', val);
    router.push(`/campaigns${url.toString() ? '?' + url.toString() : ''}`);
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────────

  function handleSave(form: FormState) {
    startTransition(async () => {
      try {
        if (editTarget) {
          await updateCampaign(editTarget.id, form);
          toast.success('Campaign updated.');
        } else {
          await createCampaign(form);
          toast.success('Campaign created.');
        }
        setDialogOpen(false);
        setEditTarget(null);
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      try {
        await deleteCampaign(deleteTarget.id);
        toast.success('Campaign deleted.');
        setDeleteTarget(null);
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  }

  function openCreate() {
    setEditTarget(null);
    setDialogOpen(true);
  }

  function openEdit(c: Campaign) {
    setEditTarget(c);
    setDialogOpen(true);
  }

  // Build initial form state from existing campaign or blank
  const dialogInitial: FormState = editTarget
    ? {
        title:             editTarget.title,
        description:       editTarget.description ?? '',
        points_multiplier: editTarget.points_multiplier,
        hotel:             editTarget.hotel,
        start_date:        editTarget.start_date,
        end_date:          editTarget.end_date,
      }
    : { ...BLANK, hotel: selectedHotel ?? '' };

  // ── Group by status ───────────────────────────────────────────────────────────

  const active   = campaigns.filter((c) => getStatus(c) === 'active');
  const upcoming = campaigns.filter((c) => getStatus(c) === 'upcoming');
  const ended    = campaigns.filter((c) => getStatus(c) === 'ended');

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
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

        <Button className="ml-auto" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {/* Campaign lists */}
      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <Zap className="mb-3 h-8 w-8 opacity-40" />
          <p className="font-medium">No campaigns yet</p>
          <p className="text-sm">Create a campaign to boost recognition points during special events.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {[
            { label: 'Active',   items: active   },
            { label: 'Upcoming', items: upcoming },
            { label: 'Ended',    items: ended    },
          ].map(({ label, items }) =>
            items.length === 0 ? null : (
              <section key={label}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {label} ({items.length})
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((c) => {
                    const status = getStatus(c);
                    return (
                      <div
                        key={c.id}
                        className="relative flex flex-col gap-3 rounded-lg border bg-card p-4"
                      >
                        {/* Status badge */}
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}
                          >
                            {STATUS_LABEL[status]}
                          </span>

                          <div className="flex shrink-0 gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEdit(c)}
                              disabled={isPending}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-600"
                              onClick={() => setDeleteTarget(c)}
                              disabled={isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Title + description */}
                        <div>
                          <h3 className="font-semibold leading-tight">{c.title}</h3>
                          {c.description && (
                            <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                              {c.description}
                            </p>
                          )}
                        </div>

                        {/* Multiplier pill */}
                        <div className="flex items-center gap-1.5">
                          <span className="flex items-center gap-1 rounded-md bg-fuchsia-50 px-2 py-1 text-sm font-bold text-fuchsia-700">
                            <Zap className="h-3.5 w-3.5" />
                            {c.points_multiplier}× points
                          </span>
                          <span className="text-xs text-muted-foreground">
                            = {c.points_multiplier * 10} pts per recognition
                          </span>
                        </div>

                        {/* Hotel + dates */}
                        <div className="space-y-0.5 text-xs text-muted-foreground">
                          <p className="font-medium text-foreground">{c.hotel}</p>
                          <p>
                            {formatDate(c.start_date)} — {formatDate(c.end_date)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ),
          )}
        </div>
      )}

      {/* Create / Edit dialog */}
      <CampaignDialog
        open={dialogOpen}
        initial={dialogInitial}
        onClose={() => { setDialogOpen(false); setEditTarget(null); }}
        onSave={handleSave}
        saving={isPending}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.title}</strong> will be permanently deleted.
              Any bonus points already awarded will not be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
              disabled={isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
