import React from 'react';

interface SidebarSectionProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  description?: string;
}

const SidebarSection: React.FC<SidebarSectionProps> = ({
  children,
  title,
  className = '',
  description,
}) => {
  return (
    <div className={`${className}`}>
      {title && (
        <div className='px-3 py-2'>
          <h3 className='text-xs font-semibold text-secondary uppercase tracking-wider'>
            {title}
          </h3>
          {description && (
            <p className='text-xs text-muted mt-1'>{description}</p>
          )}
        </div>
      )}
      <div className='space-y-1'>{children}</div>
    </div>
  );
};

export default SidebarSection;
