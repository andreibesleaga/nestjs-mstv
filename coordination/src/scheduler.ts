import 'dotenv/config';
import { Client, Connection, ScheduleOverlapPolicy } from '@temporalio/client';
import { EnvironmentSchema } from './types';

async function main() {
  const env = EnvironmentSchema.parse(process.env);
  const connection = await Connection.connect({ address: env.TEMPORAL_ADDRESS });
  const client = new Client({ connection, namespace: env.TEMPORAL_NAMESPACE });

  const scheduleId = process.env.SCHEDULE_ID || 'hybrid-hourly';
  const cron = process.env.SCHEDULE_CRON || '0 * * * *';

  console.log(`[coordination] Creating schedule ${scheduleId} with cron "${cron}"`);

  // You can pass arbitrary payload in args; here we pass jobId
  await client.schedule.create({
    scheduleId,
    spec: { cronExpressions: [cron] },
    policies: {
      overlap: ScheduleOverlapPolicy.BUFFER_ONE,
    },
    action: {
      type: 'startWorkflow',
      workflowType: 'hybridWorkflow',
      taskQueue: env.TEMPORAL_TASK_QUEUE,
      args: [{ jobId: `cron-${Date.now()}` }],
    },
  });

  console.log(`[coordination] Schedule ${scheduleId} created.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
