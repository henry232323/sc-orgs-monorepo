import React from 'react';
import { Tab } from '@headlessui/react';

interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

interface TabsProps {
  tabs: TabItem[];
  defaultIndex?: number;
  onChange?: (index: number) => void;
  variant?: 'default' | 'pills' | 'underline' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Tabs: React.FC<TabsProps> = ({
  tabs,
  defaultIndex = 0,
  onChange,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm leading-normal',
    md: 'px-4 py-2 text-sm leading-normal',
    lg: 'px-6 py-3 text-base leading-normal',
  };

  const variantClasses = {
    default: {
      list: 'border-b border-glass pb-4',
      tab: 'border-b-2 border-transparent text-tertiary hover:text-primary hover:border-glass-hover transition-all duration-[var(--duration-normal)]',
      selected:
        'border-[var(--color-accent-blue)] text-[var(--color-accent-blue)]',
    },
    pills: {
      list: 'gap-[var(--spacing-tight)]',
      tab: 'glass-button rounded-[var(--radius-glass-md)] text-tertiary hover:text-primary hover:bg-glass-hover',
      selected:
        'bg-[var(--color-accent-blue)] text-primary border-[var(--color-accent-blue)]',
    },
    underline: {
      list: 'border-b border-glass pb-2',
      tab: 'border-b-2 border-transparent text-tertiary hover:text-primary hover:border-glass-hover transition-all duration-[var(--duration-normal)]',
      selected:
        'border-[var(--color-accent-blue)] text-[var(--color-accent-blue)]',
    },
    glass: {
      list: 'gap-[var(--spacing-tight)] bg-glass rounded-[var(--radius-glass-lg)] p-1',
      tab: 'glass-button rounded-[var(--radius-glass-sm)] text-tertiary hover:text-primary hover:bg-glass-hover',
      selected:
        'bg-[var(--color-accent-blue)] text-primary border-[var(--color-accent-blue)] shadow-[var(--shadow-glass-sm)]',
    },
  };

  const currentVariant = variantClasses[variant];

  return (
    <div className={`w-full ${className}`}>
      <Tab.Group defaultIndex={defaultIndex} onChange={onChange || (() => {})}>
        <Tab.List className={`flex ${currentVariant.list}`}>
          {tabs.map(tab => (
            <Tab
              key={tab.id}
              disabled={tab.disabled || false}
              className={({ selected }) => `
                ${sizeClasses[size]}
                ${currentVariant.tab}
                ${selected ? currentVariant.selected : ''}
                ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                font-semibold transition-all duration-[var(--duration-normal)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)] focus:ring-opacity-50
              `}
            >
              <div className='flex items-center gap-2'>
                {tab.icon && <tab.icon className='w-4 h-4' />}
                {tab.label}
              </div>
            </Tab>
          ))}
        </Tab.List>
        <Tab.Panels className='mt-[var(--spacing-element)]'>
          {tabs.map(tab => (
            <Tab.Panel
              key={tab.id}
              className='focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)] focus:ring-opacity-50 rounded-[var(--radius-glass-lg)]'
            >
              {tab.content}
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};

export default Tabs;
