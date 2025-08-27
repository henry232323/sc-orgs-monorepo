import React from 'react';
import { NotificationWithDetails } from '../../types/notification';
import NotificationItem from './NotificationItem';
import Button from '../ui/Button';

interface NotificationListProps {
  notifications: NotificationWithDetails[];
  onMarkAsRead: (notificationId: string) => void;
  onDelete: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  onMarkAsRead,
  onDelete,
  onMarkAllAsRead,
  loading = false,
  hasMore = false,
  onLoadMore,
}) => {
  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading && notifications.length === 0) {
    return (
      <div className='space-y-[var(--spacing-element)]'>
        {[...Array(3)].map((_, i) => (
          <div key={i} className='glass-card-lg animate-pulse'>
            <div className='flex items-start space-x-3'>
              <div className='w-5 h-5 bg-glass-elevated rounded-full'></div>
              <div className='flex-1 space-y-2'>
                <div className='h-4 bg-glass-elevated rounded w-3/4'></div>
                <div className='h-3 bg-glass-elevated rounded w-1/2'></div>
                <div className='h-3 bg-glass-elevated rounded w-1/4'></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className='text-center py-12'>
        <div className='w-16 h-16 bg-glass-elevated rounded-full mx-auto mb-4 flex items-center justify-center'>
          <span className='text-2xl'>🔔</span>
        </div>
        <h3 className='text-lg font-medium text-primary mb-2'>
          No notifications yet
        </h3>
        <p className='text-tertiary'>
          You're all caught up! New notifications will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* Header with actions */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-2'>
          <h3 className='text-lg font-medium text-primary'>Notifications</h3>
          {unreadCount > 0 && (
            <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-info text-info'>
              {unreadCount} unread
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <Button
            variant='glass'
            size='sm'
            onClick={onMarkAllAsRead}
            className='text-sm'
          >
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notifications */}
      <div className='space-y-3'>
        {notifications.map(notification => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkAsRead={onMarkAsRead}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Load more button */}
      {hasMore && onLoadMore && (
        <div className='text-center pt-4'>
          <Button
            variant='outline'
            onClick={onLoadMore}
            disabled={loading}
            className='w-full'
          >
            {loading ? 'Loading...' : 'Load More Notifications'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default NotificationList;
