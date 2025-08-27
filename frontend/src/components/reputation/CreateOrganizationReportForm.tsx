import React, { useState } from 'react';
import { XMarkIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { useCreateOrganizationReportMutation } from '../../services/apiSlice';
import { Paper, Button } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import type { CreateOrganizationReportData } from '../../types/reputation';

interface CreateOrganizationReportFormProps {
  playerId: string;
  playerHandle: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateOrganizationReportForm: React.FC<CreateOrganizationReportFormProps> = ({
  playerId,
  playerHandle,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<CreateOrganizationReportData>({
    player_id: playerId,
    reporter_id: user?.id || '',
    org_spectrum_id: '',
    org_name: '',
    description: '',
    evidence_urls: [],
  });

  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [createReport, { isLoading }] = useCreateOrganizationReportMutation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddEvidenceUrl = () => {
    if (evidenceUrl.trim() && !formData.evidence_urls?.includes(evidenceUrl.trim())) {
      setFormData(prev => ({
        ...prev,
        evidence_urls: [...(prev.evidence_urls || []), evidenceUrl.trim()],
      }));
      setEvidenceUrl('');
    }
  };

  const handleRemoveEvidenceUrl = (url: string) => {
    setFormData(prev => ({
      ...prev,
      evidence_urls: prev.evidence_urls?.filter(u => u !== url) || [],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.org_spectrum_id.trim() || !(formData.description || '').trim()) {
      return;
    }

    try {
      await createReport(formData).unwrap();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create organization report:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Paper variant="glass-strong" size="xl" className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <BuildingOfficeIcon className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Report Organization Affiliation</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-blue-400">
            <strong>Reporting:</strong> {playerHandle}
          </p>
          <p className="text-xs text-blue-300 mt-1">
            Report suspected affiliation with a Star Citizen organization. Provide the organization's Spectrum ID for verification.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Organization Spectrum ID */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Organization Spectrum ID *
            </label>
            <input
              type="text"
              name="org_spectrum_id"
              value={formData.org_spectrum_id}
              onChange={handleInputChange}
              placeholder="e.g., SCMARKET"
              className="input-glass w-full"
              required
            />
            <p className="text-xs text-white/60 mt-1">
              The organization's unique Spectrum ID. You can find this in the organization's Spectrum URL.
            </p>
          </div>

          {/* Organization Name (Optional) */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Organization Name (Optional)
            </label>
            <input
              type="text"
              name="org_name"
              value={formData.org_name}
              onChange={handleInputChange}
              placeholder="e.g., Test Squadron"
              className="input-glass w-full"
            />
            <p className="text-xs text-white/60 mt-1">
              The organization's display name. This will be automatically fetched if not provided.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe the suspected affiliation and provide context..."
              className="input-glass w-full h-32 resize-none"
              required
              maxLength={1000}
            />
            <p className="text-xs text-white/60 mt-1">
              {(formData.description || '').length}/1000 characters
            </p>
          </div>

          {/* Evidence URLs */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Evidence URLs (Optional)
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="url"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://example.com/evidence"
                className="input-glass flex-1"
              />
              <Button
                type="button"
                variant="glass"
                onClick={handleAddEvidenceUrl}
                disabled={!evidenceUrl.trim()}
              >
                Add
              </Button>
            </div>
            
            {formData.evidence_urls && formData.evidence_urls.length > 0 && (
              <div className="space-y-2">
                {formData.evidence_urls.map((url, index) => (
                  <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm truncate flex-1 mr-2"
                    >
                      {url}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleRemoveEvidenceUrl(url)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="glass"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading || !formData.org_spectrum_id.trim() || !(formData.description || '').trim()}
            >
              {isLoading ? 'Creating Report...' : 'Create Report'}
            </Button>
          </div>
        </form>
      </Paper>
    </div>
  );
};

export default CreateOrganizationReportForm;