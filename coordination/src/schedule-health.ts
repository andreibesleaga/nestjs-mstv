import 'dotenv/config';
import { Client, Connection, ScheduleOverlapPolicy } from '@temporalio/client';
import { EnvironmentSchema } from './types';

async function main() {
  const env = EnvironmentSchema.parse(process.env);
  const connection = await Connection.connect({ address: env.TEMPORAL_ADDRESS });
  const client = new Client({ connection, namespace: env.TEMPORAL_NAMESPACE });

  const scheduleId = process.env.HEALTH_SCHEDULE_ID || 'nightly-health-check';
  const cron = env.HEALTHCHECK_CRON; // e.g., 0 2 * * *

  console.log(`[coordination] Creating schedule ${scheduleId} with cron "${cron}"`);

  await client.schedule.create({
    scheduleId,
    spec: { cronExpressions: [cron] },
    policies: {
      overlap: ScheduleOverlapPolicy.BUFFER_ONE,
    },
    action: {
      type: 'startWorkflow',
      workflowType: 'nightlyHealthCheck',
      taskQueue: env.TEMPORAL_TASK_QUEUE,
      args: [{ url: env.HEALTHCHECK_URL, jobId: `health-${Date.now()}` }],
      workflowId: `health-${Date.now()}`,
    },
  });

  console.log(`[coordination] Schedule ${scheduleId} created.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
