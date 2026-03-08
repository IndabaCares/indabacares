'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DateRangePickerProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
}

export function DateRangePicker({ dateFrom, dateTo, onDateFromChange, onDateToChange }: DateRangePickerProps) {
  return (
    <div className="flex items-end gap-3">
      <div>
        <Label className="text-xs">From</Label>
        <Input type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} className="w-40" />
      </div>
      <div>
        <Label className="text-xs">To</Label>
        <Input type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} className="w-40" />
      </div>
    </div>
  );
}
