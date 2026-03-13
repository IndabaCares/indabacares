'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

export async function approveRedemption(id: string) {
  const db = createAdminClient();
  const { error } = await db.rpc('approve_redemption', { p_redemption_id: id });
  if (error) throw new Error(error.message);
  revalidatePath('/redemptions');
}

export async function rejectRedemption(id: string, reason?: string) {
  const db = createAdminClient();
  const { error } = await db.rpc('reject_redemption', {
    p_redemption_id: id,
    p_reason:        reason ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/redemptions');
}

export async function fulfillRedemption(id: string) {
  const db = createAdminClient();
  const { error } = await db.rpc('fulfill_redemption', { p_redemption_id: id });
  if (error) throw new Error(error.message);
  revalidatePath('/redemptions');
}
