import { describe, expect, it } from "vitest";
import { mergeIntoQueue } from "./offline-queue";

describe("offline boarding queue", () => {
  it("keeps one entry per pupil, with the latest status winning", () => {
    let q = mergeIntoQueue([], { id: "r1", patch: { status: "on_board", boarded_at: "t1" }, queuedAt: "a" });
    q = mergeIntoQueue(q, { id: "r1", patch: { status: "dropped", dropped_at: "t2" }, queuedAt: "b" });
    expect(q).toHaveLength(1);
    expect(q[0].patch).toEqual({ status: "dropped", boarded_at: "t1", dropped_at: "t2" });
  });
});
