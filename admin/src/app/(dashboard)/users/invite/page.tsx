'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInviteUsers } from '@/hooks/use-users';
import { useDepartments } from '@/hooks/use-departments';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { InviteRequest } from '@/types/api';

interface InviteRow extends InviteRequest {
  key: number;
}

let nextKey = 1;

export default function InviteUsersPage() {
  const router = useRouter();
  const { data: depts } = useDepartments();
  const invite = useInviteUsers();

  const [rows, setRows] = useState<InviteRow[]>([
    { key: nextKey++, email: '', role: 'employee' },
  ]);

  function addRow() {
    setRows((prev) => [...prev, { key: nextKey++, email: '', role: 'employee' }]);
  }

  function removeRow(key: number) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function updateRow(key: number, updates: Partial<InviteRow>) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...updates } : r))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valid = rows.filter((r) => r.email.includes('@'));
    if (valid.length === 0) return;

    const invites: InviteRequest[] = valid.map(({ email, role, departmentId }) => ({
      email,
      role: role as 'employee' | 'manager' | 'admin',
      departmentId,
    }));

    invite.mutate(invites, {
      onSuccess: () => router.push('/users'),
    });
  }

  return (
    <div>
      <div className="mb-4">
        <Link href="/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Users
          </Button>
        </Link>
      </div>

      <PageHeader
        title="Invite Users"
        description="Send invitations to new team members"
      />

      <Card>
        <CardHeader>
          <CardTitle>Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {rows.map((row) => (
              <div key={row.key} className="flex items-end gap-3">
                <div className="flex-1">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="employee@company.com"
                    value={row.email}
                    onChange={(e) =>
                      updateRow(row.key, { email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="w-36">
                  <Label>Role</Label>
                  <Select
                    value={row.role ?? 'employee'}
                    onValueChange={(v) =>
                      updateRow(row.key, { role: v as InviteRow['role'] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-48">
                  <Label>Department</Label>
                  <Select
                    value={row.departmentId ?? 'none'}
                    onValueChange={(v) =>
                      updateRow(row.key, {
                        departmentId: v === 'none' ? undefined : v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {(depts ?? []).map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {rows.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(row.key)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRow}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Another
              </Button>
              <Button type="submit" disabled={invite.isPending}>
                {invite.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Send {rows.length > 1 ? `${rows.length} Invitations` : 'Invitation'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
