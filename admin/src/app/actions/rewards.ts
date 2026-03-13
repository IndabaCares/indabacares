'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { rewardSchema, employeeIdSchema, formatValidationError } from '@/lib/validation';

export async function createReward(raw: unknown) {
  const payload = rewardSchema.parse(raw);

  const db = createAdminClient();
  const { error } = await db.from('rewards').insert({
    title:           payload.title,
    description:     payload.description || null,
    points_required: payload.points_required,
    hotel:           payload.hotel,
    stock:           payload.stock ?? null,
    image_url:       payload.image_url || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/rewards');
}

export async function updateReward(id: string, raw: unknown) {
  employeeIdSchema.parse({ id }); // validate UUID
  const payload = rewardSchema.parse(raw);

  const db = createAdminClient();
  const { error } = await db.from('rewards').update({
    title:           payload.title,
    description:     payload.description || null,
    points_required: payload.points_required,
    hotel:           payload.hotel,
    stock:           payload.stock ?? null,
    image_url:       payload.image_url || null,
  }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/rewards');
}

export async function deleteReward(id: string) {
  employeeIdSchema.parse({ id });

  const db = createAdminClient();
  const { error } = await db.from('rewards').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/rewards');
}
