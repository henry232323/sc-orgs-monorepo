import React, { useState } from 'react';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useCreateReportMutation } from '../../services/apiSlice';
import { Paper, Button } from '../ui';
import type { CreatePlayerReportData } from '../../types/reputation';

interface CreateReportFormProps {
  playerId: string;
  playerHandle: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateReportForm: React.FC<CreateReportFormProps> = ({
  playerId,
  playerHandle,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<CreatePlayerReportData>({
    player_id: playerId,
    report_type: 'behavior',
    title: '',
    description: '',
    evidence_urls: [],
    is_public: true,
  });

  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [createReport, { isLoading }] = useCreateReportMutation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
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
    
    if (!formData.title.trim() || !formData.description.trim()) {
      return;
    }

    try {
      await createReport(formData).unwrap();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create report:', error);
    }
  };

  const reportTypeOptions = [
    { value: 'behavior', label: 'Behavior' },
    { value: 'affiliated_org', label: 'Affiliated Organization' },
    { value: 'alt_account', label: 'Alt Account' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Paper variant="glass-strong" size="xl" className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-semibold text-white">Create Report</h2>
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
            Please provide accurate information. False reports may result in account restrictions.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Report Type *
            </label>
            <select
              name="report_type"
              value={formData.report_type}
              onChange={handleInputChange}
              className="input-glass w-full"
              required
            >
              {reportTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Brief description of the issue"
              className="input-glass w-full"
              required
              maxLength={100}
            />
            <p className="text-xs text-white/60 mt-1">
              {formData.title.length}/100 characters
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
              placeholder="Provide detailed information about the incident..."
              className="input-glass w-full h-32 resize-none"
              required
              maxLength={1000}
            />
            <p className="text-xs text-white/60 mt-1">
              {formData.description.length}/1000 characters
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

          {/* Public/Private */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="is_public"
              name="is_public"
              checked={formData.is_public}
              onChange={handleInputChange}
              className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="is_public" className="text-sm text-white">
              Make this report public (visible to other users)
            </label>
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
              disabled={isLoading || !formData.title.trim() || !formData.description.trim()}
            >
              {isLoading ? 'Creating Report...' : 'Create Report'}
            </Button>
          </div>
        </form>
      </Paper>
    </div>
  );
};

export default CreateReportForm;