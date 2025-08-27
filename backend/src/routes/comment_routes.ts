import { Router } from 'express';
import { CommentController } from '../controllers/comment_controller';
import { requireLogin } from '../middleware/auth';
import { oapi } from './openapi_routes';

const router: Router = Router();
const commentController = new CommentController();

// Public routes (no authentication required)
oapi.path({
  tags: ['Comments'],
  summary: 'Get organization comments',
  description: 'Get comments for a specific organization',
  parameters: [
    {
      name: 'organizationId',
      in: 'path',
      required: true,
      description: 'Organization ID',
      schema: { type: 'string' }
    },
    {
      name: 'page',
      in: 'query',
      description: 'Page number',
      schema: { type: 'integer', minimum: 1, default: 1 }
    },
    {
      name: 'limit',
      in: 'query',
      description: 'Number of comments per page',
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
    }
  ],
  responses: {
    '200': {
      description: 'Comments retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CommentListResponse' }
        }
      }
    },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.get(
  '/organization/:organizationId',
  commentController.getOrganizationComments.bind(commentController)
);

// Protected routes (require JWT)
oapi.path({
  tags: ['Comments'],
  summary: 'Create comment',
  description: 'Create a new comment',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/CreateCommentRequest' }
      }
    }
  },
  responses: {
    '201': {
      description: 'Comment created successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CommentResponse' }
        }
      }
    },
    '400': { $ref: '#/components/responses/ValidationError' },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post(
  '/',
  requireLogin as any,
  commentController.createComment.bind(commentController)
);

oapi.path({
  tags: ['Comments'],
  summary: 'Update comment',
  description: 'Update an existing comment',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Comment ID',
      schema: { type: 'string' }
    }
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/UpdateCommentRequest' }
      }
    }
  },
  responses: {
    '200': {
      description: 'Comment updated successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CommentResponse' }
        }
      }
    },
    '400': { $ref: '#/components/responses/ValidationError' },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '403': { $ref: '#/components/responses/Forbidden' },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.put(
  '/:id',
  requireLogin as any,
  commentController.updateComment.bind(commentController)
);

oapi.path({
  tags: ['Comments'],
  summary: 'Delete comment',
  description: 'Delete a comment',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Comment ID',
      schema: { type: 'string' }
    }
  ],
  responses: {
    '200': {
      description: 'Comment deleted successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SuccessResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '403': { $ref: '#/components/responses/Forbidden' },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.delete(
  '/:id',
  requireLogin as any,
  commentController.deleteComment.bind(commentController)
);

// Comment voting
oapi.path({
  tags: ['Comments'],
  summary: 'Upvote comment',
  description: 'Upvote a comment',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Comment ID',
      schema: { type: 'string' }
    }
  ],
  responses: {
    '200': {
      description: 'Comment upvoted successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/VoteResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post(
  '/:id/upvote',
  requireLogin as any,
  commentController.upvoteComment.bind(commentController)
);

oapi.path({
  tags: ['Comments'],
  summary: 'Downvote comment',
  description: 'Downvote a comment',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Comment ID',
      schema: { type: 'string' }
    }
  ],
  responses: {
    '200': {
      description: 'Comment downvoted successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/VoteResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post(
  '/:id/downvote',
  requireLogin as any,
  commentController.downvoteComment.bind(commentController)
);

oapi.path({
  tags: ['Comments'],
  summary: 'Remove vote',
  description: 'Remove vote from a comment',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Comment ID',
      schema: { type: 'string' }
    }
  ],
  responses: {
    '200': {
      description: 'Vote removed successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/VoteResponse' }
        }
      }
    },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.delete(
  '/:id/vote',
  requireLogin as any,
  commentController.removeVote.bind(commentController)
);

// Comment replies
oapi.path({
  tags: ['Comments'],
  summary: 'Create comment reply',
  description: 'Create a reply to a comment',
  security: [
    { bearerAuth: [] },
    { sessionAuth: [] }
  ],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Parent comment ID',
      schema: { type: 'string' }
    }
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/CreateCommentRequest' }
      }
    }
  },
  responses: {
    '201': {
      description: 'Reply created successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CommentResponse' }
        }
      }
    },
    '400': { $ref: '#/components/responses/ValidationError' },
    '401': { $ref: '#/components/responses/Unauthorized' },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.post(
  '/:id/replies',
  requireLogin as any,
  commentController.createReply.bind(commentController)
);

oapi.path({
  tags: ['Comments'],
  summary: 'Get comment replies',
  description: 'Get replies for a specific comment',
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Parent comment ID',
      schema: { type: 'string' }
    },
    {
      name: 'page',
      in: 'query',
      description: 'Page number',
      schema: { type: 'integer', minimum: 1, default: 1 }
    },
    {
      name: 'limit',
      in: 'query',
      description: 'Number of replies per page',
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
    }
  ],
  responses: {
    '200': {
      description: 'Replies retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CommentListResponse' }
        }
      }
    },
    '404': { $ref: '#/components/responses/NotFound' },
    '500': { $ref: '#/components/responses/InternalServerError' }
  }
});
router.get(
  '/:id/replies',
  commentController.getCommentReplies.bind(commentController)
);

export default router;
