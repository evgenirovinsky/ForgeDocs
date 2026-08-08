import { describe, expect, it } from "vitest";
import { colorForUserId, parsePresencePeers } from "@/server/presence";
import {
  peersForAvatars,
  remoteCursorsFromPeers,
} from "@/components/editor/presence-utils";
import type { PresencePeer } from "@/lib/presence-types";

function peer(partial: Partial<PresencePeer> & Pick<PresencePeer, "sessionId" | "userId">): PresencePeer {
  return {
    name: "User",
    email: "u@test",
    color: "#000",
    updatedAt: Date.now(),
    ...partial,
  };
}

describe("presence helpers", () => {
  it("picks a stable color for a user id", () => {
    expect(colorForUserId("abc")).toBe(colorForUserId("abc"));
    expect(colorForUserId("abc")).not.toBe(colorForUserId("xyz"));
  });

  it("parses peer payloads", () => {
    expect(parsePresencePeers(null)).toEqual([]);
    expect(
      parsePresencePeers([
        peer({ sessionId: "s1", userId: "u1" }),
        { junk: true },
      ]),
    ).toHaveLength(1);
  });

  it("dedupes avatar stack by user, skipping self session", () => {
    const peers = [
      peer({ sessionId: "self", userId: "me", name: "Me" }),
      peer({
        sessionId: "a1",
        userId: "bob",
        name: "Bob",
        updatedAt: 1,
      }),
      peer({
        sessionId: "a2",
        userId: "bob",
        name: "Bob",
        updatedAt: 2,
      }),
      peer({ sessionId: "c1", userId: "carol", name: "Carol" }),
    ];
    const avatars = peersForAvatars(peers, "self");
    expect(avatars.map((p) => p.userId)).toEqual(["bob", "carol"]);
    expect(avatars.find((p) => p.userId === "bob")?.sessionId).toBe("a2");
  });

  it("maps remote cursors excluding self", () => {
    const peers = [
      peer({
        sessionId: "self",
        userId: "me",
        cursor: { from: 1, to: 2 },
      }),
      peer({
        sessionId: "other",
        userId: "bob",
        name: "Bob",
        color: "#f00",
        cursor: { from: 3, to: 5 },
      }),
    ];
    expect(remoteCursorsFromPeers(peers, "self")).toEqual([
      { sessionId: "other", name: "Bob", color: "#f00", from: 3, to: 5 },
    ]);
  });
});
