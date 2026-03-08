/**
 * Employee Authentication
 *
 * Calls the authenticate_employee() Supabase RPC function.
 * Works before any session exists (anon key is sufficient).
 *
 * The RPC is SECURITY DEFINER — it queries the employees table
 * internally and returns only what the client needs. The raw
 * employees table is never exposed to the anon role.
 */

import { supabase } from '@/lib/supabase';

export interface EmployeeAuthInput {
  fullName:     string;
  employeeCode: string;
  hotel:        string;
}

export interface EmployeeAuthSuccess {
  found:       true;
  id:          string;
  full_name:   string;
  hotel:       string;
  department:  string | null;
  position:    string | null;
}

export interface EmployeeAuthFailure {
  found:  false;
  error:  string;
}

export type EmployeeAuthResult = EmployeeAuthSuccess | EmployeeAuthFailure;

/**
 * Authenticate an employee against the employees table.
 *
 * @example
 * const result = await authenticateEmployee({
 *   fullName:     'Jane Doe',
 *   employeeCode: 'INDABA01',
 *   hotel:        'Indaba Hotel',
 * });
 *
 * if (result.found) {
 *   // proceed — result.id, result.hotel, etc. available
 * } else {
 *   // show result.error to the user
 * }
 */
export async function authenticateEmployee(
  input: EmployeeAuthInput
): Promise<EmployeeAuthResult> {
  const { data, error } = await supabase.rpc('authenticate_employee', {
    p_full_name:     input.fullName.trim(),
    p_employee_code: input.employeeCode.trim().toUpperCase(),
    p_hotel:         input.hotel.trim(),
  });

  if (error) {
    throw new Error(error.message || 'Authentication failed. Please try again.');
  }

  return data as EmployeeAuthResult;
}

// ─── Allowed hotels (mirrors the database CHECK constraint) ──────────────────

export const ALLOWED_HOTELS = [
  'Indaba Hotel',
  'Indaba Lodge Richards Bay',
  'Indaba Lodge Gaborone',
  'Chobe Safari Lodge',
  'Safari Bush Lodge',
  'Nata Lodge',
  'African Procurement Agencies',
] as const;

export type AllowedHotel = typeof ALLOWED_HOTELS[number];
