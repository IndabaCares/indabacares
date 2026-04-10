/**
 * CSV import validation logic.
 *
 * Two-phase validation:
 *
 *   Phase 1 — pure (no DB): field presence, format, hotel whitelist,
 *             within-file duplicate detection.
 *
 *   Phase 2 — DB check: compare against existing (employee_code, hotel)
 *             pairs to classify rows as INSERT or UPDATE.
 *
 * Row statuses:
 *   'valid'  — will be inserted as a new employee
 *   'update' — already exists, will be updated (name/dept/position)
 *   'error'  — has one or more validation errors, will be skipped
 */

import { HOTELS } from '@/lib/hotels';
import type { RawRow } from './parser';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RowStatus = 'valid' | 'update' | 'error';

export interface ValidatedRow {
  /** 1-based CSV line number. */
  lineNumber:    number;
  /** Raw field values from the CSV. */
  raw:           Record<string, string>;
  /** Normalised values (uppercase code, trimmed strings). */
  employee_code: string;
  full_name:     string;
  hotel:         string;
  email:         string | null;
  /** Whether this row will INSERT or UPDATE. */
  status:        RowStatus;
  /** Human-readable error messages. Empty when status !== 'error'. */
  errors:        string[];
}

export interface ValidationSummary {
  rows:        ValidatedRow[];
  totalRows:   number;
  validCount:  number;  // will insert
  updateCount: number;  // will update
  errorCount:  number;  // will skip
  /** True when at least one row can be imported (valid + update). */
  canImport:   boolean;
}

// ─── Required columns ─────────────────────────────────────────────────────────

export const REQUIRED_COLUMNS = ['full_name', 'employee_code', 'hotel'] as const;

export function validateHeaders(headers: string[]): string[] {
  return REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
}

// ─── Phase 1: pure validation ─────────────────────────────────────────────────

export function validateRows(rawRows: RawRow[]): ValidatedRow[] {
  // Track codes seen within the file to detect within-CSV duplicates.
  const seenKeys = new Map<string, number>(); // key → first lineNumber

  return rawRows.map((raw) => {
    const errors: string[] = [];

    const full_name     = (raw.fields.full_name     ?? '').trim();
    const employee_code = (raw.fields.employee_code ?? '').trim().toUpperCase();
    const hotel         = (raw.fields.hotel         ?? '').trim();
    const emailRaw      = (raw.fields.email         ?? '').trim();
    const email         = emailRaw || null;

    // Required field checks
    if (!full_name)     errors.push('full_name is required');
    if (!employee_code) errors.push('employee_code is required');
    if (!hotel)         errors.push('hotel is required');

    // Hotel whitelist
    if (hotel && !(HOTELS as readonly string[]).includes(hotel)) {
      errors.push(
        `"${hotel}" is not a valid hotel. Allowed values: ${HOTELS.join(', ')}`,
      );
    }

    // employee_code format: alphanumeric + hyphens/underscores only
    if (employee_code && !/^[A-Z0-9_-]+$/.test(employee_code)) {
      errors.push(
        'employee_code must contain only letters, numbers, hyphens, and underscores',
      );
    }

    // Email format (optional but validated when present)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('email is not a valid email address');
    }

    // Within-file duplicate detection
    if (employee_code && hotel) {
      const dedupeKey = `${employee_code}::${hotel}`;
      if (seenKeys.has(dedupeKey)) {
        errors.push(
          `Duplicate of row ${seenKeys.get(dedupeKey)} — same employee_code + hotel`,
        );
      } else {
        seenKeys.set(dedupeKey, raw.lineNumber);
      }
    }

    return {
      lineNumber:    raw.lineNumber,
      raw:           raw.fields,
      employee_code,
      full_name,
      hotel,
      email,
      status:        errors.length > 0 ? 'error' : 'valid',
      errors,
    };
  });
}

// ─── Phase 2: DB reconciliation ───────────────────────────────────────────────

/**
 * Given validated rows and the set of existing (employee_code, hotel) pairs
 * already in the database, upgrade 'valid' rows that already exist to 'update'.
 *
 * existingKeys should be a Set of `${EMPLOYEE_CODE}::${hotel}` strings.
 */
export function applyDbCheck(
  rows:         ValidatedRow[],
  existingKeys: Set<string>,
): ValidatedRow[] {
  return rows.map((row) => {
    if (row.status !== 'valid') return row;

    const key = `${row.employee_code}::${row.hotel}`;
    if (existingKeys.has(key)) {
      return { ...row, status: 'update' as RowStatus };
    }
    return row;
  });
}

// ─── Summary builder ──────────────────────────────────────────────────────────

export function buildSummary(rows: ValidatedRow[]): ValidationSummary {
  const validCount  = rows.filter((r) => r.status === 'valid').length;
  const updateCount = rows.filter((r) => r.status === 'update').length;
  const errorCount  = rows.filter((r) => r.status === 'error').length;

  return {
    rows,
    totalRows:   rows.length,
    validCount,
    updateCount,
    errorCount,
    canImport:   validCount + updateCount > 0,
  };
}
