import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  useGetCurrentUserQuery,
  useGetNotificationsQuery,
  useBulkMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useMarkNotificationAsReadMutation,
  useBulkDeleteAllNotificationsMutation,
} from '../services/apiSlice';
import {
  Button,
  PageTitle,
  PageContainer,
  Paper,
  SectionTitle,
  ComponentTitle,
  ComponentSubtitle,
  Caption,
} from '../components/ui';
import {
  BellIcon,
  Cog6ToothIcon,
  CheckIcon,
  TrashIcon,
  UserIcon,
  CalendarIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import NotificationItem from '../components/notifications/NotificationItem';

const NotificationsPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const {
    data: user,
    isLoading,
    error,
  } = useGetCurrentUserQuery(undefined, {
    skip: !isAuthenticated,
  });

  // State for preferences and pagination
  const [showPreferences, setShowPreferences] = useState(false);
  const [page, setPage] = useState(1);

  // Fetch notifications from API
  const { data: notificationsData, isLoading: notificationsLoading } =
    useGetNotificationsQuery({ page, limit: 20 }, { skip: !isAuthenticated });

  // Mutation hooks
  const [bulkMarkAllAsRead] = useBulkMarkAllAsReadMutation();
  const [markNotificationAsRead] = useMarkNotificationAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();
  const [bulkDeleteAllNotifications] = useBulkDeleteAllNotificationsMutation();

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unread_count || 0;

  // Handlers for notifications
  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id).unwrap();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id).unwrap();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await bulkMarkAllAsRead().unwrap();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleDeleteAll = async () => {
    try {
      await bulkDeleteAllNotifications().unwrap();
    } catch (error) {
      console.error('Failed to delete all notifications:', error);
    }
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  // Show loading state
  if (isLoading || notificationsLoading) {
    return (
      <PageContainer className='min-h-screen flex items-center justify-center'>
        <Paper variant='glass' size='lg' className='text-center'>
          <div className='animate-spin rounded-full h-16 w-16 border-b-2 border-brand-primary mx-auto mb-6'></div>
          <ComponentTitle className='mb-2'>
            Loading Notifications
          </ComponentTitle>
          <ComponentSubtitle>
            Please wait while we load your notifications...
          </ComponentSubtitle>
        </Paper>
      </PageContainer>
    );
  }

  // Show error state
  if (error) {
    return (
      <PageContainer className='min-h-screen flex items-center justify-center'>
        <Paper variant='glass' size='lg' className='text-center max-w-md'>
          <div className='mb-6'>
            <ComponentTitle className='text-brand-primary mb-2'>
              SC-Orgs
            </ComponentTitle>
            <Paper variant='glass-subtle' className='bg-error p-4 mb-6'>
              <ComponentTitle className='text-error mb-1'>
                Error Loading Notifications
              </ComponentTitle>
              <ComponentSubtitle className='text-error'>
                Failed to load your notifications. Please try again.
              </ComponentSubtitle>
            </Paper>
            <Button
              variant='primary'
              size='lg'
              className='w-full'
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </Paper>
      </PageContainer>
    );
  }

  // Show not authenticated state
  if (!isAuthenticated || !user) {
    return (
      <PageContainer className='min-h-screen flex items-center justify-center'>
        <Paper variant='glass' size='lg' className='text-center max-w-md'>
          <ComponentTitle className='text-brand-primary mb-6'>
            SC-Orgs
          </ComponentTitle>
          <Paper variant='glass-subtle' className='bg-warning p-4 mb-6'>
            <ComponentTitle className='text-warning mb-1'>
              Authentication Required
            </ComponentTitle>
            <ComponentSubtitle className='text-warning'>
              You must be logged in to view notifications.
            </ComponentSubtitle>
          </Paper>
        </Paper>
      </PageContainer>
    );
  }

  return (
    <PageContainer width='lg' padding='desktop' className='min-h-screen'>
      {/* Page Header */}
      <div className='flex items-start justify-between mb-[var(--page-header-margin)]'>
        <div className='flex items-center space-x-[var(--spacing-element)]'>
          <Paper
            variant='glass'
            className='w-12 h-12 bg-brand-primary-bg flex items-center justify-center'
          >
            <BellIcon className='w-6 h-6 text-brand-primary' />
          </Paper>
          <div>
            <PageTitle>Notifications</PageTitle>
            <ComponentSubtitle className='mt-2'>
              Stay updated with your latest activities and updates
            </ComponentSubtitle>
          </div>
        </div>

        <div className='flex items-center gap-[var(--spacing-element)]'>
          <Button
            variant='glass'
            size='md'
            onClick={() => setShowPreferences(!showPreferences)}
            className='flex items-center gap-2'
          >
            <Cog6ToothIcon className='w-4 h-4' />
            <span>Preferences</span>
          </Button>

          {unreadCount > 0 && (
            <>
              <Button
                variant='primary'
                size='md'
                onClick={handleMarkAllAsRead}
                className='flex items-center gap-2'
              >
                <CheckIcon className='w-4 h-4' />
                <span>Mark All Read</span>
              </Button>

              <Button
                variant='danger'
                size='md'
                onClick={handleDeleteAll}
                className='flex items-center gap-2'
              >
                <TrashIcon className='w-4 h-4' />
                <span>Delete All</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Notification Preferences */}
      {showPreferences && (
        <Paper
          variant='glass'
          size='lg'
          className='mb-[var(--spacing-section)]'
        >
          <SectionTitle className='mb-[var(--spacing-component)] flex items-center gap-2'>
            <Cog6ToothIcon className='w-5 h-5 text-brand-secondary' />
            Notification Preferences
          </SectionTitle>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-[var(--gap-grid-md)]'>
            <div>
              <ComponentTitle className='mb-[var(--spacing-tight)]'>
                General Notifications
              </ComponentTitle>
              <div className='space-y-[var(--spacing-tight)]'>
                <label className='flex items-center'>
                  <input
                    type='checkbox'
                    defaultChecked
                    className='rounded border-glass text-brand-primary focus:ring-brand-primary'
                  />
                  <ComponentSubtitle className='ml-2'>
                    Email notifications
                  </ComponentSubtitle>
                </label>
                <label className='flex items-center'>
                  <input
                    type='checkbox'
                    defaultChecked
                    className='rounded border-glass text-brand-primary focus:ring-brand-primary'
                  />
                  <ComponentSubtitle className='ml-2'>
                    Push notifications
                  </ComponentSubtitle>
                </label>
              </div>
            </div>

            <div>
              <ComponentTitle className='mb-[var(--spacing-tight)]'>
                Specific Updates
              </ComponentTitle>
              <div className='space-y-[var(--spacing-tight)]'>
                <label className='flex items-center'>
                  <input
                    type='checkbox'
                    defaultChecked
                    className='rounded border-glass text-brand-primary focus:ring-brand-primary'
                  />
                  <ComponentSubtitle className='ml-2'>
                    Organization updates
                  </ComponentSubtitle>
                </label>
                <label className='flex items-center'>
                  <input
                    type='checkbox'
                    defaultChecked
                    className='rounded border-glass text-brand-primary focus:ring-brand-primary'
                  />
                  <ComponentSubtitle className='ml-2'>
                    Event reminders
                  </ComponentSubtitle>
                </label>
                <label className='flex items-center'>
                  <input
                    type='checkbox'
                    defaultChecked
                    className='rounded border-glass text-brand-primary focus:ring-brand-primary'
                  />
                  <ComponentSubtitle className='ml-2'>
                    Security alerts
                  </ComponentSubtitle>
                </label>
              </div>
            </div>
          </div>

          <div className='mt-[var(--spacing-component)] pt-[var(--spacing-element)] border-t border-glass'>
            <Button variant='primary' className='flex items-center gap-2'>
              <CheckIcon className='w-4 h-4' />
              <span>Save Preferences</span>
            </Button>
          </div>
        </Paper>
      )}

      {/* Notifications Content */}
      <Paper variant='glass' size='lg' className='mb-[var(--spacing-section)]'>
        <div className='flex items-center justify-between mb-[var(--spacing-component)]'>
          <SectionTitle>Your Notifications</SectionTitle>
          {notifications.length > 0 && (
            <Caption>
              {unreadCount > 0
                ? `${unreadCount} unread of ${notifications.length} total`
                : `${notifications.length} notifications`}
            </Caption>
          )}
        </div>

        {notifications.length > 0 ? (
          <div className='space-y-[var(--spacing-element)]'>
            {notifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={() => handleMarkAsRead(notification.id)}
                onDelete={() => handleDelete(notification.id)}
              />
            ))}

            {notificationsData?.has_more && (
              <div className='pt-[var(--spacing-component)] border-t border-glass text-center'>
                <Button
                  variant='glass'
                  onClick={handleLoadMore}
                  disabled={notificationsLoading}
                >
                  {notificationsLoading
                    ? 'Loading...'
                    : 'Load More Notifications'}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Paper
            variant='glass-subtle'
            className='text-center py-[var(--spacing-section)]'
          >
            <BellIcon className='w-16 h-16 text-muted mx-auto mb-[var(--spacing-element)]' />
            <ComponentTitle className='mb-2'>
              No notifications yet
            </ComponentTitle>
            <ComponentSubtitle>
              When you have notifications, they'll appear here
            </ComponentSubtitle>
          </Paper>
        )}
      </Paper>

      {/* Quick Actions */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-[var(--gap-grid-md)]'>
        <Link to='/profile'>
          <Paper
            variant='glass'
            interactive
            className='group hover:bg-glass-hover transition-all duration-[var(--duration-normal)]'
          >
            <div className='flex items-center gap-[var(--spacing-tight)] mb-2'>
              <UserIcon className='w-5 h-5 text-brand-secondary group-hover:text-brand-primary transition-colors' />
              <ComponentTitle>Profile Settings</ComponentTitle>
            </div>
            <ComponentSubtitle>
              Manage your account preferences and settings
            </ComponentSubtitle>
          </Paper>
        </Link>

        <Link to='/events'>
          <Paper
            variant='glass'
            interactive
            className='group hover:bg-glass-hover transition-all duration-[var(--duration-normal)]'
          >
            <div className='flex items-center gap-[var(--spacing-tight)] mb-2'>
              <CalendarIcon className='w-5 h-5 text-brand-secondary group-hover:text-brand-primary transition-colors' />
              <ComponentTitle>View Events</ComponentTitle>
            </div>
            <ComponentSubtitle>
              Check out upcoming events and activities
            </ComponentSubtitle>
          </Paper>
        </Link>

        <Link to='/organizations'>
          <Paper
            variant='glass'
            interactive
            className='group hover:bg-glass-hover transition-all duration-[var(--duration-normal)]'
          >
            <div className='flex items-center gap-[var(--spacing-tight)] mb-2'>
              <BuildingOfficeIcon className='w-5 h-5 text-brand-secondary group-hover:text-brand-primary transition-colors' />
              <ComponentTitle>Organizations</ComponentTitle>
            </div>
            <ComponentSubtitle>
              Browse and join Star Citizen organizations
            </ComponentSubtitle>
          </Paper>
        </Link>
      </div>
    </PageContainer>
  );
};

export default NotificationsPage;
