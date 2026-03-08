'use client';

import { use } from 'react';
import { useUserDetail, useUpdateRole, useDeactivateUser } from '@/hooks/use-users';
import { useDepartments } from '@/hooks/use-departments';
import { useAuthStore } from '@/stores/auth-store';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/constants';
import { formatDate, getInitials, formatNumber } from '@/lib/utils';
import { Star, Coins, Gift, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: user, isLoading } = useUserDetail(id);
  const { data: depts } = useDepartments();
  const currentUser = useAuthStore((s) => s.user);
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const updateRole = useUpdateRole();
  const deactivate = useDeactivateUser();

  const [selectedRole, setSelectedRole] = useState('');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return <p className="text-muted-foreground">User not found.</p>;
  }

  const canChangeRole =
    currentUser?.id !== user.id &&
    (isSuperAdmin || user.role !== 'super_admin');

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

      <PageHeader title={user.full_name} description={user.email} />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">{user.full_name}</h3>
                {user.display_name && (
                  <p className="text-sm text-muted-foreground">
                    Display: {user.display_name}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">{user.email}</p>
                {user.job_title && (
                  <p className="text-sm">{user.job_title}</p>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <Badge
                    variant="secondary"
                    className={ROLE_COLORS[user.role]}
                  >
                    {ROLE_LABELS[user.role] ?? user.role}
                  </Badge>
                  <Badge
                    variant={user.is_active ? 'default' : 'destructive'}
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Department
                </p>
                <p className="text-sm">
                  {user.departments?.name ?? 'Unassigned'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Joined
                </p>
                <p className="text-sm">{formatDate(user.created_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Balances Card */}
        <Card>
          <CardHeader>
            <CardTitle>Balances</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                <Coins className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Points</p>
                <p className="text-lg font-bold">
                  {formatNumber(user.points_balance)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Star className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Stars</p>
                <p className="text-lg font-bold">
                  {formatNumber(user.stars_balance)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <Gift className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Giving Budget</p>
                <p className="text-lg font-bold">
                  {formatNumber(user.giving_balance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Admin Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Role Change */}
          {canChangeRole && (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium">Change Role</p>
                <p className="text-xs text-muted-foreground">
                  Update this user&apos;s access level
                </p>
              </div>
              <Select
                value={selectedRole || user.role}
                onValueChange={setSelectedRole}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  {isSuperAdmin && (
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={
                  !selectedRole ||
                  selectedRole === user.role ||
                  updateRole.isPending
                }
                onClick={() =>
                  updateRole.mutate({ userId: user.id, newRole: selectedRole })
                }
              >
                Update
              </Button>
            </div>
          )}

          <Separator />

          {/* Activate / Deactivate */}
          {currentUser?.id !== user.id && (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {user.is_active ? 'Deactivate Account' : 'Reactivate Account'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user.is_active
                    ? 'This will block the user from logging in'
                    : 'This will restore the user\'s access'}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant={user.is_active ? 'destructive' : 'default'}
                    size="sm"
                    disabled={deactivate.isPending}
                  >
                    {user.is_active ? 'Deactivate' : 'Reactivate'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {user.is_active ? 'Deactivate' : 'Reactivate'}{' '}
                      {user.full_name}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {user.is_active
                        ? 'This user will be immediately blocked from accessing the platform.'
                        : 'This user will regain access to the platform.'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() =>
                        deactivate.mutate({
                          userId: user.id,
                          active: !user.is_active,
                        })
                      }
                    >
                      Confirm
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
