'use client';

import { useState } from 'react';
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from '@/hooks/use-departments';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';

interface DeptRow {
  id: string;
  name: string;
  created_at: string;
}

export default function DepartmentsPage() {
  const { data: departments, isLoading } = useDepartments();
  const create = useCreateDepartment();
  const update = useUpdateDepartment();
  const remove = useDeleteDepartment();

  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');

  function openCreate() {
    setEditId(null);
    setName('');
    setIsOpen(true);
  }

  function openEdit(dept: DeptRow) {
    setEditId(dept.id);
    setName(dept.name);
    setIsOpen(true);
  }

  function handleSave() {
    if (!name.trim()) return;
    if (editId) {
      update.mutate(
        { id: editId, name: name.trim() },
        { onSuccess: () => setIsOpen(false) }
      );
    } else {
      create.mutate(name.trim(), { onSuccess: () => setIsOpen(false) });
    }
  }

  const columns: ColumnDef<DeptRow, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {row.original.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This cannot be undone. Ensure no users are assigned to this
                  department first.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => remove.mutate(row.original.id)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Manage organizational departments"
        actions={
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Department
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editId ? 'Edit' : 'Create'} Department
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="dept-name">Name</Label>
                  <Input
                    id="dept-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Engineering"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleSave}
                  disabled={
                    !name.trim() || create.isPending || update.isPending
                  }
                >
                  {editId ? 'Save Changes' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <DataTable
        columns={columns}
        data={(departments as DeptRow[]) ?? []}
        isLoading={isLoading}
        emptyMessage="No departments yet."
      />
    </div>
  );
}
