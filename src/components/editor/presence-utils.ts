"use client";

import type { PresencePeer } from "@/lib/presence-types";

export function peersForAvatars(
  peers: PresencePeer[],
  selfSessionId: string,
): PresencePeer[] {
  const byUser = new Map<string, PresencePeer>();
  for (const peer of peers) {
    if (peer.sessionId === selfSessionId) continue;
    const prev = byUser.get(peer.userId);
    if (!prev || peer.updatedAt > prev.updatedAt) {
      byUser.set(peer.userId, peer);
    }
  }
  return [...byUser.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function remoteCursorsFromPeers(
  peers: PresencePeer[],
  selfSessionId: string,
) {
  return peers
    .filter((p) => p.sessionId !== selfSessionId && p.cursor)
    .map((p) => ({
      sessionId: p.sessionId,
      name: p.name,
      color: p.color,
      from: p.cursor!.from,
      to: p.cursor!.to,
    }));
}
