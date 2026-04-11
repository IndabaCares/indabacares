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
      email:      fields.email?.trim()       || null,
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/employees');
}
