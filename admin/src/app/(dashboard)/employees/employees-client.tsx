'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Upload, Search, Filter, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input }  from '@/components/ui/input';
import { Label }  from '@/components/ui/label';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { HOTELS } from '@/lib/hotels';
import { toggleEmployeeStatus, updateEmployee } from '@/app/actions/employees';
import { CsvImportDialog } from './csv-import-dialog';

interface Employee {
  id:             string;
  employee_code:  string;
  full_name:      string;
  hotel:          string;
  department:     string | null;
  position:       string | null;
  email:          string | null;
  status:         string;
  points_balance: number;
  created_at:     string;
}

const STATUS_CHIP: Record<string, string> = {
  active:   'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-100  text-slate-600',
  pending:  'bg-amber-100  text-amber-700',
};

// ── Edit Dialog ───────────────────────────────────────────────────────────────

function EditEmployeeDialog({
  employee,
  onClose,
}: {
  employee: Employee;
  onClose:  () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [fullName,   setFullName]   = useState(employee.full_name);
  const [department, setDepartment] = useState(employee.department ?? '');
  const [position,   setPosition]   = useState(employee.position   ?? '');
  const [email,      setEmail]      = useState(employee.email      ?? '');

  function handleSave() {
    if (!fullName.trim()) {
      toast.error('Name is required');
      return;
    }
    startTransition(async () => {
      try {
        await updateEmployee(employee.id, {
          full_name:  fullName,
          department: department || null,
          position:   position   || null,
          email:      email      || null,
        });
        toast.success('Employee updated');
        onClose();
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <p className="text-sm text-muted-foreground font-mono">{employee.employee_code} · {employee.hotel}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Full Name <span className="text-red-500">*</span></Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Front Office" />
          </div>
          <div className="space-y-1.5">
            <Label>Position</Label>
            <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Receptionist" />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="employee@hotel.com" type="email" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function EmployeesClient({
  employees,
  selectedHotel,
}: {
  employees:      Employee[];
  selectedHotel?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search,      setSearch]     = useState('');
  const [importOpen,  setImportOpen] = useState(false);
  const [editTarget,  setEditTarget] = useState<Employee | null>(null);

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = employees.filter(
    (e) =>
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_code.toLowerCase().includes(search.toLowerCase()) ||
      (e.department ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  function handleHotelFilter(val: string) {
    const url = new URLSearchParams();
    if (val !== 'all') url.set('hotel', val);
    router.push(`/employees${url.toString() ? '?' + url.toString() : ''}`);
  }

  function handleToggle(id: string, status: string) {
    startTransition(async () => {
      try {
        await toggleEmployeeStatus(id, status);
        toast.success('Status updated');
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, code, or department…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

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

        <Button onClick={() => setImportOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
      </div>

      {/* Row count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length.toLocaleString()} employee{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Hotel</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Points</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  No employees found.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((emp) => (
              <TableRow key={emp.id}>
                <TableCell className="font-mono text-xs">{emp.employee_code}</TableCell>
                <TableCell className="font-medium">{emp.full_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{emp.hotel}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{emp.department ?? '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{emp.position  ?? '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{emp.email ?? '—'}</TableCell>
                <TableCell className="text-right font-semibold">{emp.points_balance ?? 0}</TableCell>
                <TableCell>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CHIP[emp.status] ?? 'bg-slate-100 text-slate-600'}`}>
                    {emp.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditTarget(emp)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleToggle(emp.id, emp.status)}
                    >
                      {emp.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Import dialog */}
      <CsvImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />

      {/* Edit dialog */}
      {editTarget && (
        <EditEmployeeDialog
          employee={editTarget}
          onClose={() => {
            setEditTarget(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
