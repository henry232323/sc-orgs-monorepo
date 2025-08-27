import React from 'react';
import { Button } from './ui';

const Navigation: React.FC = () => {
  return (
    <div className='flex items-center justify-between w-full px-4'>
      <div className='flex items-center space-x-4'>
        <h1 className='text-2xl font-bold text-primary'>SC-Orgs</h1>
        <span className='text-sm hidden md:block text-tertiary'>
          Star Citizen Organization Platform
        </span>
      </div>

      <div className='flex items-center space-x-2'>
        <Button variant='glass' size='sm'>
          Sign In
        </Button>
        <Button variant='primary' size='sm'>
          Get Started
        </Button>
      </div>
    </div>
  );
};

export default Navigation;
