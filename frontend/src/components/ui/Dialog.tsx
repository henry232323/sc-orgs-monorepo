import React from 'react';
import {
  Dialog as HeadlessDialog,
  DialogPanel,
  DialogTitle,
  Transition,
} from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}

const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
}) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <HeadlessDialog as='div' className='relative z-50' onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter='ease-out duration-[var(--duration-slow)]'
          enterFrom='opacity-0'
          enterTo='opacity-100'
          leave='ease-in duration-[var(--duration-normal)]'
          leaveFrom='opacity-100'
          leaveTo='opacity-0'
        >
          <div
            className='fixed inset-0 bg-black/70 backdrop-blur-[var(--blur-glass-strong)]'
            aria-hidden='true'
          />
        </Transition.Child>

        <div className='fixed inset-0 overflow-y-auto'>
          <div className='flex min-h-full items-center justify-center p-4 text-center'>
            <Transition.Child
              as={Fragment}
              enter='ease-out duration-[var(--duration-slow)]'
              enterFrom='opacity-0 scale-95'
              enterTo='opacity-100 scale-100'
              leave='ease-in duration-[var(--duration-normal)]'
              leaveFrom='opacity-100 scale-100'
              leaveTo='opacity-0 scale-95'
            >
              <DialogPanel
                className={`w-full ${sizeClasses[size]} transform overflow-hidden rounded-[var(--radius-modal)] bg-dark-glass p-[var(--spacing-card-xl)] text-left align-middle shadow-[var(--shadow-glass-xl)] border border-glass-border backdrop-blur-[var(--blur-glass-strong)]`}
              >
                <div className='flex items-center justify-between mb-[var(--spacing-element)]'>
                  <DialogTitle
                    as='h3'
                    className='text-lg font-semibold leading-6 text-primary'
                  >
                    {title}
                  </DialogTitle>
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className='rounded-[var(--radius-button)] p-1 text-tertiary hover:text-primary hover:bg-glass-hover transition-all duration-[var(--duration-normal)]'
                    >
                      <XMarkIcon className='h-5 w-5' />
                    </button>
                  )}
                </div>

                <div className='text-secondary'>{children}</div>
              </DialogPanel>
            </Transition.Child>
          </div>
        </div>
      </HeadlessDialog>
    </Transition>
  );
};

export default Dialog;
