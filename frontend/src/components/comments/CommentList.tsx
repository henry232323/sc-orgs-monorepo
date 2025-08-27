import React from 'react';
import { Comment } from '../../types/comment';
import CommentItem from './CommentItem';

interface CommentListProps {
  comments: Comment[];
  onVote: (commentId: string, voteType: 'upvote' | 'downvote') => void;
  onReply: (commentId: string) => void;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  currentUserId?: string | undefined;
  expandedReplies: Set<string>;
  onToggleReplies: (commentId: string) => void;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

const CommentList: React.FC<CommentListProps> = ({
  comments,
  onVote,
  onReply,
  onEdit,
  onDelete,
  currentUserId,
  expandedReplies,
  onToggleReplies,
  loading = false,
  hasMore = false,
  onLoadMore,
}) => {
  const getReplies = (commentId: string) => {
    return comments.filter(comment => comment.parent_comment_id === commentId);
  };

  const getTopLevelComments = () => {
    return comments.filter(comment => comment.parent_comment_id === undefined);
  };

  if (loading && comments.length === 0) {
    return (
      <div className='space-y-4'>
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className='bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 animate-pulse'
          >
            <div className='h-4 bg-slate-200 dark:bg-slate-600 rounded mb-3'></div>
            <div className='h-3 bg-slate-200 dark:bg-slate-600 rounded mb-2'></div>
            <div className='h-3 bg-slate-200 dark:bg-slate-600 rounded w-2/3'></div>
          </div>
        ))}
      </div>
    );
  }

  if (getTopLevelComments().length === 0) {
    return (
      <div className='text-center py-12'>
        <div className='w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full mx-auto mb-4 flex items-center justify-center'>
          <span className='text-2xl'>💬</span>
        </div>
        <h3 className='text-lg font-medium text-slate-900 dark:text-primary mb-2'>
          No comments yet
        </h3>
        <p className='text-slate-600 dark:text-slate-400'>
          Be the first to start the discussion!
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {getTopLevelComments().map(comment => (
        <CommentItem
          key={comment.id}
          comment={comment}
          onVote={onVote}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          currentUserId={currentUserId}
          replies={getReplies(comment.id)}
          expandedReplies={expandedReplies}
          onToggleReplies={onToggleReplies}
        />
      ))}

      {hasMore && onLoadMore && (
        <div className='text-center pt-4'>
          <button
            onClick={onLoadMore}
            disabled={loading}
            className='px-6 py-2 bg-brand-secondary text-primary rounded-lg hover:bg-brand-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {loading ? 'Loading...' : 'Load More Comments'}
          </button>
        </div>
      )}
    </div>
  );
};

export default CommentList;
