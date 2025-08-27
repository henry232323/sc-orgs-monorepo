import React, { useState } from 'react';
import { Dialog, Button } from '../ui';
import { useSendEventNotificationMutation } from '../../services/apiSlice';

interface EventOwnerNotificationFormProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  notificationsRemaining: number;
  onNotificationSent: () => void;
}

const EventOwnerNotificationForm: React.FC<EventOwnerNotificationFormProps> = ({
  eventId,
  isOpen,
  onClose,
  notificationsRemaining,
  onNotificationSent,
}) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [sendNotification, { isLoading }] = useSendEventNotificationMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setError(null);
    setSuccess(null);

    try {
      const result = await sendNotification({
        eventId,
        title: title.trim(),
        message: message.trim(),
      }).unwrap();

      setSuccess(result.message);
      setTitle('');
      setMessage('');
      onNotificationSent();

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 2000);
    } catch (error: any) {
      setError(
        error?.data?.error || error?.message || 'Failed to send notification'
      );
    }
  };

  const handleClose = () => {
    setTitle('');
    setMessage('');
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title='Send Event Notification'
      size='md'
    >
      <div className='space-y-6'>
        {/* Notification limit info */}
        <div className='bg-blue-900/20 border border-blue-400/20 rounded-lg p-4'>
          <p className='text-sm text-blue-300'>
            You have{' '}
            <span className='font-semibold text-blue-200'>
              {notificationsRemaining}
            </span>{' '}
            notifications remaining for this event.
          </p>
        </div>

        {/* Success message */}
        {success && (
          <div className='bg-green-900/20 border border-green-400/20 rounded-lg p-4'>
            <p className='text-sm text-green-300'>{success}</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className='bg-red-900/20 border border-red-400/20 rounded-lg p-4'>
            <p className='text-sm text-red-300'>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* Title field */}
          <div>
            <label className='block text-sm font-medium text-white mb-2'>
              Title <span className='text-red-400'>*</span>
            </label>
            <input
              type='text'
              value={title}
              onChange={e => setTitle(e.target.value)}
              className='w-full px-4 py-3 bg-dark-glass border border-glass-border rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200'
              placeholder='Event reminder'
              maxLength={100}
              required
              disabled={isLoading || notificationsRemaining === 0}
            />
            <p className='text-xs text-white/60 mt-1'>
              {title.length}/100 characters
            </p>
          </div>

          {/* Message field */}
          <div>
            <label className='block text-sm font-medium text-white mb-2'>
              Message <span className='text-red-400'>*</span>
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              className='w-full px-4 py-3 bg-dark-glass border border-glass-border rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 resize-none'
              placeholder="Don't forget about our event tomorrow!"
              rows={4}
              maxLength={500}
              required
              disabled={isLoading || notificationsRemaining === 0}
            />
            <p className='text-xs text-white/60 mt-1'>
              {message.length}/500 characters
            </p>
          </div>

          {/* Action buttons */}
          <div className='flex justify-end space-x-3 pt-4 border-t border-glass-border'>
            <Button
              type='button'
              variant='secondary'
              onClick={handleClose}
              disabled={isLoading}
              className='px-6'
            >
              Cancel
            </Button>
            <Button
              type='submit'
              variant='primary'
              disabled={
                isLoading ||
                !title.trim() ||
                !message.trim() ||
                notificationsRemaining === 0
              }
              className='px-6'
            >
              {isLoading ? (
                <>
                  <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                  Sending...
                </>
              ) : (
                'Send Notification'
              )}
            </Button>
          </div>

          {/* No notifications remaining warning */}
          {notificationsRemaining === 0 && (
            <div className='bg-yellow-900/20 border border-yellow-400/20 rounded-lg p-4'>
              <p className='text-sm text-yellow-300'>
                You have reached the maximum of 10 notifications for this event.
              </p>
            </div>
          )}
        </form>
      </div>
    </Dialog>
  );
};

export default EventOwnerNotificationForm;
