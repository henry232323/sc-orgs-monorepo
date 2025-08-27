import React from 'react';
import CreateOrganizationReportForm from './CreateOrganizationReportForm';
import CreateAltAccountReportForm from './CreateAltAccountReportForm';
import CreateAffiliatedPeopleReportForm from './CreateAffiliatedPeopleReportForm';

type ReportType = 'organization' | 'alt_account' | 'affiliated_people';

interface CreateEnhancedReportFormProps {
  playerId: string;
  playerHandle: string;
  reportType: ReportType;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateEnhancedReportForm: React.FC<CreateEnhancedReportFormProps> = ({
  playerId,
  playerHandle,
  reportType,
  onClose,
  onSuccess,
}) => {
  switch (reportType) {
    case 'organization':
      return (
        <CreateOrganizationReportForm
          playerId={playerId}
          playerHandle={playerHandle}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );
    case 'alt_account':
      return (
        <CreateAltAccountReportForm
          playerId={playerId}
          playerHandle={playerHandle}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );
    case 'affiliated_people':
      return (
        <CreateAffiliatedPeopleReportForm
          playerId={playerId}
          playerHandle={playerHandle}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );
    default:
      return (
        <CreateOrganizationReportForm
          playerId={playerId}
          playerHandle={playerHandle}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );
  }
};

export default CreateEnhancedReportForm;