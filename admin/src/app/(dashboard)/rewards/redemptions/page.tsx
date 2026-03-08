'use client';

import { useState } from 'react';
import { useRedemptions, useManageRedemption } from '@/hooks/use-rewards';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Download, CheckCircle, XCircle, Package, Truck, CircleCheck, Loader2 } from 'lucide-react';
import { REDEMPTION_STATUS } from '@/lib/constants';
import { formatDateTime, getInitials } from '@/lib/utils';
import { exportRedemptions } from '@/api/export';
import type { ColumnDef } from '@tanstack/react-table';
import type { RedemptionAction } from '@/types/api';

interface RedemptionRow {
  id: string; star_cost: number; status: string; admin_note: string | null;
  created_at: string; updated_at: string;
  user: { id: string; full_name: string; email: string; avatar_url: string | null } | null;
  reward: { id: string; name: string; image_url: string | null; star_cost: number } | null;
  processor: { id: string; full_name: string } | null;
}

const STATUS_TABS = ['all', 'pending', 'approved', 'in_preparation', 'shipped', 'fulfilled', 'rejected'];

const ACTION_MAP: Record<string, { actions: { action: RedemptionAction; label: string; icon: React.ElementType; variant: 'default' | 'destructive' }[] }> = {
  pending: { actions: [{ action: 'approve', label: 'Approve', icon: CheckCircle, variant: 'default' }, { action: 'reject', label: 'Reject', icon: XCircle, variant: 'destructive' }] },
  approved: { actions: [{ action: 'prepare', label: 'Prepare', icon: Package, variant: 'default' }] },
  in_preparation: { actions: [{ action: 'ship', label: 'Ship', icon: Truck, variant: 'default' }] },
  shipped: { actions: [{ action: 'fulfill', label: 'Fulfill', icon: CircleCheck, variant: 'default' }] },
};

export default function RedemptionsPage() {
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(0);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const { data, isLoading } = useRedemptions({ status, page });
  const manage = useManageRedemption();

  function handleAction(id: string, action: RedemptionAction) {
    if (action === 'reject') {
      setRejectId(id);
      setRejectNote('');
    } else {
      manage.mutate({ id, action });
    }
  }

  function confirmReject() {
    if (!rejectId) return;
    manage.mutate({ id: rejectId, action: 'reject', note: rejectNote }, { onSuccess: () => setRejectId(null) });
  }

  const columns: ColumnDef<RedemptionRow, unknown>[] = [
    { accessorKey: 'user', header: 'User', cell: ({ row }) => {
      const u = row.original.user;
      return u ? <div className="flex items-center gap-2"><Avatar className="h-7 w-7"><AvatarImage src={u.avatar_url ?? undefined} /><AvatarFallback className="text-xs">{getInitials(u.full_name)}</AvatarFallback></Avatar><span className="text-sm">{u.full_name}</span></div> : '—';
    }},
    { accessorKey: 'reward', header: 'Reward', cell: ({ row }) => <span className="text-sm font-medium">{row.original.reward?.name ?? '—'}</span> },
    { accessorKey: 'star_cost', header: 'Stars', cell: ({ row }) => <Badge variant="secondary">{row.original.star_cost}</Badge> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => {
      const s = REDEMPTION_STATUS[row.original.status];
      return <Badge className={s?.color}>{s?.label ?? row.original.status}</Badge>;
    }},
    { accessorKey: 'created_at', header: 'Requested', cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDateTime(row.original.created_at)}</span> },
    { accessorKey: 'processor', header: 'Processed By', cell: ({ row }) => <span className="text-sm">{row.original.processor?.full_name ?? '—'}</span> },
    { id: 'actions', cell: ({ row }) => {
      const acts = ACTION_MAP[row.original.status];
      if (!acts) return null;
      return <div className="flex items-center gap-1">{acts.actions.map((a) => {
        const Icon = a.icon;
        return <Button key={a.action} variant={a.variant === 'destructive' ? 'destructive' : 'outline'} size="sm" onClick={() => handleAction(row.original.id, a.action)} disabled={manage.isPending}>
          {manage.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Icon className="mr-1 h-3 w-3" />}{a.label}
        </Button>;
      })}</div>;
    }},
  ];

  return (
    <div>
      <PageHeader title="Redemption Queue" description="Manage reward redemption orders"
        actions={<Button variant="outline" size="sm" onClick={() => data?.redemptions && exportRedemptions(data.redemptions)} disabled={!data?.redemptions?.length}><Download className="mr-2 h-4 w-4" />Export</Button>} />

      <Tabs value={status} onValueChange={(v) => { setStatus(v); setPage(0); }} className="mb-4">
        <TabsList>{STATUS_TABS.map((s) => <TabsTrigger key={s} value={s} className="capitalize">{REDEMPTION_STATUS[s]?.label ?? 'All'}</TabsTrigger>)}</TabsList>
      </Tabs>

      <DataTable columns={columns} data={data?.redemptions ?? []} totalCount={data?.total ?? 0} page={page} onPageChange={setPage} isLoading={isLoading} emptyMessage="No redemptions found." />

      <Dialog open={!!rejectId} onOpenChange={(v) => !v && setRejectId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Redemption</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>Reason (required)</Label><Textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Explain why this is being rejected..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmReject} disabled={!rejectNote.trim() || manage.isPending}>
              {manage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Reject & Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
