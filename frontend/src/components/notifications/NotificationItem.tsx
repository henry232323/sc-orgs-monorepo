import React from 'react';
import { Link } from 'react-router-dom';
import { NotificationWithDetails } from '../../types/notification';
import {
  BellIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CheckIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { NotificationRouter } from '../../utils/notification_router';
import {
  Paper,
  Button,
  ComponentTitle,
  ComponentSubtitle,
  Caption,
  Tooltip,
} from '../ui';

interface NotificationItemProps {
  notification: NotificationWithDetails;
  onMarkAsRead: (notificationId: string) => void;
  onDelete: (notificationId: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
}) => {
  const getNotificationIcon = () => {
    const entityType = notification.notification_object.entity_type;
    const display = NotificationRouter.getNotificationDisplay(entityType);

    const iconColorClass = {
      blue: 'text-brand-secondary',
      green: 'text-success',
      purple: 'text-brand-primary',
      red: 'text-error',
      gray: 'text-tertiary',
    }[display.colorScheme];

    switch (display.iconType) {
      case 'event':
        return <CalendarIcon className={`w-5 h-5 ${iconColorClass}`} />;
      case 'organization':
        return <BuildingOfficeIcon className={`w-5 h-5 ${iconColorClass}`} />;
      case 'comment':
        return (
          <ChatBubbleLeftRightIcon className={`w-5 h-5 ${iconColorClass}`} />
        );
      case 'security':
        return (
          <ExclamationTriangleIcon className={`w-5 h-5 ${iconColorClass}`} />
        );
      case 'system':
        return <CheckCircleIcon className={`w-5 h-5 ${iconColorClass}`} />;
      default:
        return <BellIcon className={`w-5 h-5 ${iconColorClass}`} />;
    }
  };

  const getNotificationVariant = ():
    | 'default'
    | 'elevated'
    | 'glass'
    | 'glass-subtle'
    | 'glass-strong' => {
    if (notification.is_read) {
      return 'glass-subtle';
    }

    return 'glass-subtle';
  };

  const getNotificationBorderClass = () => {
    if (notification.is_read) {
      return '';
    }

    const entityType = notification.notification_object.entity_type;
    const display = NotificationRouter.getNotificationDisplay(entityType);

    // For unread notifications, add accent border
    const borderMap = {
      blue: 'border-brand-secondary',
      green: 'border-success',
      purple: 'border-brand-primary',
      red: 'border-error',
      gray: 'border-glass',
    };

    return borderMap[display.colorScheme];
  };

  const handleMarkAsRead = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
  };

  const handleDelete = () => {
    onDelete(notification.id);
  };

  const getNotificationRoute = () => {
    const entityType = notification.notification_object.entity_type;
    const entityId = notification.notification_object.entity_id;

    return NotificationRouter.getNotificationRoute(entityType, entityId);
  };

  const notificationRoute = getNotificationRoute();

  const NotificationContent = (
    <div className='flex items-start gap-[var(--spacing-element)]'>
      <div className='flex-shrink-0 mt-1'>{getNotificationIcon()}</div>

      <div className='flex-1 min-w-0'>
        <div className='flex items-start justify-between gap-[var(--spacing-element)]'>
          <div className='flex-1'>
            <ComponentTitle
              className={notification.is_read ? 'opacity-70' : ''}
            >
              {notification.notification_object.title ||
                notification.title ||
                'Notification'}
            </ComponentTitle>
            <ComponentSubtitle className='mt-1'>
              {notification.notification_object.message ||
                notification.message ||
                'You have a new notification'}
            </ComponentSubtitle>
            <div className='flex items-center mt-2 gap-2'>
              <Caption>
                {formatDistanceToNow(notification.created_at, {
                  addSuffix: true,
                })}
              </Caption>
              {notification.read_at && (
                <>
                  <Caption>•</Caption>
                  <Caption>
                    Read{' '}
                    {formatDistanceToNow(notification.read_at, {
                      addSuffix: true,
                    })}
                  </Caption>
                </>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className='flex items-center gap-[var(--spacing-tight)]'>
            {!notification.is_read && (
              <Tooltip
                content='Mark this notification as read'
                placement='top'
                delay={300}
              >
                <Button
                  variant='text'
                  size='sm'
                  onClick={(e) => {
                    e?.preventDefault();
                    e?.stopPropagation();
                    handleMarkAsRead();
                  }}
                  className='text-brand-secondary hover:text-brand-secondary hover:scale-100 active:scale-100'
                >
                  <CheckIcon className='w-4 h-4' />
                  <span>Mark read</span>
                </Button>
              </Tooltip>
            )}
            <Tooltip
              content='Delete this notification permanently'
              placement='top'
              delay={300}
            >
              <Button
                variant='text'
                size='sm'
                onClick={(e) => {
                  e?.preventDefault();
                  e?.stopPropagation();
                  handleDelete();
                }}
                className='text-tertiary hover:text-error'
              >
                <TrashIcon className='w-4 h-4' />
                <span>Delete</span>
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );

  const paperVariant = getNotificationVariant();
  const borderClass = getNotificationBorderClass();

  return (
    <Paper
      variant={paperVariant}
      size='md'
      interactive={!!notificationRoute}
      className={`transition-all duration-[var(--duration-normal)] ${
        !notification.is_read ? 'border-l-4 border-l-brand-primary' : ''
      } ${borderClass}`}
    >
      {notificationRoute ? (
        <Link
          to={notificationRoute.path}
          className='block'
          target={notificationRoute.shouldOpenInNewTab ? '_blank' : '_self'}
          rel={
            notificationRoute.shouldOpenInNewTab
              ? 'noopener noreferrer'
              : undefined
          }
        >
          {NotificationContent}
        </Link>
      ) : (
        NotificationContent
      )}
    </Paper>
  );
};

export default NotificationItem;
