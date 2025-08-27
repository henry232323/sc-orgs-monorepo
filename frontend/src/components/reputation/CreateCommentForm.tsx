import React, { useState } from 'react';
import { ChatBubbleLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAddCommentMutation } from '../../services/apiSlice';
import { Paper, Button } from '../ui';
import type { CreatePlayerCommentData } from '../../types/reputation';

interface CreateCommentFormProps {
  playerId: string;
  playerHandle: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateCommentForm: React.FC<CreateCommentFormProps> = ({
  playerId,
  playerHandle,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<CreatePlayerCommentData>({
    player_id: playerId,
    content: '',
    is_public: true,
  });

  const [addComment, { isLoading }] = useAddCommentMutation();

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.content.trim()) {
      return;
    }

    try {
      await addComment(formData).unwrap();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create comment:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Paper variant="glass-strong" size="lg" className="max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <ChatBubbleLeftIcon className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Add Comment</h2>
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
            <strong>Commenting on:</strong> {playerHandle}
          </p>
          <p className="text-xs text-blue-300 mt-1">
            Share your thoughts or experiences with this player. Be respectful and constructive.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Comment Content */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Comment *
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              placeholder="Share your thoughts about this player..."
              className="input-glass w-full h-32 resize-none"
              required
              maxLength={1000}
            />
            <p className="text-xs text-white/60 mt-1">
              {formData.content.length}/1000 characters
            </p>
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
              Make this comment public (visible to other users)
            </label>
          </div>

          {/* Guidelines */}
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-400 mb-2">Comment Guidelines</h4>
            <ul className="text-xs text-yellow-300 space-y-1">
              <li>• Be respectful and constructive</li>
              <li>• Share factual experiences, not rumors</li>
              <li>• Avoid personal attacks or harassment</li>
              <li>• Comments can be attested to by other users</li>
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
              disabled={isLoading || !formData.content.trim()}
            >
              {isLoading ? 'Adding Comment...' : 'Add Comment'}
            </Button>
          </div>
        </form>
      </Paper>
    </div>
  );
};

export default CreateCommentForm;