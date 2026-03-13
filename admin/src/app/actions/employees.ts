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
