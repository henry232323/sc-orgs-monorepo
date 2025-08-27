import * as cron from 'node-cron';
import { EventReminderService } from './event_reminder_service';
import { EventSyncService } from './event_sync_service';
import { EventModel } from '../models/event_model';
import logger from '../config/logger';

export class TaskScheduler {
  private eventReminderService: EventReminderService;
  private eventSyncService: EventSyncService;
  private eventModel: EventModel;
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();
  private scheduledTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.eventReminderService = new EventReminderService();
    this.eventSyncService = new EventSyncService();
    this.eventModel = new EventModel();
    this.initializeScheduledTasks();
    this.setupGracefulShutdown();
  }

  private setupGracefulShutdown(): void {
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, stopping scheduled tasks...');
      this.stopAllTasks();
      this.clearAllTimeouts();
      process.exit(0);
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, stopping scheduled tasks...');
      this.stopAllTasks();
      this.clearAllTimeouts();
      process.exit(0);
    });
  }

  private initializeScheduledTasks() {
    // Main cron job: Process due tasks every 30 minutes
    const processTasksJob = cron.schedule(
      '*/30 * * * *',
      async () => {
        try {
          logger.info('Processing due notification tasks...');
          await this.processDueTasks();
          logger.info('Completed processing due tasks');
        } catch (error) {
          logger.error('Error processing due tasks:', error);
        }
      },
      { timezone: 'UTC' }
    );

    // Weekly cleanup task (Sunday at 2 AM)
    const cleanupTask = cron.schedule(
      '0 2 * * 0',
      async () => {
        try {
          logger.info('Running cleanup task...');
          await this.eventReminderService.cleanupOldNotifications();
          logger.info('Completed cleanup task');
        } catch (error) {
          logger.error('Error in cleanup task:', error);
        }
      },
      { timezone: 'UTC' }
    );

    // Discord sync job: Sync pending events every hour
    const discordSyncJob = cron.schedule(
      '0 * * * *',
      async () => {
        try {
          logger.info('Running Discord sync job...');
          await this.eventSyncService.syncAllPendingEvents();
          logger.info('Completed Discord sync job');
        } catch (error) {
          logger.error('Error in Discord sync job:', error);
        }
      },
      { timezone: 'UTC' }
    );

    // Discord retry job: Retry failed events every 6 hours
    const discordRetryJob = cron.schedule(
      '0 */6 * * *',
      async () => {
        try {
          logger.info('Running Discord retry job...');
          await this.eventSyncService.retryFailedEvents();
          logger.info('Completed Discord retry job');
        } catch (error) {
          logger.error('Error in Discord retry job:', error);
        }
      },
      { timezone: 'UTC' }
    );

    // Discord cleanup job: Cleanup cancelled events daily at 3 AM
    const discordCleanupJob = cron.schedule(
      '0 3 * * *',
      async () => {
        try {
          logger.info('Running Discord cleanup job...');
          await this.eventSyncService.cleanupCancelledEvents();
          logger.info('Completed Discord cleanup job');
        } catch (error) {
          logger.error('Error in Discord cleanup job:', error);
        }
      },
      { timezone: 'UTC' }
    );

    this.scheduledTasks.set('process_tasks', processTasksJob);
    this.scheduledTasks.set('cleanup', cleanupTask);
    this.scheduledTasks.set('discord_sync', discordSyncJob);
    this.scheduledTasks.set('discord_retry', discordRetryJob);
    this.scheduledTasks.set('discord_cleanup', discordCleanupJob);

    logger.info('Task scheduler initialized with Discord sync jobs');
  }

  /**
   * Process all tasks due in the next 30 minutes
   * Much simpler approach: just find due tasks and schedule them
   */
  private async processDueTasks(): Promise<void> {
    try {
      const now = new Date();
      const next30Minutes = new Date(now.getTime() + 30 * 60 * 1000);

      // Get all tasks due in the next 30 minutes
      const dueTasks = await this.eventReminderService.getTasksDueBetween(
        now,
        next30Minutes
      );

      logger.info(`Found ${dueTasks.length} tasks due in the next 30 minutes`);

      for (const task of dueTasks) {
        await this.scheduleTaskExecution(task);
      }
    } catch (error) {
      logger.error('Error processing due tasks:', error);
      throw error;
    }
  }

  /**
   * Schedule a task for execution at its exact due time
   */
  private async scheduleTaskExecution(task: any): Promise<void> {
    try {
      const now = new Date();
      const scheduledTime = new Date(task.scheduled_time);
      const delayMs = scheduledTime.getTime() - now.getTime();

      if (delayMs <= 0) {
        // Task is overdue, execute immediately
        await this.executeTask(task);
        return;
      }

      const timeoutKey = `${task.id}`;

      // Check if already scheduled
      if (this.scheduledTimeouts.has(timeoutKey)) {
        logger.debug(`Task ${task.id} already scheduled, skipping`);
        return;
      }

      const timeoutId = setTimeout(async () => {
        try {
          await this.executeTask(task);
          this.scheduledTimeouts.delete(timeoutKey);
        } catch (error) {
          logger.error(`Failed to execute task ${task.id}:`, error);
          await this.eventReminderService.markTaskFailed(task.id);
        }
      }, delayMs);

      this.scheduledTimeouts.set(timeoutKey, timeoutId);
      logger.info(
        `Scheduled task ${task.id} (${task.reminder_type}) for event ${task.event_id} in ${Math.round(delayMs / (1000 * 60))} minutes`
      );
    } catch (error) {
      logger.error(`Error scheduling task execution:`, error);
    }
  }

  /**
   * Execute a notification task
   */
  private async executeTask(task: any): Promise<void> {
    try {
      // Get current event registrations (dynamic list)
      const registrations =
        await this.eventReminderService.getEventRegistrations(task.event_id);
      const userIds = registrations.map(reg => reg.user_id);

      if (userIds.length === 0) {
        logger.info(
          `No registrations for event ${task.event_id}, skipping notification`
        );
        await this.eventReminderService.markTaskCompleted(task.id);
        return;
      }

      // Fetch the full event data
      const event = await this.eventModel.findById(task.event_id);
      if (!event) {
        logger.error(`Event ${task.event_id} not found, skipping notification`);
        await this.eventReminderService.markTaskCompleted(task.id);
        return;
      }

      // Send notifications to all current registrations
      await this.eventReminderService.sendEventReminder(
        event,
        task.reminder_type as '24h' | '2h' | '1h' | 'starting'
      );

      // Mark task as completed
      await this.eventReminderService.markTaskCompleted(task.id);

      logger.info(
        `Executed ${task.reminder_type} reminder for event ${task.event_id}, notified ${userIds.length} users`
      );
    } catch (error) {
      logger.error(`Error executing task ${task.id}:`, error);
      await this.eventReminderService.markTaskFailed(task.id);
      throw error;
    }
  }

  // Start all scheduled tasks
  public startAllTasks(): void {
    this.scheduledTasks.forEach((task, name) => {
      task.start();
      logger.info(`Started scheduled task: ${name}`);
    });
  }

  // Stop all scheduled tasks
  public stopAllTasks(): void {
    this.scheduledTasks.forEach((task, name) => {
      task.stop();
      logger.info(`Stopped scheduled task: ${name}`);
    });
  }

  /**
   * Clear all scheduled timeouts
   */
  private clearAllTimeouts(): void {
    this.scheduledTimeouts.forEach((timeout, key) => {
      clearTimeout(timeout);
      logger.info(`Cleared timeout: ${key}`);
    });
    this.scheduledTimeouts.clear();
  }

  /**
   * Clear timeouts for a specific event
   */
  public clearEventTimeouts(eventId: string): void {
    const keysToDelete: string[] = [];

    this.scheduledTimeouts.forEach((timeout, key) => {
      if (key.includes(eventId)) {
        clearTimeout(timeout);
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.scheduledTimeouts.delete(key);
      logger.info(`Cleared timeout: ${key}`);
    });
  }

  // Get task status
  public getTaskStatus(
    taskName: string
  ): { scheduled: boolean; taskType: string } | null {
    const task = this.scheduledTasks.get(taskName);
    if (!task) return null;

    return {
      scheduled: true,
      taskType: 'cron',
    };
  }

  // Get all task statuses
  public getAllTaskStatuses(): Record<
    string,
    { scheduled: boolean; taskType: string }
  > {
    const statuses: Record<string, { scheduled: boolean; taskType: string }> =
      {};

    this.scheduledTasks.forEach((task, name) => {
      statuses[name] = {
        scheduled: true,
        taskType: 'cron',
      };
    });

    this.scheduledTimeouts.forEach((timeout, key) => {
      statuses[`timeout_${key}`] = {
        scheduled: true,
        taskType: 'timeout',
      };
    });

    return statuses;
  }

  /**
   * Schedule specific tasks immediately (for events created that start soon)
   */
  public async scheduleTasksImmediately(tasks: any[]): Promise<void> {
    try {
      logger.info(`Scheduling ${tasks.length} tasks immediately`);
      for (const task of tasks) {
        await this.scheduleTaskExecution(task);
      }
    } catch (error) {
      logger.error('Error scheduling tasks immediately:', error);
      throw error;
    }
  }

  // Manual task execution (for testing)
  public async runTask(taskName: string): Promise<boolean> {
    try {
      switch (taskName) {
        case 'process_tasks':
          await this.processDueTasks();
          break;
        case 'cleanup':
          await this.eventReminderService.cleanupOldNotifications();
          break;
        default:
          logger.warn(`Unknown task: ${taskName}`);
          return false;
      }
      logger.info(`Manually executed task: ${taskName}`);
      return true;
    } catch (error) {
      logger.error(`Error manually executing task ${taskName}:`, error);
      return false;
    }
  }
}
