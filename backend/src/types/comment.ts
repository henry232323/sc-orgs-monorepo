export interface Comment {
  id: string;
  organization_id: string;
  user_id: string;
  parent_comment_id?: string;
  content: string;
  upvotes: number;
  downvotes: number;
  is_edited: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCommentData {
  organization_id: string;
  user_id: string;
  parent_comment_id?: string;
  content: string;
}

export interface UpdateCommentData {
  content?: string;
  is_edited?: boolean;
}

export interface CommentVote {
  id: string;
  comment_id: string;
  user_id: string;
  vote_type: 'upvote' | 'downvote';
  created_at: Date;
}

export interface CreateCommentVoteData {
  comment_id: string;
  user_id: string;
  vote_type: 'upvote' | 'downvote';
}
