import React from 'react';
import OrganizationEventList from '../events/OrganizationEventList';

interface EventManagementProps {
  spectrumId: string;
}

const EventManagement: React.FC<EventManagementProps> = ({
  spectrumId,
}) => {
  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-lg font-medium text-white'>Event Management</h2>
        <p className='text-sm text-white/60'>
          View and manage events for your organization
        </p>
      </div>

      <OrganizationEventList spectrumId={spectrumId} />
    </div>
  );
};

export default EventManagement;
