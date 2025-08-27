import React from 'react';
import {
  ChatBubbleLeftRightIcon,
  HeartIcon,
  FireIcon,
} from '@heroicons/react/24/outline';

interface CommentStatsProps {
  totalComments: number;
  totalReplies: number;
  totalUpvotes: number;
  totalDownvotes: number;
  sortBy: 'newest' | 'oldest' | 'mostVoted' | 'mostReplied';
  onSortChange: (
    sortBy: 'newest' | 'oldest' | 'mostVoted' | 'mostReplied'
  ) => void;
}

const CommentStats: React.FC<CommentStatsProps> = ({
  totalComments,
  totalReplies,
  totalUpvotes,
  totalDownvotes,
  sortBy,
  onSortChange,
}) => {
  const totalEngagement = totalUpvotes + totalDownvotes;
  const engagementRate =
    totalComments > 0 ? (totalEngagement / totalComments).toFixed(1) : '0';

  return (
    <div className='bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 mb-6'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-lg font-semibold text-slate-900 dark:text-white'>
          Discussion Stats
        </h3>

        {/* Sort Options */}
        <div className='flex items-center space-x-2'>
          <span className='text-sm text-slate-600 dark:text-slate-400'>
            Sort by:
          </span>
          <select
            value={sortBy}
            onChange={e => onSortChange(e.target.value as any)}
            className='px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyber-cyan focus:border-transparent'
          >
            <option value='newest'>Newest</option>
            <option value='oldest'>Oldest</option>
            <option value='mostVoted'>Most Voted</option>
            <option value='mostReplied'>Most Replied</option>
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <div className='text-center'>
          <div className='w-12 h-12 bg-gradient-to-r from-cyber-cyan to-cyber-pink rounded-lg mx-auto mb-2 flex items-center justify-center'>
            <ChatBubbleLeftRightIcon className='w-6 h-6 text-white' />
          </div>
          <div className='text-2xl font-bold text-slate-900 dark:text-white'>
            {totalComments}
          </div>
          <div className='text-sm text-slate-600 dark:text-slate-400'>
            Comments
          </div>
        </div>

        <div className='text-center'>
          <div className='w-12 h-12 bg-gradient-to-r from-cyber-pink to-cyber-cyan rounded-lg mx-auto mb-2 flex items-center justify-center'>
            <ChatBubbleLeftRightIcon className='w-6 h-6 text-white' />
          </div>
          <div className='text-2xl font-bold text-slate-900 dark:text-white'>
            {totalReplies}
          </div>
          <div className='text-sm text-slate-600 dark:text-slate-400'>
            Replies
          </div>
        </div>

        <div className='text-center'>
          <div className='w-12 h-12 bg-gradient-to-r from-green-400 to-green-600 rounded-lg mx-auto mb-2 flex items-center justify-center'>
            <HeartIcon className='w-6 h-6 text-white' />
          </div>
          <div className='text-2xl font-bold text-slate-900 dark:text-white'>
            {totalUpvotes}
          </div>
          <div className='text-sm text-slate-600 dark:text-slate-400'>
            Upvotes
          </div>
        </div>

        <div className='text-center'>
          <div className='w-12 h-12 bg-gradient-to-r from-orange-400 to-orange-600 rounded-lg mx-auto mb-2 flex items-center justify-center'>
            <FireIcon className='w-6 h-6 text-white' />
          </div>
          <div className='text-2xl font-bold text-slate-900 dark:text-white'>
            {engagementRate}
          </div>
          <div className='text-sm text-slate-600 dark:text-slate-400'>
            Engagement
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className='mt-6 pt-4 border-t border-slate-200 dark:border-slate-700'>
        <div className='flex items-center justify-between text-sm'>
          <span className='text-slate-600 dark:text-slate-400'>
            Total engagement: {totalEngagement} votes
          </span>
          <span className='text-slate-600 dark:text-slate-400'>
            Downvotes: {totalDownvotes}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CommentStats;
