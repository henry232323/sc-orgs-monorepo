import React, { useState } from 'react';
import { TagIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAddTagMutation } from '../../services/apiSlice';
import { Paper, Button } from '../ui';
import type { CreatePlayerTagData } from '../../types/reputation';

interface CreateTagFormProps {
  playerId: string;
  playerHandle: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateTagForm: React.FC<CreateTagFormProps> = ({
  playerId,
  playerHandle,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<CreatePlayerTagData>({
    player_id: playerId,
    tag_name: '',
    tag_type: 'neutral',
  });

  const [addTag, { isLoading }] = useAddTagMutation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tag_name.trim()) {
      return;
    }

    try {
      await addTag(formData).unwrap();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  const tagTypeOptions = [
    { value: 'positive', label: 'Positive', color: 'text-green-400', bgColor: 'bg-green-500/20' },
    { value: 'negative', label: 'Negative', color: 'text-red-400', bgColor: 'bg-red-500/20' },
    { value: 'neutral', label: 'Neutral', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  ];

  const commonTags = [
    'Pirate', 'Helpful', 'Toxic', 'Friendly', 'Skilled', 'New Player',
    'Trader', 'Miner', 'Explorer', 'PVP', 'PVE', 'Roleplay',
    'Scammer', 'Trustworthy', 'Leader', 'Team Player'
  ];

  const handleCommonTagClick = (tag: string) => {
    setFormData(prev => ({ ...prev, tag_name: tag }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Paper variant="glass-strong" size="lg" className="max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <TagIcon className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">Add Tag</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <p className="text-sm text-purple-400">
            <strong>Tagging:</strong> {playerHandle}
          </p>
          <p className="text-xs text-purple-300 mt-1">
            Add a descriptive tag to help the community understand this player's characteristics.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Common Tags */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Common Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {commonTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleCommonTagClick(tag)}
                  className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 text-white/80 rounded-lg transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Tag Name */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Tag Name *
            </label>
            <input
              type="text"
              name="tag_name"
              value={formData.tag_name}
              onChange={handleInputChange}
              placeholder="Enter a descriptive tag..."
              className="input-glass w-full"
              required
              maxLength={50}
            />
            <p className="text-xs text-white/60 mt-1">
              {formData.tag_name.length}/50 characters
            </p>
          </div>

          {/* Tag Type */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Tag Type *
            </label>
            <div className="space-y-2">
              {tagTypeOptions.map((option) => (
                <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="tag_type"
                    value={option.value}
                    checked={formData.tag_type === option.value}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-purple-600 bg-white/10 border-white/20 rounded focus:ring-purple-500 focus:ring-2"
                  />
                  <span className={`px-3 py-1 rounded text-sm font-medium ${option.color} ${option.bgColor}`}>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>


          {/* Guidelines */}
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-400 mb-2">Tag Guidelines</h4>
            <ul className="text-xs text-yellow-300 space-y-1">
              <li>• Use descriptive, factual tags</li>
              <li>• Avoid offensive or personal attack tags</li>
              <li>• Tags can be attested to by other users</li>
              <li>• Choose appropriate tag type (positive/negative/neutral)</li>
            </ul>
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
              disabled={isLoading || !formData.tag_name.trim()}
            >
              {isLoading ? 'Adding Tag...' : 'Add Tag'}
            </Button>
          </div>
        </form>
      </Paper>
    </div>
  );
};

export default CreateTagForm;