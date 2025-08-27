import React from 'react';
import { Menu, MenuButton, MenuItem, MenuItems, MenuSeparator } from '@headlessui/react';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';

// Reusable menu item components for admin actions
interface AdminMenuItemProps {
  onClick: () => void;
  icon: React.ComponentType<any>;
  children: React.ReactNode;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

const AdminMenuItem: React.FC<AdminMenuItemProps> = ({ 
  onClick, 
  icon: Icon, 
  children, 
  variant = 'default',
  disabled = false
}) => (
  <MenuItem disabled={disabled}>
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center w-full px-4 py-2 text-sm transition-all duration-150 
        data-[focus]:backdrop-blur-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
        ${variant === 'danger' 
          ? 'text-red-400 data-[focus]:bg-red-500/20 data-[focus]:text-red-300' 
          : 'text-white data-[focus]:bg-white/20'
        }
        [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]
      `}
    >
      <Icon className='w-4 h-4 mr-3 flex-shrink-0' />
      {children}
    </button>
  </MenuItem>
);

export interface AdminAction {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  separator?: boolean; // Add separator after this item
}

interface AdminActionsDropdownProps {
  actions: AdminAction[];
  disabled?: boolean;
  className?: string;
}

const AdminActionsDropdown: React.FC<AdminActionsDropdownProps> = ({
  actions,
  disabled = false,
  className = '',
}) => {
  if (actions.length === 0) return null;

  return (
    <Menu as="div" className={`relative ${className}`}>
      <MenuButton 
        disabled={disabled}
        className="flex items-center justify-center w-8 h-8 rounded-lg data-[hover]:bg-white/10 data-[focus]:bg-white/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <EllipsisVerticalIcon className='w-5 h-5 text-white/80' />
      </MenuButton>

      <MenuItems
        anchor="bottom end"
        className='min-w-48 bg-dark-glass border border-glass-border rounded-[var(--radius-dropdown)] shadow-[var(--shadow-glass-lg)] backdrop-blur-[var(--blur-glass-strong)] py-1 z-50 focus:outline-none'
      >
        {actions.map((action, index) => (
          <React.Fragment key={action.id}>
            <AdminMenuItem
              onClick={action.onClick}
              icon={action.icon}
              variant={action.variant || 'default'}
              disabled={action.disabled || false}
            >
              {action.label}
            </AdminMenuItem>
            {action.separator && index < actions.length - 1 && (
              <MenuSeparator className='my-1 h-px bg-white/10' />
            )}
          </React.Fragment>
        ))}
      </MenuItems>
    </Menu>
  );
};

export default AdminActionsDropdown;
