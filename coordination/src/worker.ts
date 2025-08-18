import 'dotenv/config';
import { Worker, NativeConnection } from '@temporalio/worker';
import { EnvironmentSchema } from './types';
import * as activities from './activities';

async function run() {
  const env = EnvironmentSchema.parse(process.env);

  const connection = await NativeConnection.connect({ address: env.TEMPORAL_ADDRESS });

  const worker = await Worker.create({
    connection,
    namespace: env.TEMPORAL_NAMESPACE,
    workflowsPath: require.resolve('./workflows'),
    activities,
    taskQueue: env.TEMPORAL_TASK_QUEUE,
  });

  console.log(
    `[coordination] Worker started on ${env.TEMPORAL_ADDRESS} in namespace ${env.TEMPORAL_NAMESPACE}, task queue ${env.TEMPORAL_TASK_QUEUE}`
  );
  await worker.run();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
