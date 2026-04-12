'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, CircleCheck } from 'lucide-react';
import { formatDateTime, getInitials } from '@/lib/utils';
import { createAdminClient } from '@/lib/supabase/admin';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RedemptionRow {
  id:               string;
  points_used:      number;
  status:           string;
  hotel:            string;
  rejection_reason: string | null;
  created_at:       string;
  approved_at:      string | null;
  rejected_at:      string | null;
  fulfilled_at:     string | null;
  employee: { id: string; full_name: string; photo_url: string | null; employee_code: string } | null;
  reward:   { id: string; title: string; image_url: string | null; points_required: number } | null;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string }> = {
  all:       { label: 'All',       color: '' },
  pending:   { label: 'Pending',   color: 'bg-amber-100 text-amber-800 border-amber-200' },
  approved:  { label: 'Approved',  color: 'bg-blue-100 text-blue-800 border-blue-200' },
  fulfilled: { label: 'Fulfilled', color: 'bg-green-100 text-green-800 border-green-200' },
  rejected:  { label: 'Rejected',  color: 'bg-red-100 text-red-800 border-red-200' },
};

const STATUS_TABS = ['all', 'pending', 'approved', 'fulfilled', 'rejected'];

const PAGE_SIZE = 20;

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchRedemptions(status: string, page: number) {
  const db   = createAdminClient();
  const from = page * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;

  let q = db
    .from('redemptions')
    .select(
      `id, points_used, status, rejection_reason, hotel, created_at, approved_at, rejected_at, fulfilled_at,
       employee:employees!employee_id ( id, full_name, photo_url, employee_code ),
       reward:rewards!reward_id ( id, title, image_url, points_required )`,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status !== 'all') q = q.eq('status', status);

  const { data, error, count } = await q;
  if (error) throw new Error(error.message);
  return { redemptions: (data ?? []) as unknown as RedemptionRow[], total: count ?? 0 };
}

async function performAction(id: string, action: 'approve' | 'reject' | 'fulfill', reason?: string) {
  const db = createAdminClient();

  if (action === 'approve') {
    const { error } = await db.rpc('approve_redemption', { p_redemption_id: id });
    if (error) throw new Error(error.message);
  } else if (action === 'fulfill') {
    const { error } = await db.rpc('fulfill_redemption', { p_redemption_id: id });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await db.rpc('reject_redemption', {
      p_redemption_id: id,
      p_reason:        reason ?? null,
    });
    if (error) throw new Error(error.message);
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RedemptionsPage() {
  const qc = useQueryClient();
  const [status,    setStatus]    = useState('pending');
  const [page,      setPage]      = useState(0);
  const [rejectId,  setRejectId]  = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-redemptions', status, page],
    queryFn:  () => fetchRedemptions(status, page),
  });

  const manage = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'approve' | 'reject' | 'fulfill'; reason?: string }) =>
      performAction(id, action, reason),
    onSuccess: () => {
      toast.success('Redemption updated');
      qc.invalidateQueries({ queryKey: ['admin-redemptions'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleAction(id: string, action: 'approve' | 'reject' | 'fulfill') {
    if (action === 'reject') {
      setRejectId(id);
      setRejectNote('');
    } else {
      manage.mutate({ id, action });
    }
  }

  function confirmReject() {
    if (!rejectId) return;
    manage.mutate(
      { id: rejectId, action: 'reject', reason: rejectNote },
      { onSuccess: () => setRejectId(null) },
    );
  }

  const columns: ColumnDef<RedemptionRow, unknown>[] = [
    {
      accessorKey: 'employee',
      header: 'Employee',
      cell: ({ row }) => {
        const e = row.original.employee;
        return e ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={e.photo_url ?? undefined} />
              <AvatarFallback className="text-xs">{getInitials(e.full_name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium leading-none">{e.full_name}</p>
              <p className="text-xs text-muted-foreground">{e.employee_code}</p>
            </div>
          </div>
        ) : '—';
      },
    },
    {
      accessorKey: 'reward',
      header: 'Reward',
      cell: ({ row }) => (
        <span className="text-sm font-medium">{row.original.reward?.title ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'points_used',
      header: 'Points',
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.points_used} pts</Badge>
      ),
    },
    {
      accessorKey: 'hotel',
      header: 'Hotel',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.hotel}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const meta = STATUS_META[row.original.status];
        return (
          <Badge className={meta?.color ?? ''} variant="outline">
            {meta?.label ?? row.original.status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Requested',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{formatDateTime(row.original.created_at)}</span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <div className="flex items-center gap-1">
            {s === 'pending' && (
              <>
                <Button
                  variant="outline" size="sm"
                  onClick={() => handleAction(row.original.id, 'approve')}
                  disabled={manage.isPending}
                >
                  <CheckCircle className="mr-1 h-3 w-3" />Approve
                </Button>
                <Button
                  variant="destructive" size="sm"
                  onClick={() => handleAction(row.original.id, 'reject')}
                  disabled={manage.isPending}
                >
                  <XCircle className="mr-1 h-3 w-3" />Reject
                </Button>
              </>
            )}
            {s === 'approved' && (
              <Button
                variant="outline" size="sm"
                onClick={() => handleAction(row.original.id, 'fulfill')}
                disabled={manage.isPending}
              >
                <CircleCheck className="mr-1 h-3 w-3" />Fulfill
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Redemption Queue"
        description="Review and process employee reward redemptions"
      />

      <Tabs value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
        <TabsList>
          {STATUS_TABS.map((s) => (
            <TabsTrigger key={s} value={s} className="capitalize">
              {STATUS_META[s]?.label ?? s}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DataTable
        columns={columns}
        data={data?.redemptions ?? []}
        totalCount={data?.total ?? 0}
        page={page}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyMessage="No redemptions found."
      />

      {/* Reject dialog */}
      <Dialog open={!!rejectId} onOpenChange={(v) => !v && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Redemption</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Reason (optional)</Label>
              <Textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Explain why this is being rejected…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={manage.isPending}
            >
              Reject &amp; Refund Points
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
