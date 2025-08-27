import db from '../config/database';
import {
  Comment,
  CreateCommentData,
  UpdateCommentData,
} from '../types/comment';
import { v4 as uuidv4 } from 'uuid';

export class CommentModel {
  async create(commentData: CreateCommentData): Promise<Comment> {
    const [comment] = await db('comments')
      .insert({
        id: uuidv4(),
        ...commentData,
        upvotes: 0,
        downvotes: 0,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    return comment;
  }

  async findById(id: string): Promise<Comment | null> {
    const comment = await db('comments').where({ id }).first();
    return comment || null;
  }

  async update(
    id: string,
    updateData: UpdateCommentData
  ): Promise<Comment | null> {
    const [comment] = await db('comments')
      .where({ id })
      .update({
        ...updateData,
        updated_at: new Date(),
      })
      .returning('*');

    return comment || null;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await db('comments').where({ id }).del();
    return deleted > 0;
  }

  async getByOrganization(
    organizationId: string,
    options: {
      limit?: number;
      offset?: number;
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
    } = {}
  ): Promise<Comment[]> {
    let query = db('comments')
      .where({ organization_id: organizationId, parent_id: null }) // Only top-level comments
      .join('users', 'comments.user_id', 'users.id')
      .select('comments.*', 'users.rsi_handle', 'users.avatar_url');

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.offset(options.offset);
    }

    const sortBy = options.sort_by || 'created_at';
    const sortOrder = options.sort_order || 'desc';

    return query.orderBy(sortBy, sortOrder);
  }

  async getReplies(
    commentId: string,
    options: {
      limit?: number;
      offset?: number;
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
    } = {}
  ): Promise<Comment[]> {
    let query = db('comments')
      .where({ parent_id: commentId })
      .join('users', 'comments.user_id', 'users.id')
      .select('comments.*', 'users.rsi_handle', 'users.avatar_url');

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.offset(options.offset);
    }

    const sortBy = options.sort_by || 'created_at';
    const sortOrder = options.sort_order || 'asc';

    return query.orderBy(sortBy, sortOrder);
  }

  async getCommentThread(commentId: string): Promise<Comment[]> {
    // Get the comment and all its replies in a flat structure
    const comment = await this.findById(commentId);
    if (!comment) {
      return [];
    }

    const replies = await this.getReplies(commentId);
    return [comment, ...replies];
  }

  async upvoteComment(commentId: string, userId: string): Promise<boolean> {
    try {
      // Check if user already voted
      const existingVote = await db('comment_votes')
        .where({ comment_id: commentId, user_id: userId })
        .first();

      if (existingVote) {
        if (existingVote.vote_type === 'upvote') {
          // User already upvoted, remove the upvote
          await db('comment_votes')
            .where({ comment_id: commentId, user_id: userId })
            .del();

          // Decrease upvote count
          await db('comments').where({ id: commentId }).decrement('upvotes', 1);

          return true;
        } else if (existingVote.vote_type === 'downvote') {
          // Change downvote to upvote
          await db('comment_votes')
            .where({ comment_id: commentId, user_id: userId })
            .update({ vote_type: 'upvote', updated_at: new Date() });

          // Increase upvote count and decrease downvote count
          await db('comments')
            .where({ id: commentId })
            .increment('upvotes', 1)
            .decrement('downvotes', 1);

          return true;
        }
      } else {
        // Create new upvote
        await db('comment_votes').insert({
          id: uuidv4(),
          comment_id: commentId,
          user_id: userId,
          vote_type: 'upvote',
          created_at: new Date(),
        });

        // Increase upvote count
        await db('comments').where({ id: commentId }).increment('upvotes', 1);

        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  async downvoteComment(commentId: string, userId: string): Promise<boolean> {
    try {
      // Check if user already voted
      const existingVote = await db('comment_votes')
        .where({ comment_id: commentId, user_id: userId })
        .first();

      if (existingVote) {
        if (existingVote.vote_type === 'downvote') {
          // User already downvoted, remove the downvote
          await db('comment_votes')
            .where({ comment_id: commentId, user_id: userId })
            .del();

          // Decrease downvote count
          await db('comments')
            .where({ id: commentId })
            .decrement('downvotes', 1);

          return true;
        } else if (existingVote.vote_type === 'upvote') {
          // Change upvote to downvote
          await db('comment_votes')
            .where({ comment_id: commentId, user_id: userId })
            .update({ vote_type: 'downvote', updated_at: new Date() });

          // Decrease upvote count and increase downvote count
          await db('comments')
            .where({ id: commentId })
            .decrement('upvotes', 1)
            .increment('downvotes', 1);

          return true;
        }
      } else {
        // Create new downvote
        await db('comment_votes').insert({
          id: uuidv4(),
          comment_id: commentId,
          user_id: userId,
          vote_type: 'downvote',
          created_at: new Date(),
        });

        // Increase downvote count
        await db('comments').where({ id: commentId }).increment('downvotes', 1);

        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  async removeVote(commentId: string, userId: string): Promise<boolean> {
    try {
      const existingVote = await db('comment_votes')
        .where({ comment_id: commentId, user_id: userId })
        .first();

      if (!existingVote) {
        return false;
      }

      // Remove the vote
      await db('comment_votes')
        .where({ comment_id: commentId, user_id: userId })
        .del();

      // Update vote counts
      if (existingVote.vote_type === 'upvote') {
        await db('comments').where({ id: commentId }).decrement('upvotes', 1);
      } else if (existingVote.vote_type === 'downvote') {
        await db('comments').where({ id: commentId }).decrement('downvotes', 1);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  async getUserVote(
    commentId: string,
    userId: string
  ): Promise<'upvote' | 'downvote' | null> {
    const vote = await db('comment_votes')
      .where({ comment_id: commentId, user_id: userId })
      .first();

    return vote ? vote.vote_type : null;
  }

  async getCommentStats(commentId: string): Promise<{
    upvotes: number;
    downvotes: number;
    total_votes: number;
    score: number;
  }> {
    const comment = await this.findById(commentId);
    if (!comment) {
      return {
        upvotes: 0,
        downvotes: 0,
        total_votes: 0,
        score: 0,
      };
    }

    const totalVotes = comment.upvotes + comment.downvotes;
    const score = comment.upvotes - comment.downvotes;

    return {
      upvotes: comment.upvotes,
      downvotes: comment.downvotes,
      total_votes: totalVotes,
      score,
    };
  }

  async getTopComments(
    organizationId: string,
    limit: number = 10
  ): Promise<Comment[]> {
    return db('comments')
      .where({ organization_id: organizationId, parent_id: null })
      .orderByRaw('(upvotes - downvotes) DESC')
      .limit(limit);
  }

  async getRecentComments(
    organizationId: string,
    limit: number = 10
  ): Promise<Comment[]> {
    return db('comments')
      .where({ organization_id: organizationId, parent_id: null })
      .orderBy('created_at', 'desc')
      .limit(limit);
  }
}
