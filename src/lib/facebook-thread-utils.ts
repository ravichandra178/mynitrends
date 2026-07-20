export type FacebookCommentLike = {
  id?: string | null;
  parent_comment_id?: string | null;
  parent?: {
    id?: string | null;
  } | null;
};

export function getReplyTargetId(comment: FacebookCommentLike | null | undefined): string | null {
  const directId = typeof comment?.id === "string" ? comment.id.trim() : "";
  if (directId) return directId;

  const parentCommentId = typeof comment?.parent_comment_id === "string" ? comment.parent_comment_id.trim() : "";
  if (parentCommentId) return parentCommentId;

  const parentId = typeof comment?.parent?.id === "string" ? comment.parent.id.trim() : "";
  if (parentId) return parentId;

  return null;
}
