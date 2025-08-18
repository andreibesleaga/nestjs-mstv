import 'dotenv/config';
import { Client, Connection } from '@temporalio/client';
import { EnvironmentSchema } from './types';

async function main() {
  const env = EnvironmentSchema.parse(process.env);
  const connection = await Connection.connect({ address: env.TEMPORAL_ADDRESS });
  const client = new Client({ connection, namespace: env.TEMPORAL_NAMESPACE });

  const workflowId = `smoke-${Date.now()}`;
  console.log(`[smoke] Starting hybridWorkflow with id ${workflowId}`);

  const handle = await client.workflow.start('hybridWorkflow', {
    taskQueue: env.TEMPORAL_TASK_QUEUE,
    workflowId,
    args: [{ jobId: workflowId, payload: { hello: 'world' } }],
  });

  console.log(`[smoke] Workflow started. Signaling progress...`);

  await handle.signal('progress', { type: 'ACTION1_DONE', data: { step: 1 } });
  await handle.signal('progress', { type: 'ACTION2_DONE', data: { step: 2 } });
  await handle.signal('progress', { type: 'ACTION3_DONE', data: { step: 3 } });

  console.log(`[smoke] Waiting for result...`);
  const result = await handle.result();
  console.log(`[smoke] Result`, result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
