import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Button from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode | string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'secondary' | 'glass';
  isLoading?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  isLoading = false,
  icon: Icon = ExclamationTriangleIcon,
}) => {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as='div' className='relative z-50' onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter='ease-out duration-300'
          enterFrom='opacity-0'
          enterTo='opacity-100'
          leave='ease-in duration-200'
          leaveFrom='opacity-100'
          leaveTo='opacity-0'
        >
          <div className='fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm' />
        </Transition.Child>

        <div className='fixed inset-0 overflow-y-auto'>
          <div className='flex min-h-full items-center justify-center p-4 text-center'>
            <Transition.Child
              as={Fragment}
              enter='ease-out duration-300'
              enterFrom='opacity-0 scale-95'
              enterTo='opacity-100 scale-100'
              leave='ease-in duration-200'
              leaveFrom='opacity-100 scale-100'
              leaveTo='opacity-0 scale-95'
            >
              <Dialog.Panel className='w-full max-w-md transform overflow-hidden rounded-2xl glass-panel border border-glass p-6 text-left align-middle shadow-xl transition-all'>
                <div className='flex items-start space-x-4'>
                  <div className='flex-shrink-0'>
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        confirmVariant === 'danger'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-brand-secondary text-brand-secondary'
                      }`}
                    >
                      <Icon className='w-5 h-5' />
                    </div>
                  </div>

                  <div className='flex-1'>
                    <Dialog.Title
                      as='h3'
                      className='text-lg font-medium leading-6 text-primary mb-3'
                    >
                      {title}
                    </Dialog.Title>

                    <div className='text-secondary text-sm'>
                      {typeof message === 'string' ? <p>{message}</p> : message}
                    </div>
                  </div>
                </div>

                <div className='mt-6 flex justify-end space-x-3'>
                  <Button
                    variant='secondary'
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    {cancelText}
                  </Button>
                  <Button
                    variant={confirmVariant}
                    onClick={handleConfirm}
                    disabled={isLoading}
                  >
                    {confirmText}
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ConfirmDialog;
