import logger from '../config/logger';

export interface RateLimitInfo {
  retryAfter: number; // seconds
  global: boolean;
  bucket?: string;
  scope?: string;
}

export interface RetryableTask {
  id: string;
  task: () => Promise<any>;
  retryCount: number;
  maxRetries: number;
  scheduledFor: Date;
}

export class RateLimitService {
  private retryQueue: Map<string, RetryableTask> = new Map();
  private isProcessing = false;

  /**
   * Extract rate limit information from Discord API response
   */
  extractRateLimitInfo(error: any): RateLimitInfo | null {
    if (!error.response || error.response.status !== 429) {
      return null;
    }

    const headers = error.response.headers;
    const body = error.response.data;

    return {
      retryAfter: parseFloat(headers['retry-after'] || body?.retry_after || '1'),
      global: body?.global || false,
      bucket: headers['x-ratelimit-bucket'],
      scope: headers['x-ratelimit-scope'],
    };
  }

  /**
   * Schedule a task for retry after rate limit
   */
  async scheduleRetry(
    taskId: string,
    task: () => Promise<any>,
    rateLimitInfo: RateLimitInfo,
    maxRetries: number = 3
  ): Promise<void> {
    const retryAfterMs = rateLimitInfo.retryAfter * 1000;
    const scheduledFor = new Date(Date.now() + retryAfterMs);

    const retryTask: RetryableTask = {
      id: taskId,
      task,
      retryCount: 0,
      maxRetries,
      scheduledFor,
    };

    this.retryQueue.set(taskId, retryTask);
    
    logger.info(`Rate limited task ${taskId} scheduled for retry in ${rateLimitInfo.retryAfter}s`, {
      taskId,
      retryAfter: rateLimitInfo.retryAfter,
      scheduledFor: scheduledFor.toISOString(),
      global: rateLimitInfo.global,
    });

    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing();
    }
  }

  /**
   * Start processing the retry queue
   */
  private async startProcessing(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    logger.debug('Starting rate limit retry queue processing');

    while (this.retryQueue.size > 0) {
      const now = new Date();
      const readyTasks: RetryableTask[] = [];

      // Find tasks ready to retry
      for (const task of this.retryQueue.values()) {
        if (task.scheduledFor <= now) {
          readyTasks.push(task);
        }
      }

      // Execute ready tasks
      for (const task of readyTasks) {
        await this.executeRetryTask(task);
      }

      // Wait a bit before checking again
      if (this.retryQueue.size > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.isProcessing = false;
    logger.debug('Rate limit retry queue processing completed');
  }

  /**
   * Execute a retry task
   */
  private async executeRetryTask(task: RetryableTask): Promise<void> {
    try {
      logger.info(`Retrying task ${task.id} (attempt ${task.retryCount + 1}/${task.maxRetries})`);
      
      const result = await task.task();
      
      // Success - remove from queue
      this.retryQueue.delete(task.id);
      logger.info(`Task ${task.id} completed successfully after ${task.retryCount} retries`);
      
    } catch (error: any) {
      task.retryCount++;
      
      if (task.retryCount >= task.maxRetries) {
        // Max retries reached - remove from queue
        this.retryQueue.delete(task.id);
        logger.error(`Task ${task.id} failed after ${task.maxRetries} retries`, error);
        return;
      }

      // Check if it's another rate limit error
      const rateLimitInfo = this.extractRateLimitInfo(error);
      if (rateLimitInfo) {
        // Schedule another retry
        const retryAfterMs = rateLimitInfo.retryAfter * 1000;
        task.scheduledFor = new Date(Date.now() + retryAfterMs);
        
        logger.warn(`Task ${task.id} hit rate limit again, rescheduling for ${rateLimitInfo.retryAfter}s`, {
          retryCount: task.retryCount,
          retryAfter: rateLimitInfo.retryAfter,
        });
      } else {
        // Non-rate-limit error - remove from queue
        this.retryQueue.delete(task.id);
        logger.error(`Task ${task.id} failed with non-rate-limit error`, error);
      }
    }
  }

  /**
   * Get current queue status
   */
  getQueueStatus(): { count: number; tasks: Array<{ id: string; scheduledFor: string; retryCount: number }> } {
    const tasks = Array.from(this.retryQueue.values()).map(task => ({
      id: task.id,
      scheduledFor: task.scheduledFor.toISOString(),
      retryCount: task.retryCount,
    }));

    return {
      count: this.retryQueue.size,
      tasks,
    };
  }
}

// Singleton instance
export const rateLimitService = new RateLimitService();