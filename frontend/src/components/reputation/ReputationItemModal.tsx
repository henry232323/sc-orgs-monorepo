import React from 'react';
import { XMarkIcon, CalendarIcon, UserIcon, LinkIcon } from '@heroicons/react/24/outline';
import { Paper, Button, Chip } from '../ui';
import VotingButtons from './VotingButtons';

type ReputationItem = 
  | import('../../types/reputation').OrganizationReportWithCorroborations
  | import('../../types/reputation').AltAccountReportWithCorroborations
  | import('../../types/reputation').AffiliatedPeopleReportWithCorroborations
  | import('../../types/reputation').PlayerCommentWithAttestations
  | import('../../types/reputation').PlayerTagWithAttestations;

interface ReputationItemModalProps {
  item: ReputationItem;
  itemType: 'organization_report' | 'alt_account_report' | 'affiliated_people_report' | 'comment' | 'tag';
  isOpen: boolean;
  onClose: () => void;
}

const ReputationItemModal: React.FC<ReputationItemModalProps> = ({
  item,
  itemType,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderReportDetails = () => {
    const report = item as any;
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {report.title || 'Report Details'}
            </h2>
            <div className="flex items-center space-x-4 text-sm text-white/60">
              <div className="flex items-center space-x-1">
                <CalendarIcon className="w-4 h-4" />
                <span>{formatDate(report.created_at)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <UserIcon className="w-4 h-4" />
                <span>Anonymous Reporter</span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white/60 hover:text-white"
          >
            <XMarkIcon className="w-5 h-5" />
          </Button>
        </div>

        {/* Description */}
        {report.description && (
          <div>
            <h3 className="text-lg font-medium text-white mb-3">Description</h3>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-white/80 leading-relaxed">{report.description}</p>
            </div>
          </div>
        )}

        {/* Evidence Links */}
        {report.evidence_urls && report.evidence_urls.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-white mb-3">Evidence</h3>
            <div className="space-y-2">
              {report.evidence_urls.map((url: string, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <LinkIcon className="w-4 h-4 text-blue-400" />
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline text-sm"
                  >
                    {url}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Report-specific details */}
        {itemType === 'organization_report' && (
          <div>
            <h3 className="text-lg font-medium text-white mb-3">Organization Details</h3>
            <div className="bg-white/5 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-white/60">Spectrum ID:</span>
                <span className="text-white font-mono">{report.org_spectrum_id}</span>
              </div>
              {report.org_name && (
                <div className="flex justify-between">
                  <span className="text-white/60">Organization Name:</span>
                  <span className="text-white">{report.org_name}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {itemType === 'alt_account_report' && (
          <div>
            <h3 className="text-lg font-medium text-white mb-3">Alt Account Details</h3>
            <div className="bg-white/5 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-white/60">Alt Handle:</span>
                <span className="text-white font-mono">{report.alt_handle}</span>
              </div>
              {report.alt_spectrum_id && (
                <div className="flex justify-between">
                  <span className="text-white/60">Spectrum ID:</span>
                  <span className="text-white font-mono">{report.alt_spectrum_id}</span>
                </div>
              )}
              {report.alt_display_name && (
                <div className="flex justify-between">
                  <span className="text-white/60">Display Name:</span>
                  <span className="text-white">{report.alt_display_name}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {itemType === 'affiliated_people_report' && (
          <div>
            <h3 className="text-lg font-medium text-white mb-3">Affiliated Person Details</h3>
            <div className="bg-white/5 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-white/60">Handle:</span>
                <span className="text-white font-mono">{report.affiliated_handle}</span>
              </div>
              {report.affiliated_spectrum_id && (
                <div className="flex justify-between">
                  <span className="text-white/60">Spectrum ID:</span>
                  <span className="text-white font-mono">{report.affiliated_spectrum_id}</span>
                </div>
              )}
              {report.affiliated_display_name && (
                <div className="flex justify-between">
                  <span className="text-white/60">Display Name:</span>
                  <span className="text-white">{report.affiliated_display_name}</span>
                </div>
              )}
              {report.relationship_type && (
                <div className="flex justify-between">
                  <span className="text-white/60">Relationship:</span>
                  <span className="text-white">{report.relationship_type}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Voting Section */}
        <div>
          <h3 className="text-lg font-medium text-white mb-3">Community Response</h3>
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                  <span className="text-white/80 text-sm">
                    {report.attestation_counts?.support || report.attestation_counts?.agree || 0} Support
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-red-400 rounded-full"></span>
                  <span className="text-white/80 text-sm">
                    {report.attestation_counts?.dispute || report.attestation_counts?.disagree || 0} Dispute
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                  <span className="text-white/80 text-sm">
                    {report.attestation_counts?.neutral || 0} Neutral
                  </span>
                </div>
              </div>
              <VotingButtons item={report} type={itemType} compact={false} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCommentDetails = () => {
    const comment = item as any;
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Comment Details</h2>
            <div className="flex items-center space-x-4 text-sm text-white/60">
              <div className="flex items-center space-x-1">
                <CalendarIcon className="w-4 h-4" />
                <span>{formatDate(comment.created_at)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <UserIcon className="w-4 h-4" />
                <span>Anonymous User</span>
              </div>
              {!comment.is_public && (
                <Chip className="text-xs text-yellow-400 bg-yellow-500/20">
                  Private
                </Chip>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white/60 hover:text-white"
          >
            <XMarkIcon className="w-5 h-5" />
          </Button>
        </div>

        {/* Comment Content */}
        <div>
          <h3 className="text-lg font-medium text-white mb-3">Comment</h3>
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-white/80 leading-relaxed">{comment.content}</p>
          </div>
        </div>

        {/* Voting Section */}
        <div>
          <h3 className="text-lg font-medium text-white mb-3">Community Response</h3>
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                  <span className="text-white/80 text-sm">{comment.attestation_counts.support} Support</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-red-400 rounded-full"></span>
                  <span className="text-white/80 text-sm">{comment.attestation_counts.dispute} Dispute</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                  <span className="text-white/80 text-sm">{comment.attestation_counts.neutral} Neutral</span>
                </div>
              </div>
              <VotingButtons item={comment} type="comment" compact={false} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTagDetails = () => {
    const tag = item as any;
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Tag Details</h2>
            <div className="flex items-center space-x-4 text-sm text-white/60">
              <div className="flex items-center space-x-1">
                <CalendarIcon className="w-4 h-4" />
                <span>{formatDate(tag.created_at)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <UserIcon className="w-4 h-4" />
                <span>Anonymous User</span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white/60 hover:text-white"
          >
            <XMarkIcon className="w-5 h-5" />
          </Button>
        </div>

        {/* Tag Information */}
        <div>
          <h3 className="text-lg font-medium text-white mb-3">Tag Information</h3>
          <div className="bg-white/5 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white/60">Tag Name:</span>
              <span className="text-white font-medium">{tag.tag_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Type:</span>
              <Chip
                className={`${
                  tag.tag_type === 'positive' ? 'text-green-400 bg-green-500/20' :
                  tag.tag_type === 'negative' ? 'text-red-400 bg-red-500/20' :
                  'text-yellow-400 bg-yellow-500/20'
                }`}
              >
                {tag.tag_type}
              </Chip>
            </div>
          </div>
        </div>

        {/* Voting Section */}
        <div>
          <h3 className="text-lg font-medium text-white mb-3">Community Response</h3>
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                  <span className="text-white/80 text-sm">{tag.attestation_counts.support} Support</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-red-400 rounded-full"></span>
                  <span className="text-white/80 text-sm">{tag.attestation_counts.dispute} Dispute</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                  <span className="text-white/80 text-sm">{tag.attestation_counts.neutral} Neutral</span>
                </div>
              </div>
              <VotingButtons item={tag} type="tag" compact={false} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Paper variant="glass" size="xl" className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {itemType === 'comment' ? renderCommentDetails() :
         itemType === 'tag' ? renderTagDetails() :
         renderReportDetails()}
      </Paper>
    </div>
  );
};

export default ReputationItemModal;