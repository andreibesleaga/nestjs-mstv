import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CronJob } from 'cron';
import { CronJobConfig, SchedulerStatus } from '../types';

interface JobWrapper {
  cronJob: CronJob;
  isRunning: boolean;
}

@Injectable()
export class SchedulerManager {
  private readonly logger = new Logger(SchedulerManager.name);
  private jobs: Map<string, JobWrapper> = new Map();
  private isEnabled = false;
  private executionStats: Map<string, {
    runs: number;
    lastRun?: Date;
    lastError?: string;
    averageExecutionTime: number;
  }> = new Map();

  constructor(private readonly configService: ConfigService) {}

  async initialize(): Promise<void> {
    this.isEnabled = this.configService.get<boolean>('ENABLE_SCHEDULER', true);
    
    if (!this.isEnabled) {
      this.logger.log('Scheduler is disabled by configuration');
      return;
    }

    // Initialize default jobs
    this.initializeDefaultJobs();
    
    this.logger.log('Scheduler initialized');
  }

  async destroy(): Promise<void> {
    this.jobs.forEach((jobWrapper, name) => {
      jobWrapper.cronJob.stop();
      this.logger.debug(`Stopped job: ${name}`);
    });
    
    this.jobs.clear();
    this.executionStats.clear();
    this.logger.log('Scheduler manager destroyed');
  }

  addJob(
    name: string,
    cronPattern: string,
    task: () => Promise<void> | void,
    options: {
      timezone?: string;
      startNow?: boolean;
      maxRetries?: number;
    } = {}
  ): void {
    if (!this.isEnabled) {
      this.logger.warn('Scheduler is disabled - job not added');
      return;
    }

    if (this.jobs.has(name)) {
      this.logger.warn(`Job ${name} already exists - removing old one`);
      this.removeJob(name);
    }

    const wrappedTask = this.wrapTask(name, task, options.maxRetries || 3);
    
    const job = new CronJob(
      cronPattern,
      wrappedTask,
      null,
      options.startNow || false,
      options.timezone || 'UTC'
    );

    this.jobs.set(name, {
      cronJob: job,
      isRunning: false,
    });
    this.executionStats.set(name, {
      runs: 0,
      averageExecutionTime: 0,
    });

    this.logger.log(`Added job: ${name} with pattern: ${cronPattern}`);
  }

  addJobFromConfig(config: CronJobConfig): void {
    this.addJob(
      config.name,
      config.cronPattern,
      config.task,
      {
        timezone: config.timezone,
        startNow: config.startNow,
        maxRetries: config.maxRetries,
      }
    );
  }

  removeJob(name: string): boolean {
    const jobWrapper = this.jobs.get(name);
    if (jobWrapper) {
      jobWrapper.cronJob.stop();
      this.jobs.delete(name);
      this.executionStats.delete(name);
      this.logger.log(`Removed job: ${name}`);
      return true;
    }
    
    this.logger.warn(`Job ${name} not found`);
    return false;
  }

  startJob(name: string): boolean {
    const jobWrapper = this.jobs.get(name);
    if (jobWrapper) {
      jobWrapper.cronJob.start();
      jobWrapper.isRunning = true;
      this.logger.log(`Started job: ${name}`);
      return true;
    }
    
    this.logger.warn(`Job ${name} not found`);
    return false;
  }

  stopJob(name: string): boolean {
    const jobWrapper = this.jobs.get(name);
    if (jobWrapper) {
      jobWrapper.cronJob.stop();
      jobWrapper.isRunning = false;
      this.logger.log(`Stopped job: ${name}`);
      return true;
    }
    
    this.logger.warn(`Job ${name} not found`);
    return false;
  }

  runJobNow(name: string): void {
    const jobWrapper = this.jobs.get(name);
    if (jobWrapper) {
      // Trigger the job manually
      (jobWrapper.cronJob as any).fireOnTick();
      this.logger.log(`Manually triggered job: ${name}`);
    } else {
      this.logger.warn(`Job ${name} not found`);
    }
  }

  getJobStatus(name: string): SchedulerStatus | null {
    const jobWrapper = this.jobs.get(name);
    const stats = this.executionStats.get(name);
    
    if (!jobWrapper || !stats) {
      return null;
    }

    return {
      name,
      running: jobWrapper.isRunning,
      nextDate: jobWrapper.cronJob.nextDate()?.toJSDate(),
      lastDate: jobWrapper.cronJob.lastDate(),
      executionCount: stats.runs,
      lastRun: stats.lastRun,
      lastError: stats.lastError,
      averageExecutionTime: stats.averageExecutionTime,
    };
  }

  getAllJobStatuses(): SchedulerStatus[] {
    const statuses: SchedulerStatus[] = [];
    
    this.jobs.forEach((_, name) => {
      const status = this.getJobStatus(name);
      if (status) {
        statuses.push(status);
      }
    });
    
    return statuses;
  }

  getJobNames(): string[] {
    return Array.from(this.jobs.keys());
  }

  isJobRunning(name: string): boolean {
    const jobWrapper = this.jobs.get(name);
    return jobWrapper ? jobWrapper.isRunning : false;
  }

  getMetrics(): {
    enabled: boolean;
    totalJobs: number;
    runningJobs: number;
    totalExecutions: number;
    jobs: Array<{
      name: string;
      running: boolean;
      executions: number;
      lastRun?: Date;
      nextRun?: Date;
    }>;
  } {
    const jobs = Array.from(this.jobs.entries()).map(([name, jobWrapper]) => {
      const stats = this.executionStats.get(name);
      return {
        name,
        running: jobWrapper.isRunning,
        executions: stats?.runs || 0,
        lastRun: stats?.lastRun,
        nextRun: jobWrapper.cronJob.nextDate()?.toJSDate(),
      };
    });

    return {
      enabled: this.isEnabled,
      totalJobs: this.jobs.size,
      runningJobs: jobs.filter(job => job.running).length,
      totalExecutions: Array.from(this.executionStats.values())
        .reduce((sum, stats) => sum + stats.runs, 0),
      jobs,
    };
  }

  private wrapTask(
    name: string,
    task: () => Promise<void> | void,
    maxRetries: number
  ): () => Promise<void> {
    return async () => {
      const startTime = Date.now();
      let retries = 0;
      
      while (retries <= maxRetries) {
        try {
          await task();
          
          // Update stats on success
          this.updateExecutionStats(name, Date.now() - startTime);
          this.logger.debug(`Job ${name} completed successfully`);
          return;
          
        } catch (error) {
          retries++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          this.logger.error(
            `Job ${name} failed (attempt ${retries}/${maxRetries + 1}): ${errorMessage}`
          );
          
          if (retries > maxRetries) {
            this.updateExecutionStats(name, Date.now() - startTime, errorMessage);
            throw error;
          }
          
          // Wait before retry (exponential backoff)
          await this.delay(Math.pow(2, retries) * 1000);
        }
      }
    };
  }

  private updateExecutionStats(name: string, executionTime: number, error?: string): void {
    const stats = this.executionStats.get(name);
    if (stats) {
      const newRuns = stats.runs + 1;
      const newAverage = (stats.averageExecutionTime * stats.runs + executionTime) / newRuns;
      
      this.executionStats.set(name, {
        runs: newRuns,
        lastRun: new Date(),
        lastError: error,
        averageExecutionTime: Math.round(newAverage),
      });
    }
  }

  private initializeDefaultJobs(): void {
    // Health check job
    this.addJob(
      'health-check',
      '*/5 * * * *', // Every 5 minutes
      async () => {
        this.logger.debug('Running health check');
        // Implement health check logic here
      },
      { startNow: true }
    );

    // Cleanup job
    this.addJob(
      'cleanup',
      '0 2 * * *', // Daily at 2 AM
      async () => {
        this.logger.debug('Running cleanup tasks');
        // Implement cleanup logic here
      }
    );

    // Metrics collection
    this.addJob(
      'metrics-collection',
      '*/10 * * * *', // Every 10 minutes
      async () => {
        this.logger.debug('Collecting metrics');
        // Implement metrics collection here
      },
      { startNow: true }
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
