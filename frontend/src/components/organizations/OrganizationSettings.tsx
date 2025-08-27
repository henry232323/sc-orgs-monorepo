import React, { useState } from 'react';
import { Organization } from '../../types/organization';
import { convertCodesToNames } from '../../utils/languageMapping';
import { Chip } from '../ui';

interface OrganizationSettingsProps {
  organization: Organization;
  onUpdate: () => void;
}

const OrganizationSettings: React.FC<OrganizationSettingsProps> = ({
  organization,
  onUpdate: _onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-lg font-medium text-gray-900'>
            Organization Settings
          </h2>
          <p className='text-sm text-gray-500'>
            Manage your organization's basic information and settings
          </p>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className='inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-[var(--radius-button)] text-white bg-blue-600 hover:bg-blue-700'
        >
          {isEditing ? 'Cancel' : 'Edit Settings'}
        </button>
      </div>

      <div className='bg-white shadow rounded-[var(--radius-paper)] p-6'>
        <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
          <div>
            <label className='block text-sm font-medium text-gray-700'>
              Organization Name
            </label>
            <p className='mt-1 text-sm text-gray-900'>{organization.name}</p>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700'>
              RSI Organization ID
            </label>
            <p className='mt-1 text-sm text-gray-900'>
              {organization.rsi_org_id}
            </p>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700'>
              Languages
            </label>
            <div className='mt-1 flex flex-wrap gap-1'>
              {organization.languages && organization.languages.length > 0 ? (
                convertCodesToNames(organization.languages).map(
                  (lang: string, index: number) => (
                    <Chip key={index} variant='default' size='sm'>
                      {lang}
                    </Chip>
                  )
                )
              ) : (
                <span className='text-gray-500'>Not specified</span>
              )}
            </div>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700'>
              Total Members
            </label>
            <p className='mt-1 text-sm text-gray-900'>
              {organization.total_members}
            </p>
          </div>

          <div className='sm:col-span-2'>
            <label className='block text-sm font-medium text-gray-700'>
              Description
            </label>
            <p className='mt-1 text-sm text-gray-900'>
              {organization.description || 'No description provided'}
            </p>
          </div>
        </div>

        {isEditing && (
          <div className='mt-6 pt-6 border-t border-gray-200'>
            <p className='text-sm text-gray-500'>
              Organization settings editing will be implemented here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizationSettings;
