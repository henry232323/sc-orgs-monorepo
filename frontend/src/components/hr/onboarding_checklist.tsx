import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Paper from '../ui/Paper';
import Checkbox from '../ui/Checkbox';
import Chip from '../ui/Chip';
import Button from '../ui/Button';
import { ComponentTitle, ComponentSubtitle } from '../ui/Typography';
import {
  useGetOnboardingProgressQuery,
  useUpdateOnboardingProgressMutation,
  useCompleteOnboardingTaskMutation,
} from '../../services/apiSlice';
import type { OnboardingProgress, OnboardingTask } from '../../types/hr';

interface OnboardingChecklistProps {
  userId?: string;
  onProgressUpdate?: (progress: OnboardingProgress) => void;
}

const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({
  userId,
  onProgressUpdate,
}) => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [localCompletedTasks, setLocalCompletedTasks] = useState<string[]>([]);

  const {
    data: onboardingProgress,
    isLoading,
    error,
    refetch,
  } = useGetOnboardingProgressQuery(
    { organizationId: organizationId!, userId: userId! },
    { skip: !organizationId || !userId }
  );

  const [updateProgress, { isLoading: isUpdating }] = useUpdateOnboardingProgressMutation();
  const [completeTask, { isLoading: isCompletingTask }] = useCompleteOnboardingTaskMutation();

  // Sync local state with server data
  useEffect(() => {
    if (onboardingProgress?.completed_tasks) {
      setLocalCompletedTasks(onboardingProgress.completed_tasks);
    }
  }, [onboardingProgress]);

  // Notify parent of progress updates
  useEffect(() => {
    if (onboardingProgress && onProgressUpdate) {
      onProgressUpdate(onboardingProgress);
    }
  }, [onboardingProgress, onProgressUpdate]);

  const handleTaskToggle = async (taskId: string, completed: boolean) => {
    if (!organizationId || !userId) return;

    try {
      // Optimistically update local state
      const newCompletedTasks = completed
        ? [...localCompletedTasks, taskId]
        : localCompletedTasks.filter(id => id !== taskId);
      
      setLocalCompletedTasks(newCompletedTasks);

      if (completed) {
        // Complete individual task
        await completeTask({
          organizationId,
          taskId,
          userId,
        }).unwrap();
      } else {
        // Update progress to remove task
        await updateProgress({
          organizationId,
          userId,
          data: { completed_tasks: newCompletedTasks },
        }).unwrap();
      }

      // Refetch to get updated progress
      refetch();
    } catch (error) {
      // Revert optimistic update on error
      setLocalCompletedTasks(onboardingProgress?.completed_tasks || []);
      console.error('Failed to update task completion:', error);
    }
  };

  const getStatusChip = (status: OnboardingProgress['status']) => {
    const statusConfig = {
      not_started: { variant: 'default' as const, text: 'Not Started', color: 'text-muted' },
      in_progress: { variant: 'interactive' as const, text: 'In Progress', color: 'text-warning' },
      completed: { variant: 'status' as const, text: 'Completed', color: 'text-success' },
      overdue: { variant: 'default' as const, text: 'Overdue', color: 'text-error' },
    };

    const config = statusConfig[status];
    return (
      <Chip variant={config.variant} size="sm" className={config.color}>
        {config.text}
      </Chip>
    );
  };

  const calculateProgress = () => {
    if (!onboardingProgress?.template?.tasks) return 0;
    const totalTasks = onboardingProgress.template.tasks.length;
    const completedCount = localCompletedTasks.length;
    return totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  };

  const getEstimatedTimeRemaining = () => {
    if (!onboardingProgress?.template?.tasks) return 0;
    
    const incompleteTasks = onboardingProgress.template.tasks.filter(
      task => !localCompletedTasks.includes(task.id)
    );
    
    return incompleteTasks.reduce((total, task) => total + task.estimated_hours, 0);
  };

  if (isLoading) {
    return (
      <Paper variant="glass-subtle" className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-glass rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-4 bg-glass rounded"></div>
            ))}
          </div>
        </div>
      </Paper>
    );
  }

  if (error || !onboardingProgress) {
    return (
      <Paper variant="glass-subtle" className="p-6">
        <div className="text-center">
          <p className="text-error mb-4">
            {error ? 'Failed to load onboarding checklist' : 'No onboarding progress found'}
          </p>
          <Button variant="secondary" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </Paper>
    );
  }

  const progress = calculateProgress();
  const estimatedHours = getEstimatedTimeRemaining();

  return (
    <div className="space-y-[var(--spacing-section)]">
      {/* Header */}
      <Paper variant="glass" className="p-[var(--spacing-card-lg)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <ComponentTitle className="mb-2">
              Onboarding Checklist
            </ComponentTitle>
            <ComponentSubtitle>
              Role: {onboardingProgress.template?.role_name || 'General Member'}
            </ComponentSubtitle>
          </div>
          <div className="flex items-center gap-4">
            {getStatusChip(onboardingProgress.status)}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-secondary">Progress</span>
            <span className="text-sm font-bold text-primary">{progress}%</span>
          </div>
          <div className="w-full bg-glass rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-secondary to-brand-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-2 text-xs text-tertiary">
            <span>
              {localCompletedTasks.length} of {onboardingProgress.template?.tasks?.length || 0} tasks completed
            </span>
            {estimatedHours > 0 && (
              <span>
                ~{estimatedHours}h remaining
              </span>
            )}
          </div>
        </div>
      </Paper>

      {/* Task List */}
      <Paper variant="glass-subtle" className="p-[var(--spacing-card-lg)]">
        <ComponentTitle className="mb-4">Tasks</ComponentTitle>
        
        {onboardingProgress.template?.tasks?.length ? (
          <div className="space-y-4">
            {onboardingProgress.template.tasks
              .sort((a, b) => a.order_index - b.order_index)
              .map((task: OnboardingTask) => {
                const isCompleted = localCompletedTasks.includes(task.id);
                const isDisabled = isUpdating || isCompletingTask;

                return (
                  <Paper
                    key={task.id}
                    variant="glass"
                    className={`p-4 transition-all duration-200 ${
                      isCompleted ? 'opacity-75' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 pt-1">
                        <Checkbox
                          checked={isCompleted}
                          onChange={(checked) => handleTaskToggle(task.id, checked)}
                          disabled={isDisabled}
                          size="md"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className={`font-semibold ${
                              isCompleted ? 'text-secondary line-through' : 'text-primary'
                            }`}>
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className={`mt-1 text-sm ${
                                isCompleted ? 'text-muted' : 'text-secondary'
                              }`}>
                                {task.description}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {task.required && (
                              <Chip variant="default" size="sm" className="text-warning">
                                Required
                              </Chip>
                            )}
                            {task.estimated_hours > 0 && (
                              <Chip variant="default" size="sm" className="text-muted">
                                {task.estimated_hours}h
                              </Chip>
                            )}
                            {isCompleted && (
                              <Chip variant="status" size="sm">
                                ✓ Done
                              </Chip>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Paper>
                );
              })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-secondary">No onboarding tasks available</p>
          </div>
        )}
      </Paper>

      {/* Completion Status */}
      {progress === 100 && onboardingProgress.status === 'completed' && (
        <Paper variant="glass-elevated" className="p-[var(--spacing-card-lg)] border-success/20">
          <div className="text-center">
            <div className="text-4xl mb-4">🎉</div>
            <ComponentTitle className="text-success mb-2">
              Onboarding Complete!
            </ComponentTitle>
            <ComponentSubtitle>
              Congratulations! You have successfully completed your onboarding process.
              {onboardingProgress.completed_at && (
                <span className="block mt-2">
                  Completed on {new Date(onboardingProgress.completed_at).toLocaleDateString()}
                </span>
              )}
            </ComponentSubtitle>
          </div>
        </Paper>
      )}
    </div>
  );
};

export default OnboardingChecklist;