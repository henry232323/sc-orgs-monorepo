import React, { useState } from 'react';
import { Comment } from '../../types/comment';
import { Button } from '../ui';
import {
  HeartIcon,
  ChatBubbleLeftIcon,
  UserIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface CommentItemProps {
  comment: Comment;
  isReply?: boolean;
  onVote: (commentId: string, voteType: 'upvote' | 'downvote') => void;
  onReply: (commentId: string) => void;
  onEdit?: ((commentId: string, content: string) => void) | undefined;
  onDelete?: ((commentId: string) => void) | undefined;
  currentUserId?: string | undefined;
  replies?: Comment[];
  expandedReplies?: Set<string>;
  onToggleReplies?: ((commentId: string) => void) | undefined;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  isReply = false,
  onVote,
  onReply,
  onEdit,
  onDelete,
  currentUserId,
  replies = [],
  expandedReplies = new Set(),
  onToggleReplies,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const hasReplies = replies.length > 0;
  const isExpanded = expandedReplies.has(comment.id);
  const canEdit = onEdit && currentUserId === comment.user_id;
  const canDelete = onDelete && currentUserId === comment.user_id;
  const isOwner = currentUserId === comment.user_id;

  const formatCommentDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const handleEdit = () => {
    if (onEdit && editContent.trim() && editContent !== comment.content) {
      onEdit(comment.id, editContent.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(comment.content);
  };

  const handleSubmitReply = () => {
    if (replyContent.trim()) {
      onReply(comment.id);
      setReplyContent('');
      setShowReplyForm(false);
    }
  };

  const handleCancelReply = () => {
    setShowReplyForm(false);
    setReplyContent('');
  };

  return (
    <div className={`${isReply ? 'ml-8 border-l-2 border-glass pl-4' : ''}`}>
      <div className='glass-card-lg mb-4'>
        {/* Comment Header */}
        <div className='flex items-start justify-between mb-3'>
          <div className='flex items-center space-x-3'>
            <div className='w-8 h-8 bg-gradient-to-r from-[var(--color-accent-blue)] to-[var(--color-accent-purple)] rounded-full flex items-center justify-center'>
              <UserIcon className='w-4 h-4 text-primary' />
            </div>
            <div>
              <span className='text-sm font-medium text-primary'>
                User {comment.user_id}
                {isOwner && (
                  <span className='ml-2 text-xs bg-[var(--color-accent-blue)] text-primary px-2 py-1 rounded-full'>
                    You
                  </span>
                )}
              </span>
              <div className='flex items-center space-x-2 text-xs text-tertiary'>
                <ClockIcon className='w-3 h-3' />
                <span>
                  {formatCommentDate(comment.created_at.toISOString())}
                </span>
                {comment.updated_at !== comment.created_at && (
                  <span className='text-[var(--color-accent-purple)]'>
                    (edited)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Menu */}
          {(canEdit || canDelete) && (
            <div className='flex items-center space-x-2'>
              {canEdit && (
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className='p-1 text-muted hover:text-[var(--color-accent-blue)] transition-colors duration-[var(--duration-normal)]'
                  title='Edit comment'
                >
                  <PencilIcon className='w-4 h-4' />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => onDelete?.(comment.id)}
                  className='p-1 text-muted hover:text-error transition-colors duration-[var(--duration-normal)]'
                  title='Delete comment'
                >
                  <TrashIcon className='w-4 h-4' />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Comment Content */}
        {isEditing ? (
          <div className='mb-4'>
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              rows={3}
              className='w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-var(--color-accent-blue) focus:border-transparent resize-none'
            />
            <div className='flex items-center justify-end space-x-2 mt-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
              <Button
                type='button'
                variant='primary'
                size='sm'
                onClick={handleEdit}
                disabled={
                  !editContent.trim() || editContent === comment.content
                }
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className='text-slate-700 dark:text-slate-300 mb-4 leading-relaxed'>
            {comment.content}
          </p>
        )}

        {/* Comment Actions */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-4'>
            {/* Voting */}
            <div className='flex items-center space-x-2'>
              <button
                onClick={() => onVote(comment.id, 'upvote')}
                className='flex items-center space-x-1 text-slate-500 hover:text-var(--color-accent-blue) transition-colors'
                title='Upvote'
              >
                <HeartIcon className='w-4 h-4' />
                <span className='text-sm'>{comment.upvotes}</span>
              </button>
              <button
                onClick={() => onVote(comment.id, 'downvote')}
                className='flex items-center space-x-1 text-slate-500 hover:text-red-500 transition-colors'
                title='Downvote'
              >
                <span className='text-sm'>{comment.downvotes}</span>
              </button>
            </div>

            {/* Reply Button */}
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className='flex items-center space-x-1 text-slate-500 hover:text-var(--color-accent-purple) transition-colors'
              title='Reply to comment'
            >
              <ChatBubbleLeftIcon className='w-4 h-4' />
              <span className='text-sm'>Reply</span>
            </button>
          </div>

          {/* Expand/Collapse Replies */}
          {hasReplies && onToggleReplies && (
            <button
              onClick={() => onToggleReplies(comment.id)}
              className='flex items-center space-x-1 text-var(--color-accent-blue) hover:text-var(--color-accent-purple) transition-colors'
            >
              {isExpanded ? (
                <>
                  <ChevronUpIcon className='w-4 h-4' />
                  <span className='text-sm'>Hide Replies</span>
                </>
              ) : (
                <>
                  <ChevronDownIcon className='w-4 h-4' />
                  <span className='text-sm'>Show {replies.length} Replies</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Reply Form */}
        {showReplyForm && (
          <div className='mt-4'>
            <textarea
              value={replyContent}
              onChange={e => setReplyContent(e.target.value)}
              placeholder='Write your reply...'
              rows={3}
              className='w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-var(--color-accent-purple) focus:border-transparent resize-none'
            />
            <div className='flex items-center justify-end space-x-2 mt-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={handleCancelReply}
              >
                Cancel
              </Button>
              <Button
                type='button'
                variant='primary'
                size='sm'
                onClick={handleSubmitReply}
                disabled={!replyContent.trim()}
              >
                Reply
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Replies */}
      {hasReplies && isExpanded && (
        <div className='space-y-2'>
          {replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              isReply={true}
              onVote={onVote}
              onReply={onReply}
              onEdit={onEdit || undefined}
              onDelete={onDelete || undefined}
              currentUserId={currentUserId || undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentItem;
