/**
 * Typed wrappers for all Supabase Edge Functions.
 * These go through supabase.functions.invoke() which attaches the auth token.
 */

import { supabase } from '@/lib/supabase';
import type {
  AuthMeResponse,
  ClaimEmployeeCodeRequest,
  ClaimEmployeeCodeResponse,
  SendRecognitionRequest,
  SendRecognitionResponse,
  SubmitMoodRequest,
  SubmitMoodResponse,
  RedeemRewardRequest,
  RedeemRewardResponse,
  CancelRedemptionRequest,
  CancelRedemptionResponse,
  BoostRecognitionRequest,
  BoostRecognitionResponse,
  EdgeFunctionError,
} from '@/types/api';

class EdgeFunctionCallError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'EdgeFunctionCallError';
    this.status = status;
  }
}

async function invoke<T>(
  functionName: string,
  body?: unknown,
  method: 'GET' | 'POST' = 'POST'
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: body ?? undefined,
    method,
  });

  if (error) {
    // Try to extract the real error message from the response context
    const context = (error as any).context;
    let message = error.message || 'Edge function call failed';
    let status = (error as { status?: number }).status || 500;

    if (context && typeof context.json === 'function') {
      try {
        const body = await context.json();
        if (body?.error) message = body.error;
      } catch {}
    }

    throw new EdgeFunctionCallError(message, status);
  }

  // If data contains an error field, it's a structured error from the function
  if (data && typeof data === 'object' && 'error' in data) {
    const errData = data as EdgeFunctionError;
    throw new EdgeFunctionCallError(errData.error, 400);
  }

  return data as T;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function authMe(): Promise<AuthMeResponse> {
  return invoke<AuthMeResponse>('auth-me', undefined, 'GET');
}

// ─── Onboarding ──────────────────────────────────────────────────────────────

export async function claimEmployeeCode(
  body: ClaimEmployeeCodeRequest
): Promise<ClaimEmployeeCodeResponse> {
  return invoke<ClaimEmployeeCodeResponse>('claim-employee-code', body);
}

// ─── Recognition ────────────────────────────────────────────────────────────

export async function sendRecognition(
  body: SendRecognitionRequest
): Promise<SendRecognitionResponse> {
  return invoke<SendRecognitionResponse>('send-recognition', body);
}

export async function boostRecognition(
  body: BoostRecognitionRequest
): Promise<BoostRecognitionResponse> {
  return invoke<BoostRecognitionResponse>('boost-recognition', body);
}

// ─── Mood ────────────────────────────────────────────────────────────────────

export async function submitMood(body: SubmitMoodRequest): Promise<SubmitMoodResponse> {
  return invoke<SubmitMoodResponse>('submit-mood', body);
}

// ─── Rewards ────────────────────────────────────────────────────────────────

export async function redeemReward(
  body: RedeemRewardRequest
): Promise<RedeemRewardResponse> {
  return invoke<RedeemRewardResponse>('redeem-reward', body);
}

export async function cancelRedemption(
  body: CancelRedemptionRequest
): Promise<CancelRedemptionResponse> {
  return invoke<CancelRedemptionResponse>('cancel-redemption', body);
}
