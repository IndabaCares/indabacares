'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { campaignSchema, employeeIdSchema } from '@/lib/validation';

export async function createCampaign(raw: unknown) {
  const payload = campaignSchema.parse(raw);

  const db = createAdminClient();
  const { error } = await db.from('campaigns').insert({
    title:             payload.title,
    description:       payload.description || null,
    points_multiplier: payload.points_multiplier,
    hotel:             payload.hotel,
    start_date:        payload.start_date,
    end_date:          payload.end_date,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/campaigns');
}

export async function updateCampaign(id: string, raw: unknown) {
  employeeIdSchema.parse({ id });
  const payload = campaignSchema.parse(raw);

  const db = createAdminClient();
  const { error } = await db
    .from('campaigns')
    .update({
      title:             payload.title,
      description:       payload.description || null,
      points_multiplier: payload.points_multiplier,
      hotel:             payload.hotel,
      start_date:        payload.start_date,
      end_date:          payload.end_date,
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/campaigns');
}

export async function deleteCampaign(id: string) {
  employeeIdSchema.parse({ id });

  const db = createAdminClient();
  const { error } = await db.from('campaigns').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/campaigns');
}
