import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Paper from './Paper';
import { getErrorMessage, hasValidationErrors } from '../../utils/errorHandling';

interface ErrorDisplayProps {
  error: any;
  title?: string;
  className?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  title = 'Error',
  className = '',
}) => {
  if (!error) return null;

  const errorMessage = getErrorMessage(error);
  const isValidationError = hasValidationErrors(error);

  return (
    <Paper
      variant='glass'
      size='lg'
      className={`border-red-500/20 bg-red-500/10 ${className}`}
    >
      <div className='flex items-center space-x-3 text-red-400'>
        <ExclamationTriangleIcon className='w-5 h-5 flex-shrink-0' />
        <div className='flex-1'>
          <p className='font-semibold'>{title}</p>
          {isValidationError ? (
            <div className='text-sm text-red-400/80'>
              <p className='mb-2'>Please fix the following validation errors:</p>
              <ul className='list-disc list-inside space-y-1'>
                {error.data.details.map((detail: any, index: number) => (
                  <li key={index}>
                    <span className='font-medium capitalize'>{detail.field}:</span> {detail.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className='text-sm text-red-400/80'>{errorMessage}</p>
          )}
        </div>
      </div>
    </Paper>
  );
};
