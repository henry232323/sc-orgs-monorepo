import React from 'react';
import { HandThumbUpIcon, HandThumbDownIcon, MinusIcon } from '@heroicons/react/24/outline';
import { useAttestToCommentMutation } from '../../services/apiSlice';
import { Button } from '../ui';
import type { PlayerCommentWithAttestations, AttestCommentRequest } from '../../types/reputation';

interface CommentAttestationProps {
  comment: PlayerCommentWithAttestations;
  userId?: string;
}

const CommentAttestation: React.FC<CommentAttestationProps> = ({ comment, userId }) => {
  const [attestToComment, { isLoading }] = useAttestToCommentMutation();

  // Check if user has already attested
  const userAttestation = comment.attestations.find(att => att.attester_id === userId);
  const hasAttested = !!userAttestation;

  const handleAttestation = async (type: 'support' | 'dispute' | 'neutral') => {
    if (!userId) {
      // TODO: Show login prompt
      return;
    }

    if (hasAttested) {
      // TODO: Show "already attested" message
      return;
    }

    try {
      const attestationData: AttestCommentRequest = {
        attestation_type: type,
      };

      await attestToComment({
        commentId: comment.id,
        data: attestationData,
      }).unwrap();
    } catch (error) {
      console.error('Failed to attest to comment:', error);
    }
  };

  const getAttestationColor = (type: 'support' | 'dispute' | 'neutral') => {
    switch (type) {
      case 'support':
        return 'text-green-400 bg-green-500/20';
      case 'dispute':
        return 'text-red-400 bg-red-500/20';
      case 'neutral':
        return 'text-yellow-400 bg-yellow-500/20';
      default:
        return 'text-white/60 bg-white/10';
    }
  };

  const getAttestationIcon = (type: 'support' | 'dispute' | 'neutral') => {
    switch (type) {
      case 'support':
        return <HandThumbUpIcon className="w-4 h-4" />;
      case 'dispute':
        return <HandThumbDownIcon className="w-4 h-4" />;
      case 'neutral':
        return <MinusIcon className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (hasAttested) {
    return (
      <div className="mt-3 p-2 bg-white/5 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-white/80">You attested:</span>
            <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium ${getAttestationColor(userAttestation.attestation_type)}`}>
              {getAttestationIcon(userAttestation.attestation_type)}
              <span className="capitalize">{userAttestation.attestation_type}</span>
            </span>
          </div>
          <span className="text-xs text-white/60">
            {new Date(userAttestation.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 p-3 bg-white/5 rounded-lg">
      <h4 className="text-xs font-medium text-white mb-2">Attest to this comment</h4>
      
      <div className="flex items-center space-x-2">
        <Button
          variant="glass"
          size="sm"
          onClick={() => handleAttestation('support')}
          disabled={isLoading}
          className="flex items-center space-x-1 text-green-400 hover:bg-green-500/20 text-xs px-2 py-1"
        >
          <HandThumbUpIcon className="w-3 h-3" />
          <span>Support ({comment.attestation_counts.support})</span>
        </Button>
        
        <Button
          variant="glass"
          size="sm"
          onClick={() => handleAttestation('dispute')}
          disabled={isLoading}
          className="flex items-center space-x-1 text-red-400 hover:bg-red-500/20 text-xs px-2 py-1"
        >
          <HandThumbDownIcon className="w-3 h-3" />
          <span>Dispute ({comment.attestation_counts.dispute})</span>
        </Button>
        
        <Button
          variant="glass"
          size="sm"
          onClick={() => handleAttestation('neutral')}
          disabled={isLoading}
          className="flex items-center space-x-1 text-yellow-400 hover:bg-yellow-500/20 text-xs px-2 py-1"
        >
          <MinusIcon className="w-3 h-3" />
          <span>Neutral ({comment.attestation_counts.neutral})</span>
        </Button>
      </div>
    </div>
  );
};

export default CommentAttestation;