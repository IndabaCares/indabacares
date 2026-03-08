/**
 * Employee Authentication — client wrappers for Supabase RPC functions.
 *
 * Three-function flow (migration 015):
 *   1. verifyEmployeeIdentity  — first login step 1: match name + code + hotel
 *   2. setEmployeePassword     — first login step 2: set bcrypt password
 *   3. loginEmployee           — returning login: verify code + hotel + password
 *
 * All RPCs are SECURITY DEFINER and callable by the anon role.
 */

import { supabase } from '@/lib/supabase';

// ─── Allowed hotels (mirrors the database CHECK constraint) ──────────────────

export const ALLOWED_HOTELS = [
  'Indaba Hotel',
  'Indaba Lodge Richards Bay',
  'Indaba Lodge Gaborone',
  'Chobe Safari Lodge',
  'Chobe Bush Lodge',
  'Nata Lodge',
  'African Procurement Agencies',
] as const;

export type AllowedHotel = typeof ALLOWED_HOTELS[number];

// ─── 1. verifyEmployeeIdentity ────────────────────────────────────────────────

export interface VerifyIdentitySuccess {
  found:          true;
  needs_password: boolean;
  id:             string;
  full_name:      string;
  hotel:          string;
}

export interface VerifyIdentityFailure {
  found:  false;
  error:  string;
}

export type VerifyIdentityResult = VerifyIdentitySuccess | VerifyIdentityFailure;

/**
 * Step 1 of first login.
 * Matches full_name + employee_code + hotel against the employees table.
 *
 * Returns:
 *   { found: true, needs_password: true,  ... }  → employee has no password yet
 *   { found: true, needs_password: false, ... }  → employee already has a password
 *   { found: false, error: '...' }               → no match
 */
export async function verifyEmployeeIdentity(
  fullName:     string,
  employeeCode: string,
  hotel:        string,
): Promise<VerifyIdentityResult> {
  const { data, error } = await supabase.rpc('verify_employee_identity', {
    p_full_name:     fullName.trim(),
    p_employee_code: employeeCode.trim().toUpperCase(),
    p_hotel:         hotel.trim(),
  });

  if (error) throw new Error(error.message || 'Identity check failed. Please try again.');

  return data as VerifyIdentityResult;
}

// ─── 2. setEmployeePassword ───────────────────────────────────────────────────

export interface SetPasswordSuccess { success: true; }
export interface SetPasswordFailure { success: false; error: string; }
export type SetPasswordResult = SetPasswordSuccess | SetPasswordFailure;

/**
 * Step 2 of first login.
 * Stores a bcrypt hash for an employee whose password_hash is currently NULL.
 * Cannot overwrite an existing password.
 */
export async function setEmployeePassword(
  employeeId:  string,
  newPassword: string,
): Promise<SetPasswordResult> {
  const { data, error } = await supabase.rpc('set_employee_password', {
    p_employee_id:  employeeId,
    p_new_password: newPassword,
  });

  if (error) throw new Error(error.message || 'Failed to set password. Please try again.');

  return data as SetPasswordResult;
}

// ─── 3. loginEmployee ─────────────────────────────────────────────────────────

export interface LoginSuccess {
  found:      true;
  id:         string;
  full_name:  string;
  hotel:      string;
}

export interface LoginFailure {
  found:  false;
  error:  string;
}

export type LoginResult = LoginSuccess | LoginFailure;

/**
 * Returning login.
 * Verifies employee_code + hotel + password via bcrypt.
 * Never returns the hash to the client.
 */
export async function loginEmployee(
  employeeCode: string,
  hotel:        string,
  password:     string,
): Promise<LoginResult> {
  const { data, error } = await supabase.rpc('login_employee', {
    p_employee_code: employeeCode.trim().toUpperCase(),
    p_hotel:         hotel.trim(),
    p_password:      password,
  });

  if (error) throw new Error(error.message || 'Login failed. Please try again.');

  return data as LoginResult;
}
