import 'dotenv/config';
import { Client, Connection } from '@temporalio/client';
import { EnvironmentSchema, SignalPayload } from './types';

async function main() {
  const env = EnvironmentSchema.parse(process.env);
  const connection = await Connection.connect({ address: env.TEMPORAL_ADDRESS });
  const client = new Client({ connection, namespace: env.TEMPORAL_NAMESPACE });

  const workflowId = process.argv[2];
  const type = process.argv[3] as SignalPayload['type'];
  if (!workflowId || !type) {
    console.error(
      'Usage: ts-node src/send-signal.ts <workflowId> <ACTION1_DONE|ACTION2_DONE|ACTION3_DONE> [jsonData]'
    );
    process.exit(2);
  }
  const data = process.argv[4] ? JSON.parse(process.argv[4]) : undefined;

  const handle = client.workflow.getHandle(workflowId);
  await handle.signal('progress', { type, data });
  console.log(`[coordination] Sent signal ${type} to ${workflowId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
