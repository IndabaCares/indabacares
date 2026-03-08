/**
 * employee-auth-helpers.ts
 *
 * Pure authentication functions for the EmployeeAuthScreen.
 * All Supabase queries live here — the screen only calls these.
 *
 * Password hashing uses bcryptjs (pure-JS bcrypt, works in React Native).
 * The hashes it produces are compatible with PostgreSQL pgcrypto bcrypt,
 * so records set here can also be verified server-side if needed.
 */

import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';

const BCRYPT_ROUNDS = 10;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmployeeRow {
  id:            string;
  full_name:     string;
  employee_code: string;
  hotel:         string;
  password_hash: string | null;
  status:        string;
}

export type AuthSuccess = {
  ok:            true;
  employee_id:   string;
  full_name:     string;
  employee_code: string;
  hotel:         string;
};

export type AuthFailure = {
  ok:    false;
  error: string;
};

export type AuthResult = AuthSuccess | AuthFailure;

// ─── firstAuthentication ──────────────────────────────────────────────────────
//
// Called when an employee logs in for the first time (password_hash IS NULL).
//
// Steps:
//   1. Query employees by employee_code + full_name + hotel
//   2. Confirm the account has no password yet
//   3. Hash the chosen password client-side with bcrypt
//   4. Write the hash back to the row
//   5. Return session data on success

export async function firstAuthentication(
  fullName:     string,
  employeeCode: string,
  hotel:        string,
  password:     string,
): Promise<AuthResult> {
  // ── Step 1: verify identity ────────────────────────────────────────────────
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('employee_code', employeeCode.trim().toUpperCase())
    .eq('full_name',     fullName.trim())
    .eq('hotel',         hotel)
    .eq('status',        'active')
    .single<EmployeeRow>();

  if (error || !data) {
    return { ok: false, error: 'Employee not recognised. Please contact HR.' };
  }

  // ── Step 2: guard — must not already have a password ──────────────────────
  if (data.password_hash !== null) {
    return {
      ok:    false,
      error: 'This account already has a password. Please use the Login tab.',
    };
  }

  // ── Step 3: hash the password ─────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // ── Step 4: store hash ────────────────────────────────────────────────────
  const { error: updateError } = await supabase
    .from('employees')
    .update({ password_hash: hashedPassword })
    .eq('id', data.id);

  if (updateError) {
    return { ok: false, error: 'Could not save password. Please try again.' };
  }

  // ── Step 5: return session payload ────────────────────────────────────────
  return {
    ok:            true,
    employee_id:   data.id,
    full_name:     data.full_name,
    employee_code: data.employee_code,
    hotel:         data.hotel,
  };
}

// ─── returningLogin ───────────────────────────────────────────────────────────
//
// Called for employees who have already set a password.
// Only requires employee_code + password — hotel is NOT asked again.
//
// Steps:
//   1. Query employee by employee_code only (hotel stored in session)
//   2. Confirm a password hash exists
//   3. Compare the supplied password against the stored bcrypt hash
//   4. Return session data on match

export async function returningLogin(
  employeeCode: string,
  password:     string,
): Promise<AuthResult> {
  // ── Step 1: fetch employee row by code only ───────────────────────────────
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('employee_code', employeeCode.trim().toUpperCase())
    .eq('status',        'active')
    .single<EmployeeRow>();

  if (error || !data) {
    return { ok: false, error: 'Employee not recognised. Please contact HR.' };
  }

  // ── Step 2: confirm hash exists ───────────────────────────────────────────
  if (!data.password_hash) {
    return {
      ok:    false,
      error: 'No password set. Please use the First Time tab to create one.',
    };
  }

  // ── Step 3: compare password ──────────────────────────────────────────────
  const match = await bcrypt.compare(password, data.password_hash);

  if (!match) {
    return { ok: false, error: 'Incorrect password.' };
  }

  // ── Step 4: return session payload ────────────────────────────────────────
  return {
    ok:            true,
    employee_id:   data.id,
    full_name:     data.full_name,
    employee_code: data.employee_code,
    hotel:         data.hotel,
  };
}
