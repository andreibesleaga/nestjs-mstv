import type { OrchestrationInput } from './types';
import { request } from 'undici';

// Placeholder activity functions. Replace with real integrations.
export async function action1(input: OrchestrationInput) {
  // e.g., call payment service
  return { ok: true, action1Id: `action1-${input.jobId}` };
}

export async function action2(input: OrchestrationInput) {
  // e.g., call inventory service
  return { ok: true, action2Id: `action2-${input.jobId}` };
}

export async function action3(input: OrchestrationInput) {
  // e.g., call shipping service
  return { ok: true, action3Id: `action3-${input.jobId}` };
}

// Saga compensations
export async function reaction1(_input: OrchestrationInput) {
  return { ok: true };
}

export async function reaction2(_input: OrchestrationInput) {
  return { ok: true };
}

export async function healthCheck(url: string) {
  try {
    const res = await request(url, { method: 'GET' });
    const ok = res.statusCode >= 200 && res.statusCode < 300;
    return { ok, status: res.statusCode };
  } catch {
    return { ok: false, status: 0 };
  }
}
