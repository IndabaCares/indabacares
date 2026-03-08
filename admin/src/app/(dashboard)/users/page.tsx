'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useUsers } from '@/hooks/use-users';
import { useDepartments } from '@/hooks/use-departments';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, Download, Eye } from 'lucide-react';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/constants';
import { formatDate, getInitials, formatNumber } from '@/lib/utils';
import { exportUsers } from '@/api/export';
import type { ColumnDef } from '@tanstack/react-table';

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  department_id: string | null;
  job_title: string | null;
  points_balance: number;
  stars_balance: number;
  giving_balance: number;
  is_active: boolean;
  created_at: string;
  departments: { id: string; name: string } | null;
}

const columns: ColumnDef<UserRow, unknown>[] = [
  {
    accessorKey: 'full_name',
    header: 'User',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          {row.original.avatar_url && (
            <AvatarImage src={row.original.avatar_url} />
          )}
          <AvatarFallback className="text-xs">
            {getInitials(row.original.full_name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">{row.original.full_name}</p>
          <p className="text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => (
      <Badge variant="secondary" className={ROLE_COLORS[row.original.role]}>
        {ROLE_LABELS[row.original.role] ?? row.original.role}
      </Badge>
    ),
  },
  {
    accessorKey: 'departments',
    header: 'Department',
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.departments?.name ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'is_active',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.original.is_active ? 'default' : 'destructive'}>
        {row.original.is_active ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
  {
    accessorKey: 'points_balance',
    header: 'Points',
    cell: ({ row }) => (
      <span className="text-sm font-medium">
        {formatNumber(row.original.points_balance)}
      </span>
    ),
  },
  {
    accessorKey: 'stars_balance',
    header: 'Stars',
    cell: ({ row }) => (
      <span className="text-sm font-medium">
        {formatNumber(row.original.stars_balance)}
      </span>
    ),
  },
  {
    accessorKey: 'created_at',
    header: 'Joined',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatDate(row.original.created_at)}
      </span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <Link href={`/users/${row.original.id}`}>
        <Button variant="ghost" size="sm">
          <Eye className="mr-1 h-4 w-4" />
          View
        </Button>
      </Link>
    ),
  },
];

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [deptId, setDeptId] = useState('all');
  const [page, setPage] = useState(0);

  const { data: depts } = useDepartments();
  const { data, isLoading } = useUsers({
    search: search || undefined,
    role: role !== 'all' ? role : undefined,
    departmentId: deptId !== 'all' ? deptId : undefined,
    page,
  });

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage employee accounts"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => data?.users && exportUsers(data.users)}
              disabled={!data?.users?.length}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Link href="/users/invite">
              <Button size="sm">
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Users
              </Button>
            </Link>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="max-w-xs"
        />
        <Select value={role} onValueChange={(v) => { setRole(v); setPage(0); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
          </SelectContent>
        </Select>
        <Select value={deptId} onValueChange={(v) => { setDeptId(v); setPage(0); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {(depts ?? []).map((d: any) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.users ?? []}
        totalCount={data?.total ?? 0}
        page={page}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyMessage="No users found."
      />
    </div>
  );
}
