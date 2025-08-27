import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useGetCurrentUserQuery } from '../../services/apiSlice';
import { Button, Paper, Chip } from '../ui';
import {
  ChatBubbleLeftIcon,
  UserCircleIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  PencilIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/react/24/outline';

interface Comment {
  id: string;
  content: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
  };
  timestamp: Date;
  upvotes: number;
  downvotes: number;
  replies: Comment[];
  isEdited: boolean;
}

interface CommentSectionProps {
  organizationId: string;
  comments?: Comment[];
  onCommentSubmit?: (content: string) => void;
  onCommentEdit?: (commentId: string, content: string) => void;
  onCommentDelete?: (commentId: string) => void;
  onCommentVote?: (commentId: string, voteType: 'upvote' | 'downvote') => void;
  onCommentReply?: (commentId: string, content: string) => void;
}

const CommentSection: React.FC<CommentSectionProps> = ({
  comments = [],
  onCommentSubmit,
  onCommentEdit,
  onCommentDelete,
  onCommentVote,
  onCommentReply,
}) => {
  const { isAuthenticated } = useAuth();
  const { data: user, isLoading: userLoading } = useGetCurrentUserQuery(
    undefined,
    {
      skip: !isAuthenticated,
    }
  );

  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // Show loading state for user
  if (userLoading) {
    return (
      <div className='flex items-center justify-center py-8'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-var(--color-accent-blue)'></div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-bold text-slate-900 dark:text-white flex items-center'>
          <ChatBubbleLeftIcon className='w-6 h-6 mr-3 text-var(--color-accent-blue)' />
          Discussion
        </h2>
        {isAuthenticated && (
          <Button variant='outline' onClick={() => setNewComment('')}>
            Add Comment
          </Button>
        )}
      </div>

      {/* Comment Form */}
      {isAuthenticated && (
        <div className='bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700'>
          <h3 className='text-lg font-semibold text-slate-900 dark:text-white mb-4'>
            Add a Comment
          </h3>
          <div className='space-y-4'>
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder='Share your thoughts...'
              className='w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-var(--color-accent-blue) focus:border-transparent'
              rows={3}
            />
            <div className='flex justify-end space-x-3'>
              <Button variant='outline' onClick={() => setNewComment('')}>
                Cancel
              </Button>
              <Button
                variant='primary'
                onClick={() => {
                  if (onCommentSubmit && newComment.trim()) {
                    onCommentSubmit(newComment.trim());
                    setNewComment('');
                  }
                }}
                disabled={!newComment.trim()}
              >
                Post Comment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Comments List */}
      <div className='space-y-4'>
        {comments.length > 0 ? (
          comments.map(comment => (
            <Paper key={comment.id} variant='glass-strong' size='lg'>
              <div className='p-4'>
                <div className='flex items-start space-x-3'>
                  <div className='flex-shrink-0'>
                    {comment.user.avatar ? (
                      <img
                        src={comment.user.avatar}
                        alt={comment.user.username}
                        className='w-10 h-10 rounded-full'
                      />
                    ) : (
                      <UserCircleIcon className='w-10 h-10 text-muted' />
                    )}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center space-x-2 mb-2'>
                      <span className='font-medium text-primary'>
                        {comment.user.username}
                      </span>
                      <span className='text-sm text-tertiary'>
                        {comment.timestamp.toLocaleDateString()}
                      </span>
                      {comment.isEdited && (
                        <Chip variant='status' size='sm'>
                          Edited
                        </Chip>
                      )}
                    </div>
                    <p className='text-slate-700 dark:text-slate-300 mb-3'>
                      {comment.content}
                    </p>

                    {/* Comment Actions */}
                    <div className='flex items-center space-x-4'>
                      <button
                        onClick={() => onCommentVote?.(comment.id, 'upvote')}
                        className='flex items-center space-x-1 text-slate-500 hover:text-green-600 transition-colors'
                      >
                        <HandThumbUpIcon className='w-4 h-4' />
                        <span>{comment.upvotes}</span>
                      </button>
                      <button
                        onClick={() => onCommentVote?.(comment.id, 'downvote')}
                        className='flex items-center space-x-1 text-slate-500 hover:text-red-600 transition-colors'
                      >
                        <HandThumbDownIcon className='w-4 h-4' />
                        <span>{comment.downvotes}</span>
                      </button>
                      <button
                        onClick={() => setReplyingTo(comment.id)}
                        className='flex items-center space-x-1 text-slate-500 hover:text-var(--color-accent-blue) transition-colors'
                      >
                        <ArrowUturnLeftIcon className='w-4 h-4' />
                        <span>Reply</span>
                      </button>

                      {/* Edit/Delete for comment owner */}
                      {user?.id === comment.user.id && (
                        <>
                          <button
                            onClick={() => {
                              setEditingComment(comment.id);
                              setEditContent(comment.content);
                            }}
                            className='flex items-center space-x-1 text-slate-500 hover:text-var(--color-accent-blue) transition-colors'
                          >
                            <PencilIcon className='w-4 h-4' />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => onCommentDelete?.(comment.id)}
                            className='flex items-center space-x-1 text-slate-500 hover:text-red-600 transition-colors'
                          >
                            <TrashIcon className='w-4 h-4' />
                            <span>Delete</span>
                          </button>
                        </>
                      )}
                    </div>

                    {/* Reply Form */}
                    {replyingTo === comment.id && (
                      <div className='mt-4 pl-4 border-l-2 border-slate-200 dark:border-slate-600'>
                        <textarea
                          value={replyContent}
                          onChange={e => setReplyContent(e.target.value)}
                          placeholder='Write a reply...'
                          className='w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-var(--color-accent-blue) focus:border-transparent'
                          rows={2}
                        />
                        <div className='flex justify-end space-x-2 mt-2'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyContent('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant='primary'
                            size='sm'
                            onClick={() => {
                              if (onCommentReply && replyContent.trim()) {
                                onCommentReply(comment.id, replyContent.trim());
                                setReplyContent('');
                                setReplyingTo(null);
                              }
                            }}
                            disabled={!replyContent.trim()}
                          >
                            Reply
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Edit Form */}
                    {editingComment === comment.id && (
                      <div className='mt-4'>
                        <textarea
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          className='w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-var(--color-accent-blue) focus:border-transparent'
                          rows={3}
                        />
                        <div className='flex justify-end space-x-2 mt-2'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => {
                              setEditingComment(null);
                              setEditContent('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant='primary'
                            size='sm'
                            onClick={() => {
                              if (onCommentEdit && editContent.trim()) {
                                onCommentEdit(comment.id, editContent.trim());
                                setEditingComment(null);
                                setEditContent('');
                              }
                            }}
                            disabled={!editContent.trim()}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className='mt-4 pl-4 border-l-2 border-slate-200 dark:border-slate-600 space-y-3'>
                        {comment.replies.map(reply => (
                          <div
                            key={reply.id}
                            className='bg-slate-50 dark:bg-slate-700 rounded-lg p-3'
                          >
                            <div className='flex items-center space-x-2 mb-2'>
                              <span className='font-medium text-slate-900 dark:text-white text-sm'>
                                {reply.user.username}
                              </span>
                              <span className='text-xs text-slate-500 dark:text-slate-400'>
                                {reply.timestamp.toLocaleDateString()}
                              </span>
                            </div>
                            <p className='text-slate-700 dark:text-slate-300 text-sm'>
                              {reply.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Paper>
          ))
        ) : (
          <div className='text-center py-12'>
            <ChatBubbleLeftIcon className='w-16 h-16 text-slate-400 dark:text-slate-500 mx-auto mb-4' />
            <h3 className='text-lg font-medium text-slate-900 dark:text-white mb-2'>
              No comments yet
            </h3>
            <p className='text-slate-500 dark:text-slate-400'>
              Be the first to start the discussion!
            </p>
          </div>
        )}
      </div>

      {/* Not Authenticated Message */}
      {!isAuthenticated && (
        <div className='bg-slate-50 dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 text-center'>
          <ChatBubbleLeftIcon className='w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4' />
          <h3 className='text-lg font-medium text-slate-900 dark:text-white mb-2'>
            Sign in to join the discussion
          </h3>
          <p className='text-slate-500 dark:text-slate-400 mb-4'>
            You need to be signed in to view and add comments.
          </p>
        </div>
      )}
    </div>
  );
};

export default CommentSection;
