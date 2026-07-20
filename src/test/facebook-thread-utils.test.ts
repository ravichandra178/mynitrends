import { describe, it, expect } from "vitest";
import { getReplyTargetId } from "@/lib/facebook-thread-utils";

describe("getReplyTargetId", () => {
  it("uses the nested reply id when a comment reply is selected", () => {
    const targetId = getReplyTargetId({
      id: "reply-123",
      parent_comment_id: "parent-456",
    });

    expect(targetId).toBe("reply-123");
  });

  it("falls back to the parent comment id when the item does not have its own id", () => {
    const targetId = getReplyTargetId({
      parent_comment_id: "parent-456",
    });

    expect(targetId).toBe("parent-456");
  });
});
