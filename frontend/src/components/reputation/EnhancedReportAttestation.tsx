import React, { useState } from 'react';
import { HandThumbUpIcon, HandThumbDownIcon, MinusIcon } from '@heroicons/react/24/outline';
import { 
  useVoteOnOrganizationReportMutation,
  useVoteOnAltAccountReportMutation,
  useVoteOnAffiliatedPeopleReportMutation
} from '../../services/apiSlice';
import { Button } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import type { 
  OrganizationReportWithCorroborations,
  AltAccountReportWithCorroborations,
  AffiliatedPeopleReportWithCorroborations
} from '../../types/reputation';

type EnhancedReport = 
  | OrganizationReportWithCorroborations 
  | AltAccountReportWithCorroborations 
  | AffiliatedPeopleReportWithCorroborations;

interface EnhancedReportAttestationProps {
  report: EnhancedReport;
  reportType: 'organization' | 'alt_account' | 'affiliated_people';
}

const EnhancedReportAttestation: React.FC<EnhancedReportAttestationProps> = ({ 
  report, 
  reportType
}) => {
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  
  const [voteOnOrganizationReport, { isLoading: orgLoading }] = useVoteOnOrganizationReportMutation();
  const [voteOnAltAccountReport, { isLoading: altLoading }] = useVoteOnAltAccountReportMutation();
  const [voteOnAffiliatedPeopleReport, { isLoading: affiliatedLoading }] = useVoteOnAffiliatedPeopleReportMutation();

  const isLoading = orgLoading || altLoading || affiliatedLoading;

  // Check if user has already voted
  const userCorroboration = report.corroborations?.find(corr => corr.corroborator_id === user?.id);
  const hasVoted = !!userCorroboration;

  const handleVote = async (voteType: 'agree' | 'disagree' | 'neutral') => {
    if (!user?.id) {
      // TODO: Show login prompt
      return;
    }

    if (hasVoted) {
      // TODO: Show "already voted" message
      return;
    }

    try {
      const voteData = {
        report_id: report.id,
        corroborator_id: user.id,
        corroboration_type: voteType,
        ...(comment.trim() && { comment: comment.trim() }),
      };

      switch (reportType) {
        case 'organization':
          await voteOnOrganizationReport({
            reportId: report.id,
            data: voteData,
          }).unwrap();
          break;
        case 'alt_account':
          await voteOnAltAccountReport({
            reportId: report.id,
            data: voteData,
          }).unwrap();
          break;
        case 'affiliated_people':
          await voteOnAffiliatedPeopleReport({
            reportId: report.id,
            data: voteData,
          }).unwrap();
          break;
      }

      // Reset form
      setComment('');
    } catch (error) {
      console.error('Failed to vote on report:', error);
    }
  };

  const getVoteColor = (type: 'agree' | 'disagree' | 'neutral') => {
    switch (type) {
      case 'agree':
        return 'text-green-400 bg-green-500/20';
      case 'disagree':
        return 'text-red-400 bg-red-500/20';
      case 'neutral':
        return 'text-yellow-400 bg-yellow-500/20';
      default:
        return 'text-white/60 bg-white/10';
    }
  };

  const getVoteIcon = (type: 'agree' | 'disagree' | 'neutral') => {
    switch (type) {
      case 'agree':
        return <HandThumbUpIcon className="w-4 h-4" />;
      case 'disagree':
        return <HandThumbDownIcon className="w-4 h-4" />;
      case 'neutral':
        return <MinusIcon className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (hasVoted) {
    return (
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2">
          <span className="text-sm text-white/80">You voted:</span>
          <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium ${getVoteColor(userCorroboration.corroboration_type)}`}>
            {getVoteIcon(userCorroboration.corroboration_type)}
            <span className="capitalize">{userCorroboration.corroboration_type}</span>
          </span>
        </div>
        {userCorroboration.comment && (
          <p className="text-xs text-white/60 mt-1 italic">
            "{userCorroboration.comment}"
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1">
      <Button
        variant="glass"
        size="sm"
        onClick={() => handleVote('agree')}
        disabled={isLoading}
        className="flex items-center space-x-1 text-green-400 hover:bg-green-500/20 px-2 py-1"
      >
        <HandThumbUpIcon className="w-3 h-3" />
        <span className="text-xs">Agree</span>
      </Button>
      
      <Button
        variant="glass"
        size="sm"
        onClick={() => handleVote('disagree')}
        disabled={isLoading}
        className="flex items-center space-x-1 text-red-400 hover:bg-red-500/20 px-2 py-1"
      >
        <HandThumbDownIcon className="w-3 h-3" />
        <span className="text-xs">Disagree</span>
      </Button>
      
      <Button
        variant="glass"
        size="sm"
        onClick={() => handleVote('neutral')}
        disabled={isLoading}
        className="flex items-center space-x-1 text-yellow-400 hover:bg-yellow-500/20 px-2 py-1"
      >
        <MinusIcon className="w-3 h-3" />
        <span className="text-xs">Neutral</span>
      </Button>
    </div>
  );
};

export default EnhancedReportAttestation;