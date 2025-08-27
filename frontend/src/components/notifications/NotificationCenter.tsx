import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  useGetCurrentUserQuery,
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useBulkMarkAllAsReadMutation,
  useBulkDeleteAllNotificationsMutation,
} from '../../services/apiSlice';
import { Button } from '../ui';
import { BellIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/outline';
import { NotificationRouter } from '../../utils/notification_router';
import NotificationDeleteButton from './NotificationDeleteButton';
import { formatDistanceToNow } from 'date-fns';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement>;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  buttonRef,
}) => {
  const { isAuthenticated } = useAuth();
  const { isLoading: userLoading } = useGetCurrentUserQuery(undefined, {
    skip: !isAuthenticated,
  });

  // State for pagination (must be declared before the query)
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);

  // Fetch notifications from API with 2-minute polling
  const { data: notificationsData, isLoading: notificationsLoading } =
    useGetNotificationsQuery(
      { page: page + 1, limit: pageSize }, // Convert 0-based page to 1-based for API
      {
        skip: !isAuthenticated,
        pollingInterval: 120000, // Poll every 2 minutes
        refetchOnFocus: true,
        refetchOnReconnect: true,
      }
    );

  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [bulkMarkAllAsRead] = useBulkMarkAllAsReadMutation();
  const [bulkDeleteAll] = useBulkDeleteAllNotificationsMutation();

  // State for dropdown position
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  // Handle notification click (mark as read and navigate)
  const handleNotificationClick = async (notificationId: string) => {
    try {
      if (notifications.find(n => n.id === notificationId && !n.is_read)) {
        await markAsRead(notificationId);
      }
      onClose(); // Close the dropdown
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await bulkMarkAllAsRead().unwrap();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // Handle delete all notifications
  const handleDeleteAll = async () => {
    if (
      window.confirm(
        'Are you sure you want to delete all notifications? This action cannot be undone.'
      )
    ) {
      try {
        await bulkDeleteAll().unwrap();
      } catch (error) {
        console.error('Failed to delete all notifications:', error);
      }
    }
  };

  // Ref for the notification center
  const notificationRef = useRef<HTMLDivElement>(null);

  // Calculate dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef?.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left + rect.width / 2 - 160, // Center the dropdown (320px width / 2 = 160px)
        width: 320,
      });
    }
  }, [isOpen, buttonRef]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Show loading state for user
  if (userLoading || notificationsLoading) {
    return (
      <div className='flex items-center justify-center py-8'>
        <div className='animate-spin rounded-full h-8 w-8 border-2 border-glass border-t-[var(--color-accent-blue)]'></div>
      </div>
    );
  }

  if (!isOpen) {
    return null;
  }

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unread_count || 0;

  return createPortal(
    <div
      ref={notificationRef}
      data-notification-dropdown
      className='fixed bg-dark-glass border border-glass-border rounded-[var(--radius-dropdown)] shadow-[var(--shadow-glass-lg)] backdrop-blur-[var(--blur-glass-strong)] z-50'
      style={{
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
      }}
    >
      <div className='p-[var(--spacing-element)] border-b border-white/10'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-2'>
            <h3 className='text-lg font-semibold text-primary'>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-error text-primary'>
                {unreadCount}
              </span>
            )}
          </div>
          <div className='flex items-center space-x-2'>
            {notifications.length > 0 && (
              <>
                <button
                  onClick={handleMarkAllAsRead}
                  className='p-1 rounded-full hover:bg-white/20 transition-colors duration-150 text-white/60 hover:text-white/90'
                  title='Mark all as read'
                >
                  <CheckIcon className='w-4 h-4' />
                </button>
                <button
                  onClick={handleDeleteAll}
                  className='p-1 rounded-full hover:bg-white/20 transition-colors duration-150 text-white/60 hover:text-white/90'
                  title='Delete all notifications'
                >
                  <TrashIcon className='w-4 h-4' />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className='text-tertiary hover:text-primary transition-colors duration-[var(--duration-normal)] p-1 rounded-[var(--radius-glass-sm)] hover:bg-glass-hover'
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <div className='max-h-96 overflow-y-auto'>
        {notifications.length > 0 ? (
          notifications.map(notification => {
            const entityType = notification.notification_object.entity_type;
            const entityId = notification.notification_object.entity_id;
            const notificationRoute = NotificationRouter.getNotificationRoute(
              entityType,
              entityId
            );
            // const display = NotificationRouter.getNotificationDisplay(entityType);

            const NotificationContent = (
              <div className='flex items-start space-x-3'>
                <div className='flex-shrink-0'>
                  <BellIcon className='w-5 h-5 text-tertiary' />
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-medium text-primary'>
                    {notification.notification_object.title ||
                      notification.title ||
                      'Notification'}
                  </p>
                  <p className='text-sm text-secondary mt-1'>
                    {notification.notification_object.message ||
                      notification.message ||
                      'You have a new notification'}
                  </p>
                  <p className='text-xs text-tertiary mt-2'>
                    {formatDistanceToNow(new Date(notification.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <div className='flex-shrink-0'>
                  <NotificationDeleteButton notificationId={notification.id} />
                </div>
              </div>
            );

            return (
              <div
                key={notification.id}
                className={`p-[var(--spacing-element)] hover:bg-white/20 hover:backdrop-blur-sm transition-all duration-150 [text-shadow:0_1px_2px_rgba(0,0,0,0.8)] border-b border-white/10 last:border-b-0 ${
                  !notification.is_read
                    ? 'bg-white/10 border-l-4 border-l-brand-primary'
                    : 'opacity-70'
                }`}
              >
                {notificationRoute ? (
                  <Link
                    to={notificationRoute.path}
                    className='block'
                    onClick={() => handleNotificationClick(notification.id)}
                    target={
                      notificationRoute.shouldOpenInNewTab ? '_blank' : '_self'
                    }
                    rel={
                      notificationRoute.shouldOpenInNewTab
                        ? 'noopener noreferrer'
                        : undefined
                    }
                  >
                    {NotificationContent}
                  </Link>
                ) : (
                  <div onClick={() => handleNotificationClick(notification.id)}>
                    {NotificationContent}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className='p-[var(--spacing-element)] text-center text-tertiary'>
            No notifications
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {notifications.length > 0 && notificationsData && (
        <div className='p-[var(--spacing-element)] border-t border-white/10'>
          <div className='flex items-center justify-between text-xs text-white/60 mb-3'>
            <span>
              Showing {page * pageSize + 1}-
              {Math.min((page + 1) * pageSize, notificationsData.total)} of{' '}
              {notificationsData.total}
            </span>
            <div className='flex items-center space-x-2'>
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className='px-2 py-1 rounded hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
              >
                Previous
              </button>
              <span className='px-2'>{page + 1}</span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={!notificationsData.has_more}
                className='px-2 py-1 rounded hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
              >
                Next
              </button>
            </div>
          </div>
          <Link to='/notifications' className='w-full'>
            <Button
              variant='glass'
              size='sm'
              className='w-full'
            >
              View All Notifications
            </Button>
          </Link>
        </div>
      )}
    </div>,
    document.body
  );
};

export default NotificationCenter;
