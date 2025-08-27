import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useDeleteNotificationMutation } from '../../services/apiSlice';

interface NotificationDeleteButtonProps {
  notificationId: string;
  onDelete?: () => void;
}

const NotificationDeleteButton: React.FC<NotificationDeleteButtonProps> = ({
  notificationId,
  onDelete,
}) => {
  const [deleteNotification, { isLoading }] = useDeleteNotificationMutation();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await deleteNotification(notificationId).unwrap();
      onDelete?.();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isLoading}
      className='flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors duration-150 text-white/60 hover:text-white/90'
      title='Delete notification'
    >
      <XMarkIcon className='w-4 h-4' />
    </button>
  );
};

export default NotificationDeleteButton;
