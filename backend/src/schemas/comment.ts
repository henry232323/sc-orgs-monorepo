/**
 * Comment-related OpenAPI schemas
 */

// Comment Schema
export const CommentSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'string' as const,
      description: 'Comment ID'
    },
    content: {
      type: 'string' as const,
      description: 'Comment content'
    },
    organizationId: {
      type: 'string' as const,
      description: 'Organization ID'
    },
    userId: {
      type: 'string' as const,
      description: 'User ID'
    },
    username: {
      type: 'string' as const,
      description: 'User username'
    },
    discriminator: {
      type: 'string' as const,
      description: 'User discriminator'
    },
    avatar: {
      type: 'string' as const,
      description: 'User avatar URL',
      nullable: true
    },
    parentCommentId: {
      type: 'string' as const,
      description: 'Parent comment ID for replies',
      nullable: true
    },
    upvotes: {
      type: 'integer' as const,
      description: 'Number of upvotes'
    },
    downvotes: {
      type: 'integer' as const,
      description: 'Number of downvotes'
    },
    userVote: {
      type: 'string' as const,
      description: 'User vote on this comment',
      enum: ['upvote', 'downvote', null],
      nullable: true
    },
    replyCount: {
      type: 'integer' as const,
      description: 'Number of replies'
    },
    createdAt: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Comment creation timestamp'
    },
    updatedAt: {
      type: 'string' as const,
      format: 'date-time' as const,
      description: 'Comment last update timestamp'
    }
  },
  required: ['id', 'content', 'organizationId', 'userId', 'username', 'discriminator', 'upvotes', 'downvotes', 'replyCount', 'createdAt', 'updatedAt']
};

// Create Comment Request Schema
export const CreateCommentRequestSchema = {
  type: 'object' as const,
  properties: {
    content: {
      type: 'string' as const,
      description: 'Comment content',
      minLength: 1,
      maxLength: 2000
    },
    organizationId: {
      type: 'string' as const,
      description: 'Organization ID'
    },
    parentCommentId: {
      type: 'string' as const,
      description: 'Parent comment ID for replies',
      nullable: true
    }
  },
  required: ['content', 'organizationId']
};

// Update Comment Request Schema
export const UpdateCommentRequestSchema = {
  type: 'object' as const,
  properties: {
    content: {
      type: 'string' as const,
      description: 'Comment content',
      minLength: 1,
      maxLength: 2000
    }
  },
  required: ['content']
};

// Comment List Response Schema
export const CommentListResponseSchema = {
  type: 'object' as const,
  properties: {
    success: {
      type: 'boolean' as const,
      description: 'Success status'
    },
    data: {
      type: 'array' as const,
      items: {
        $ref: '#/components/schemas/Comment'
      },
      description: 'List of comments'
    },
    pagination: {
      $ref: '#/components/schemas/Pagination'
    }
  },
  required: ['success', 'data', 'pagination']
};

// Comment Response Schema
export const CommentResponseSchema = {
  type: 'object' as const,
  properties: {
    success: {
      type: 'boolean' as const,
      description: 'Success status'
    },
    data: {
      $ref: '#/components/schemas/Comment'
    }
  },
  required: ['success', 'data']
};

// Vote Response Schema
export const VoteResponseSchema = {
  type: 'object' as const,
  properties: {
    success: {
      type: 'boolean' as const,
      description: 'Success status'
    },
    message: {
      type: 'string' as const,
      description: 'Success message'
    },
    upvotes: {
      type: 'integer' as const,
      description: 'Updated upvote count'
    },
    downvotes: {
      type: 'integer' as const,
      description: 'Updated downvote count'
    }
  },
  required: ['success', 'message', 'upvotes', 'downvotes']
};
