import React from 'react';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface ExportProgressIndicatorProps {
  format: string;
  progress: number;
  status: string;
  className?: string;
}

export const ExportProgressIndicator: React.FC<ExportProgressIndicatorProps> = ({
  format,
  progress,
  status,
  className = '',
}) => {
  const isComplete = progress === 100;
  const isError = status.toLowerCase().includes('failed') || status.toLowerCase().includes('error');

  return (
    <div className={`absolute top-full left-0 right-0 mt-2 z-20 ${className}`}>
      <div className="bg-dark-glass rounded-[var(--radius-glass-sm)] shadow-[var(--shadow-glass-lg)] border border-glass-border backdrop-blur-[var(--blur-glass-strong)] p-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {isComplete ? (
              <CheckCircleIcon className="h-6 w-6 text-success" />
            ) : isError ? (
              <ExclamationCircleIcon className="h-6 w-6 text-error" />
            ) : (
              <div className="h-6 w-6 border-2 border-[var(--color-accent-blue)] border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-primary">
                Exporting {format}
              </p>
              <span className="text-sm text-tertiary">
                {progress}%
              </span>
            </div>
            
            <div className="w-full bg-white/10 rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  isError 
                    ? 'bg-error' 
                    : isComplete 
                    ? 'bg-success' 
                    : 'bg-[var(--color-accent-blue)]'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <p className={`text-xs ${
              isError ? 'text-error' : isComplete ? 'text-success' : 'text-secondary'
            }`}>
              {status}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};