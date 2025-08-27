import React from 'react';
import Dialog from './Dialog';
import Button from './Button';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-red-500/20',
          iconColor: 'text-red-400',
          confirmVariant: 'danger' as const,
        };
      case 'warning':
        return {
          iconBg: 'bg-yellow-500/20',
          iconColor: 'text-yellow-400',
          confirmVariant: 'secondary' as const,
        };
      case 'info':
        return {
          iconBg: 'bg-blue-500/20',
          iconColor: 'text-blue-400',
          confirmVariant: 'primary' as const,
        };
      default:
        return {
          iconBg: 'bg-red-500/20',
          iconColor: 'text-red-400',
          confirmVariant: 'danger' as const,
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title} size='md'>
      <div className='text-center'>
        <div
          className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${styles.iconBg} mb-4`}
        >
          <ExclamationTriangleIcon className={`h-6 w-6 ${styles.iconColor}`} />
        </div>
        <p className='text-white/70 mb-6'>{message}</p>
        <div className='flex space-x-3'>
          <Button
            variant='outline'
            onClick={onClose}
            className='flex-1'
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={styles.confirmVariant}
            onClick={onConfirm}
            className='flex-1'
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : confirmText}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default ConfirmationDialog;
