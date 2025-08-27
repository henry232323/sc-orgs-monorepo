import React from 'react';

interface SettingsCardProps {
  title: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  iconColor?: string;
  children: React.ReactNode;
  className?: string;
}

const SettingsCard: React.FC<SettingsCardProps> = ({
  title,
  icon: Icon,
  iconColor = 'text-[var(--color-accent-blue)]',
  children,
  className = '',
}) => {
  return (
    <div
      className={`glass-card-lg rounded-[var(--radius-glass-xl)] ${className}`}
    >
      <h2 className='text-xl font-semibold text-primary mb-[var(--spacing-card-lg)] flex items-center'>
        <Icon className={`w-5 h-5 mr-[var(--spacing-tight)] ${iconColor}`} />
        {title}
      </h2>
      {children}
    </div>
  );
};

export default SettingsCard;
