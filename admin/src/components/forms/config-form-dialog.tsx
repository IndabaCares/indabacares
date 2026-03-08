'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ConfigFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  isPending?: boolean;
  onSave: () => void;
  children: React.ReactNode;
}

export function ConfigFormDialog({
  open,
  onOpenChange,
  title,
  isPending,
  onSave,
  children,
}: ConfigFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">{children}</div>
        <DialogFooter>
          <Button onClick={onSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
