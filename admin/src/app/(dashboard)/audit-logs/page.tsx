'use client';

import { useState } from 'react';
import { useAuditLogs } from '@/hooks/use-audit-logs';
import { useAuthStore } from '@/stores/auth-store';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable } from '@/components/data-table/data-table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';

interface AuditRow {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  actor: { id: string; full_name: string; email: string } | null;
}

const columns: ColumnDef<AuditRow, unknown>[] = [
  {
    accessorKey: 'created_at',
    header: 'Timestamp',
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-xs">
        {formatDateTime(row.original.created_at)}
      </span>
    ),
  },
  {
    accessorKey: 'actor',
    header: 'Actor',
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.actor?.full_name ?? 'System'}
      </span>
    ),
  },
  {
    accessorKey: 'action',
    header: 'Action',
    cell: ({ row }) => (
      <Badge variant="outline" className="font-mono text-xs">
        {row.original.action}
      </Badge>
    ),
  },
  {
    accessorKey: 'target_type',
    header: 'Target',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.target_type
          ? `${row.original.target_type}:${row.original.target_id?.slice(0, 8)}`
          : '—'}
      </span>
    ),
  },
  {
    accessorKey: 'ip_address',
    header: 'IP',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.ip_address ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'metadata',
    header: 'Details',
    cell: ({ row }) => {
      const meta = row.original.metadata;
      if (!meta || Object.keys(meta).length === 0) return '—';
      return (
        <pre className="max-w-xs truncate text-xs text-muted-foreground">
          {JSON.stringify(meta).slice(0, 80)}
        </pre>
      );
    },
  },
];

export default function AuditLogsPage() {
  const user = useAuthStore((s) => s.user);
  const [action, setAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);

  const { data, isLoading } = useAuditLogs({
    action: action || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
  });

  if (user?.role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldAlert className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">Access Denied</p>
        <p className="text-sm text-muted-foreground">
          Only Super Admins can view audit logs.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Immutable record of all admin actions"
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Filter by action (e.g. user.deactivate)..."
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(0);
          }}
          className="max-w-xs"
        />
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(0);
          }}
          className="w-40"
          placeholder="From"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(0);
          }}
          className="w-40"
          placeholder="To"
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.logs ?? []}
        totalCount={data?.total ?? 0}
        page={page}
        pageSize={50}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyMessage="No audit logs found."
      />
    </div>
  );
}
