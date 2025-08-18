import { defineSignal, proxyActivities, setHandler, condition } from '@temporalio/workflow';
import type { OrchestrationInput, OrchestrationResult, SignalPayload } from './types';

// Activities as proxies to the worker-registered implementations
const activities = proxyActivities<{
  action1(input: OrchestrationInput): Promise<{ ok: boolean; action1Id?: string }>;
  action2(input: OrchestrationInput): Promise<{ ok: boolean; action2Id?: string }>;
  action3(input: OrchestrationInput): Promise<{ ok: boolean; action3Id?: string }>;
  reaction1(input: OrchestrationInput): Promise<{ ok: boolean }>;
  reaction2(input: OrchestrationInput): Promise<{ ok: boolean }>;
  healthCheck(url: string): Promise<{ ok: boolean; status: number }>;
}>({ startToCloseTimeout: '1 minute' });

// Signals
export const progressSignal = defineSignal<[payload: SignalPayload]>('progress');

export async function hybridWorkflow(input: OrchestrationInput): Promise<OrchestrationResult> {
  let action1Done = false;
  let action2Done = false;
  let action3Done = false;
  const details: Record<string, any> = {};

  setHandler(progressSignal, ({ type, data }) => {
    if (type === 'ACTION1_DONE') {
      action1Done = true;
      details.action1 = data;
    }
    if (type === 'ACTION2_DONE') {
      action2Done = true;
      details.action2 = data;
    }
    if (type === 'ACTION3_DONE') {
      action3Done = true;
      details.action3 = data;
    }
  });

  // Orchestration with Saga
  try {
    const act1 = await activities.action1(input);
    if (!act1.ok) throw new Error('Action1 failed');
    details.act1 = act1;

    const act2 = await activities.action2(input);
    if (!act2.ok) throw new Error('Action2 failed');
    details.act2 = act2;

    const act3 = await activities.action3(input);
    if (!act3.ok) throw new Error('Action3 failed');
    details.act3 = act3;
  } catch (err) {
    // Compensations
    await activities.reaction1(input).catch(() => undefined);
    await activities.reaction2(input).catch(() => undefined);
    return {
      jobId: input.jobId,
      status: 'FAILED',
      details: { error: (err as Error).message, ...details },
    };
  }

  // Wait for external signals to confirm completion (choreography)
  await condition(() => action1Done && action2Done && action3Done, '10 minutes');

  return { jobId: input.jobId, status: 'SUCCESS', details };
}

export async function nightlyHealthCheck(input: {
  url: string;
  jobId?: string;
}): Promise<{ ok: boolean; status: number; checkedAt: string }> {
  const res = await activities.healthCheck(input.url);
  return { ...res, checkedAt: new Date().toISOString() };
}
