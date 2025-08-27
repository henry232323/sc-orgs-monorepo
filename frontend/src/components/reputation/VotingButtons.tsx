import React from 'react';
import { HandThumbUpIcon, HandThumbDownIcon, MinusIcon } from '@heroicons/react/24/outline';
import { 
  useAttestToCommentMutation,
  useAttestToTagMutation,
  useVoteOnOrganizationReportMutation,
  useVoteOnAltAccountReportMutation,
  useVoteOnAffiliatedPeopleReportMutation,
  useRemoveCommentAttestationMutation,
  useRemoveTagAttestationMutation,
  useRemoveOrganizationReportVoteMutation,
  useRemoveAltAccountReportVoteMutation,
  useRemoveAffiliatedPeopleReportVoteMutation
} from '../../services/apiSlice';
import { Button } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import type { 
  PlayerCommentWithAttestations,
  PlayerTagWithAttestations,
  OrganizationReportWithCorroborations,
  AltAccountReportWithCorroborations,
  AffiliatedPeopleReportWithCorroborations,
  AttestCommentRequest,
  AttestTagRequest,
  CreateOrganizationReportCorroborationData,
  CreateAltAccountReportCorroborationData,
  CreateAffiliatedPeopleReportCorroborationData
} from '../../types/reputation';

type VotingItem = 
  | PlayerCommentWithAttestations
  | PlayerTagWithAttestations
  | OrganizationReportWithCorroborations
  | AltAccountReportWithCorroborations
  | AffiliatedPeopleReportWithCorroborations;

type VotingType = 'comment' | 'tag' | 'organization_report' | 'alt_account_report' | 'affiliated_people_report';

interface VotingButtonsProps {
  item: VotingItem;
  type: VotingType;
  compact?: boolean;
}

const VotingButtons: React.FC<VotingButtonsProps> = ({ 
  item, 
  type, 
  compact = false
}) => {
  const { user } = useAuth();
  
  // Mutations
  const [attestToComment, { isLoading: commentLoading }] = useAttestToCommentMutation();
  const [attestToTag, { isLoading: tagLoading }] = useAttestToTagMutation();
  const [voteOnOrganizationReport, { isLoading: orgLoading }] = useVoteOnOrganizationReportMutation();
  const [voteOnAltAccountReport, { isLoading: altLoading }] = useVoteOnAltAccountReportMutation();
  const [voteOnAffiliatedPeopleReport, { isLoading: affiliatedLoading }] = useVoteOnAffiliatedPeopleReportMutation();

  // Delete mutations
  const [removeCommentAttestation, { isLoading: removeCommentLoading }] = useRemoveCommentAttestationMutation();
  const [removeTagAttestation, { isLoading: removeTagLoading }] = useRemoveTagAttestationMutation();
  const [removeOrganizationReportVote, { isLoading: removeOrgLoading }] = useRemoveOrganizationReportVoteMutation();
  const [removeAltAccountReportVote, { isLoading: removeAltLoading }] = useRemoveAltAccountReportVoteMutation();
  const [removeAffiliatedPeopleReportVote, { isLoading: removeAffiliatedLoading }] = useRemoveAffiliatedPeopleReportVoteMutation();

  const isLoading = commentLoading || tagLoading || orgLoading || altLoading || affiliatedLoading || 
                   removeCommentLoading || removeTagLoading || removeOrgLoading || removeAltLoading || removeAffiliatedLoading;

  // Get current user's vote/attestation
  const getUserVote = () => {
    switch (type) {
      case 'comment':
        return (item as PlayerCommentWithAttestations).attestations.find(att => att.attester_id === user?.id);
      case 'tag':
        return (item as PlayerTagWithAttestations).attestations.find(att => att.attester_id === user?.id);
      case 'organization_report':
      case 'alt_account_report':
      case 'affiliated_people_report':
        return (item as OrganizationReportWithCorroborations | AltAccountReportWithCorroborations | AffiliatedPeopleReportWithCorroborations)
          .corroborations?.find(corr => corr.corroborator_id === user?.id);
      default:
        return null;
    }
  };

  const userVote = getUserVote();
  const hasVoted = !!userVote;


  // Handle voting
  const handleVote = async (voteType: 'support' | 'dispute' | 'neutral' | 'agree' | 'disagree') => {
    if (!user?.id) {
      // Show login prompt
      const shouldLogin = window.confirm('You need to be logged in to vote. Would you like to log in now?');
      if (shouldLogin) {
        window.location.href = '/login';
      }
      return;
    }

    // Check if user is clicking on their current vote (to remove it)
    const currentVoteType = (userVote as any)?.attestation_type || (userVote as any)?.corroboration_type;
    const isRemovingVote = currentVoteType === voteType || 
      (currentVoteType === 'support' && voteType === 'agree') ||
      (currentVoteType === 'dispute' && voteType === 'disagree');

    try {
      if (isRemovingVote) {
        // Remove the vote
        switch (type) {
          case 'comment':
            await removeCommentAttestation({ commentId: item.id }).unwrap();
            break;
          case 'tag':
            await removeTagAttestation({ tagId: item.id }).unwrap();
            break;
          case 'organization_report':
            await removeOrganizationReportVote({ reportId: item.id }).unwrap();
            break;
          case 'alt_account_report':
            await removeAltAccountReportVote({ reportId: item.id }).unwrap();
            break;
          case 'affiliated_people_report':
            await removeAffiliatedPeopleReportVote({ reportId: item.id }).unwrap();
            break;
        }
        return;
      }

      // Add or update the vote
      switch (type) {
        case 'comment': {
          const attestationData: AttestCommentRequest = {
            attestation_type: voteType as 'support' | 'dispute' | 'neutral',
          };
          await attestToComment({
            commentId: item.id,
            data: attestationData,
          }).unwrap();
          break;
        }
        case 'tag': {
          const attestationData: AttestTagRequest = {
            attestation_type: voteType as 'support' | 'dispute' | 'neutral',
          };
          await attestToTag({
            tagId: item.id,
            data: attestationData,
          }).unwrap();
          break;
        }
        case 'organization_report': {
          const voteData: CreateOrganizationReportCorroborationData = {
            report_id: item.id,
            corroborator_id: user.id,
            corroboration_type: voteType as 'agree' | 'disagree' | 'neutral',
          };
          await voteOnOrganizationReport({
            reportId: item.id,
            data: voteData,
          }).unwrap();
          break;
        }
        case 'alt_account_report': {
          const voteData: CreateAltAccountReportCorroborationData = {
            report_id: item.id,
            corroborator_id: user.id,
            corroboration_type: voteType as 'agree' | 'disagree' | 'neutral',
          };
          await voteOnAltAccountReport({
            reportId: item.id,
            data: voteData,
          }).unwrap();
          break;
        }
        case 'affiliated_people_report': {
          const voteData: CreateAffiliatedPeopleReportCorroborationData = {
            report_id: item.id,
            corroborator_id: user.id,
            corroboration_type: voteType as 'agree' | 'disagree' | 'neutral',
          };
          await voteOnAffiliatedPeopleReport({
            reportId: item.id,
            data: voteData,
          }).unwrap();
          break;
        }
      }

    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  // Get vote colors
  const getVoteColor = (voteType: string) => {
    switch (voteType) {
      case 'support':
      case 'agree':
        return 'text-green-400 bg-green-500/20';
      case 'dispute':
      case 'disagree':
        return 'text-red-400 bg-red-500/20';
      case 'neutral':
        return 'text-yellow-400 bg-yellow-500/20';
      default:
        return 'text-white/60 bg-white/10';
    }
  };

  // Get vote icons
  const getVoteIcon = (voteType: string) => {
    switch (voteType) {
      case 'support':
      case 'agree':
        return <HandThumbUpIcon className="w-4 h-4" />;
      case 'dispute':
      case 'disagree':
        return <HandThumbDownIcon className="w-4 h-4" />;
      case 'neutral':
        return <MinusIcon className="w-4 h-4" />;
      default:
        return null;
    }
  };


  // Get current vote type for highlighting
  const getCurrentVoteType = () => {
    if (!userVote) return null;
    return (userVote as any).attestation_type || (userVote as any).corroboration_type;
  };

  const currentVoteType = getCurrentVoteType();

  // Render voting buttons
  const renderVotingButtons = () => {
    const buttonClass = compact 
      ? "flex items-center space-x-1 text-xs px-2 py-1"
      : "flex items-center space-x-1 text-xs px-3 py-2";

    return (
      <div className={`flex items-center space-x-1 ${compact ? '' : 'space-x-2'}`}>
        <Button
          variant="glass"
          size="sm"
          onClick={() => handleVote('support' as any)}
          disabled={isLoading}
          className={`${buttonClass} ${
            currentVoteType === 'support' || currentVoteType === 'agree' 
              ? 'vote-highlight-support' 
              : 'text-green-400 hover:bg-green-500/20'
          }`}
        >
          <HandThumbUpIcon className="w-3 h-3" />
        </Button>
        
        <Button
          variant="glass"
          size="sm"
          onClick={() => handleVote('dispute' as any)}
          disabled={isLoading}
          className={`${buttonClass} ${
            currentVoteType === 'dispute' || currentVoteType === 'disagree' 
              ? 'vote-highlight-dispute' 
              : 'text-red-400 hover:bg-red-500/20'
          }`}
        >
          <HandThumbDownIcon className="w-3 h-3" />
        </Button>
        
        <Button
          variant="glass"
          size="sm"
          onClick={() => handleVote('neutral')}
          disabled={isLoading}
          className={`${buttonClass} ${
            currentVoteType === 'neutral' 
              ? 'vote-highlight-neutral' 
              : 'text-yellow-400 hover:bg-yellow-500/20'
          }`}
        >
          <MinusIcon className="w-3 h-3" />
        </Button>
      </div>
    );
  };


  // Render current vote status
  const renderCurrentVote = () => {
    if (!hasVoted || !userVote) return null;

    const voteType = (userVote as any).attestation_type || (userVote as any).corroboration_type;
    const voteDate = userVote.created_at;

    return (
      <div className="mb-2 p-2 bg-white/5 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-white/80">You voted:</span>
            <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium ${getVoteColor(voteType)}`}>
              {getVoteIcon(voteType)}
              <span className="capitalize">{voteType}</span>
            </span>
          </div>
          <span className="text-xs text-white/60">
            {new Date(voteDate).toLocaleDateString()}
          </span>
        </div>
      </div>
    );
  };

  if (compact) {
    return renderVotingButtons();
  }

  return (
    <div className="p-3 bg-white/5 rounded-lg">
      {renderCurrentVote()}
      
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-white">
          {type === 'comment' ? 'Attest to this comment' : 
           type === 'tag' ? 'Attest to this tag' : 
           'Vote on this report'}
        </h4>
      </div>
      
      {renderVotingButtons()}
    </div>
  );
};

export default VotingButtons;
