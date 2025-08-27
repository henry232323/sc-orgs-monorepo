import { Request, Response } from 'express';
import { CommentModel } from '../models/comment_model';
import {
  Comment,
  CreateCommentData,
  UpdateCommentData,
} from '../types/comment';
import { User } from '../types/user';

import { getUserFromRequest } from '../utils/user-casting';
const commentModel = new CommentModel();

export class CommentController {
  // Get organization comments
  async getOrganizationComments(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const {
        limit = 50,
        offset = 0,
        sort_by = 'created_at',
        sort_order = 'desc',
      } = req.query;

      const comments = await commentModel.getByOrganization(organizationId, {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        sort_by: sort_by as string,
        sort_order: sort_order as 'asc' | 'desc',
      });

      res.json({
        success: true,
        data: comments,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: comments.length,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get organization comments',
      });
    }
  }

  // Create comment
  async createComment(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({
          success: false,
          error: 'No authorization header',
        });
        return;
      }

      // Get user ID from req.user (set by JWT middleware)
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not found in request',
        });
        return;
      }

      const commentData: CreateCommentData = {
        ...req.body,
        user_id: userId,
      };

      const comment = await commentModel.create(commentData);

      res.status(201).json({
        success: true,
        data: comment,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create comment',
      });
    }
  }

  // Update comment
  async updateComment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({
          success: false,
          error: 'No authorization header',
        });
        return;
      }

      // Get user ID from req.user (set by JWT middleware)
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not found in request',
        });
        return;
      }

      // Check if user owns this comment
      const comment = await commentModel.findById(id);
      if (!comment) {
        res.status(404).json({
          success: false,
          error: 'Comment not found',
        });
        return;
      }

      if (comment.user_id !== userId) {
        res.status(403).json({
          success: false,
          error: 'Only comment author can update comment',
        });
        return;
      }

      const updateData: UpdateCommentData = req.body;
      const updatedComment = await commentModel.update(id, updateData);

      if (!updatedComment) {
        res.status(500).json({
          success: false,
          error: 'Failed to update comment',
        });
        return;
      }

      res.json({
        success: true,
        data: updatedComment,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update comment',
      });
    }
  }

  // Delete comment
  async deleteComment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({
          success: false,
          error: 'No authorization header',
        });
        return;
      }

      // Get user ID from req.user (set by JWT middleware)
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not found in request',
        });
        return;
      }

      // Check if user owns this comment
      const comment = await commentModel.findById(id);
      if (!comment) {
        res.status(404).json({
          success: false,
          error: 'Comment not found',
        });
        return;
      }

      if (comment.user_id !== userId) {
        res.status(403).json({
          success: false,
          error: 'Only comment author can delete comment',
        });
        return;
      }

      const deleted = await commentModel.delete(id);
      if (!deleted) {
        res.status(500).json({
          success: false,
          error: 'Failed to delete comment',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Comment deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete comment',
      });
    }
  }

  // Upvote comment
  async upvoteComment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({
          success: false,
          error: 'No authorization header',
        });
        return;
      }

      // Get user ID from req.user (set by JWT middleware)
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not found in request',
        });
        return;
      }

      // TODO: Implement comment upvoting logic
      // For now, we'll just return success
      res.json({
        success: true,
        message: 'Comment upvoted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to upvote comment',
      });
    }
  }

  // Downvote comment
  async downvoteComment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({
          success: false,
          error: 'No authorization header',
        });
        return;
      }

      // Get user ID from req.user (set by JWT middleware)
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not found in request',
        });
        return;
      }

      // TODO: Implement comment downvoting logic
      // For now, we'll just return success
      res.json({
        success: true,
        message: 'Comment downvoted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to downvote comment',
      });
    }
  }

  // Remove vote
  async removeVote(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({
          success: false,
          error: 'No authorization header',
        });
        return;
      }

      // Get user ID from req.user (set by JWT middleware)
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not found in request',
        });
        return;
      }

      // TODO: Implement vote removal logic
      // For now, we'll just return success
      res.json({
        success: true,
        message: 'Vote removed successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to remove vote',
      });
    }
  }

  // Create reply
  async createReply(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({
          success: false,
          error: 'No authorization header',
        });
        return;
      }

      // Get user ID from req.user (set by JWT middleware)
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not found in request',
        });
        return;
      }

      // Check if parent comment exists
      const parentComment = await commentModel.findById(id);
      if (!parentComment) {
        res.status(404).json({
          success: false,
          error: 'Parent comment not found',
        });
        return;
      }

      const replyData: CreateCommentData = {
        ...req.body,
        user_id: userId,
        parent_id: id,
        organization_id: parentComment.organization_id,
      };

      const reply = await commentModel.create(replyData);

      res.status(201).json({
        success: true,
        data: reply,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create reply',
      });
    }
  }

  // Get comment replies
  async getCommentReplies(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        limit = 50,
        offset = 0,
        sort_by = 'created_at',
        sort_order = 'asc',
      } = req.query;

      const replies = await commentModel.getReplies(id, {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        sort_by: sort_by as string,
        sort_order: sort_order as 'asc' | 'desc',
      });

      res.json({
        success: true,
        data: replies,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: replies.length,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get comment replies',
      });
    }
  }
}
