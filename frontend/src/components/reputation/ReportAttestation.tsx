import React, { useState } from 'react';
import { HandThumbUpIcon, HandThumbDownIcon, MinusIcon } from '@heroicons/react/24/outline';
import { useAttestToReportMutation } from '../../services/apiSlice';
import { Button } from '../ui';
import type { PlayerReportWithAttestations, AttestReportRequest } from '../../types/reputation';

interface ReportAttestationProps {
  report: PlayerReportWithAttestations;
  userId?: string;
}

const ReportAttestation: React.FC<ReportAttestationProps> = ({ report, userId }) => {
  const [attestationType, setAttestationType] = useState<'support' | 'dispute' | 'neutral' | null>(null);
  const [comment, setComment] = useState('');
  const [showCommentForm, setShowCommentForm] = useState(false);
  
  const [attestToReport, { isLoading }] = useAttestToReportMutation();

  // Check if user has already attested
  const userAttestation = report.attestations.find(att => att.attester_id === userId);
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
      const attestationData: AttestReportRequest = {
        attestation_type: type,
        ...(comment.trim() && { comment: comment.trim() }),
      };

      await attestToReport({
        reportId: report.id,
        data: attestationData,
      }).unwrap();

      // Reset form
      setAttestationType(null);
      setComment('');
      setShowCommentForm(false);
    } catch (error) {
      console.error('Failed to attest to report:', error);
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
      <div className="mt-4 p-3 bg-white/5 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-white/80">You attested:</span>
            <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium ${getAttestationColor(userAttestation.attestation_type)}`}>
              {getAttestationIcon(userAttestation.attestation_type)}
              <span className="capitalize">{userAttestation.attestation_type}</span>
            </span>
          </div>
          <span className="text-xs text-white/60">
            {new Date(userAttestation.created_at).toLocaleDateString()}
          </span>
        </div>
        {userAttestation.comment && (
          <p className="text-sm text-white/80 mt-2 italic">
            "{userAttestation.comment}"
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-white/5 rounded-lg">
      <h4 className="text-sm font-medium text-white mb-3">Attest to this report</h4>
      
      <div className="flex items-center space-x-2 mb-3">
        <Button
          variant="glass"
          size="sm"
          onClick={() => handleAttestation('support')}
          disabled={isLoading}
          className="flex items-center space-x-1 text-green-400 hover:bg-green-500/20"
        >
          <HandThumbUpIcon className="w-4 h-4" />
          <span>Support ({report.attestation_counts.support})</span>
        </Button>
        
        <Button
          variant="glass"
          size="sm"
          onClick={() => handleAttestation('dispute')}
          disabled={isLoading}
          className="flex items-center space-x-1 text-red-400 hover:bg-red-500/20"
        >
          <HandThumbDownIcon className="w-4 h-4" />
          <span>Dispute ({report.attestation_counts.dispute})</span>
        </Button>
        
        <Button
          variant="glass"
          size="sm"
          onClick={() => handleAttestation('neutral')}
          disabled={isLoading}
          className="flex items-center space-x-1 text-yellow-400 hover:bg-yellow-500/20"
        >
          <MinusIcon className="w-4 h-4" />
          <span>Neutral ({report.attestation_counts.neutral})</span>
        </Button>
      </div>

      {showCommentForm && (
        <div className="mt-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment (optional)"
            className="input-glass w-full h-20 resize-none text-sm"
            maxLength={500}
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-white/60">
              {comment.length}/500 characters
            </p>
            <div className="flex space-x-2">
              <Button
                variant="glass"
                size="sm"
                onClick={() => setShowCommentForm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (attestationType) {
                    handleAttestation(attestationType);
                  }
                }}
                disabled={isLoading}
              >
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}

      {!showCommentForm && (
        <button
          onClick={() => setShowCommentForm(true)}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          Add a comment
        </button>
      )}
    </div>
  );
};

export default ReportAttestation;