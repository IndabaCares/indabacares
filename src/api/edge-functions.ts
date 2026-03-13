/**
 * Typed wrappers for Supabase Edge Functions.
 *
 * NOTE: All Edge Functions listed here use `withAuth` middleware which validates
 * a Supabase Auth JWT. Employee auth users have no Supabase Auth session, so
 * these calls will return 401 until the Edge Functions are rewritten to accept
 * the x-session-token header instead.
 *
 * TODO: Migrate each Edge Function to a new `withEmployeeAuth` middleware that
 * validates x-session-token against employee_active_sessions.
 */

import { supabase } from '@/lib/supabase';
import type {
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
    const context = (error as any).context;
    let message = error.message || 'Edge function call failed';
    const status = (error as { status?: number }).status || 500;

    if (context && typeof context.json === 'function') {
      try {
        const body = await context.json();
        if (body?.error) message = body.error;
      } catch {}
    }

    throw new EdgeFunctionCallError(message, status);
  }

  if (data && typeof data === 'object' && 'error' in data) {
    const errData = data as EdgeFunctionError;
    throw new EdgeFunctionCallError(errData.error, 400);
  }

  return data as T;
}

// ─── Recognition ─────────────────────────────────────────────────────────────

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

// ─── Mood ─────────────────────────────────────────────────────────────────────

export async function submitMood(body: SubmitMoodRequest): Promise<SubmitMoodResponse> {
  return invoke<SubmitMoodResponse>('submit-mood', body);
}

// ─── Rewards ──────────────────────────────────────────────────────────────────

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
