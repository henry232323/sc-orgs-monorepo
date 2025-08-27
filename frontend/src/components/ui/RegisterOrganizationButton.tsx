import React from 'react';
import { Link } from 'react-router-dom';
import Button from './Button';
import { BuildingOfficeIcon, PlusIcon } from '@heroicons/react/24/outline';

interface RegisterOrganizationButtonProps {
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'text' | 'glass';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Icon to use - 'building' for BuildingOfficeIcon, 'plus' for PlusIcon */
  icon?: 'building' | 'plus';
  /** Custom className */
  className?: string;
  /** Whether to show as a full-width block link */
  block?: boolean;
  /** Custom text override */
  text?: string;
}

const RegisterOrganizationButton: React.FC<RegisterOrganizationButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon = 'building',
  className = '',
  block = false,
  text = 'Register Organization',
}) => {
  const IconComponent = icon === 'plus' ? PlusIcon : BuildingOfficeIcon;
  const iconSize = size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
  const iconMargin = 'mr-2';

  const buttonContent = (
    <Button variant={variant} size={size} className={className}>
      <IconComponent className={`${iconSize} ${iconMargin}`} />
      {text}
    </Button>
  );

  if (block) {
    return (
      <Link to='/organizations/create' className='block'>
        {buttonContent}
      </Link>
    );
  }

  return (
    <Link to='/organizations/create'>
      {buttonContent}
    </Link>
  );
};

export default RegisterOrganizationButton;