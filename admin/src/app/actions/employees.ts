'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

/** Toggle an employee's status between active and inactive. */
export async function toggleEmployeeStatus(id: string, currentStatus: string) {
  const db   = createAdminClient();
  const next = currentStatus === 'active' ? 'inactive' : 'active';

  const { error } = await db
    .from('employees')
    .update({ status: next })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/employees');
}

/**
 * Delete an employee record.
 * Blocked if the employee has any recognitions or redemptions — deactivate instead.
 */
export async function deleteEmployee(id: string) {
  const db = createAdminClient();

  // Check for linked activity
  const [{ count: recCount }, { count: redCount }] = await Promise.all([
    db.from('recognitions').select('id', { count: 'exact', head: true }).or(`sender_id.eq.${id},recipient_id.eq.${id}`),
    db.from('redemptions').select('id', { count: 'exact', head: true }).eq('employee_id', id),
  ]);

  if ((recCount ?? 0) > 0 || (redCount ?? 0) > 0) {
    throw new Error(
      'This employee has existing activity (recognitions or redemptions) and cannot be deleted. Use Deactivate instead.',
    );
  }

  const { error } = await db.from('employees').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/employees');
}

/** Update editable fields on an employee record. */
export async function updateEmployee(
  id: string,
  fields: {
    full_name:  string;
    department: string | null;
    position:   string | null;
    email:      string | null;
  },
) {
  const db = createAdminClient();

  const { error } = await db
    .from('employees')
    .update({
      full_name:  fields.full_name.trim(),
      department: fields.department?.trim() || null,
      position:   fields.position?.trim()   || null,
      email:      fields.email?.trim().toLowerCase() || null,
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/employees');
}
