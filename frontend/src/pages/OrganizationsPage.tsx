import React from 'react';
import OrganizationList from '../components/organizations/OrganizationList';

const OrganizationsPage: React.FC = () => {
  return (
    <OrganizationList
      title='Star Citizen Organizations'
      subtitle='Discover and join organizations in the Star Citizen universe'
    />
  );
};

export default OrganizationsPage;
