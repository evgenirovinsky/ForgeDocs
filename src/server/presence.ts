import Redis from "ioredis";
import { redis } from "@/server/cache";
import type { PresencePeer } from "@/lib/presence-types";

export type { PresenceCursor, PresencePeer } from "@/lib/presence-types";

export const PRESENCE_TTL_SECONDS = 45;

const COLORS = [
  "#b45309",
  "#047857",
  "#1d4ed8",
  "#7c3aed",
  "#be123c",
  "#0f766e",
  "#a16207",
  "#4338ca",
];

export function presenceRoomKey(documentId: string): string {
  return `presence:doc:${documentId}`;
}

export function presenceChannel(documentId: string): string {
  return `presence:doc:${documentId}:ch`;
}

/** Stable pastel-ish accent from user id. */
export function colorForUserId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return COLORS[hash % COLORS.length]!;
}

async function ensureRedis(client: Redis): Promise<boolean> {
  try {
    if (client.status !== "ready") {
      await client.connect().catch(() => undefined);
    }
    return client.status === "ready";
  } catch {
    return false;
  }
}

export async function upsertPresence(
  documentId: string,
  peer: PresencePeer,
): Promise<PresencePeer[]> {
  const key = presenceRoomKey(documentId);
  const channel = presenceChannel(documentId);
  const ready = await ensureRedis(redis);
  if (!ready) return [peer];

  const peers = await listPresence(documentId);
  const next = peers.filter((p) => p.sessionId !== peer.sessionId);
  next.push({ ...peer, updatedAt: Date.now() });

  const cutoff = Date.now() - PRESENCE_TTL_SECONDS * 1000;
  const alive = next.filter((p) => p.updatedAt >= cutoff);

  const pipeline = redis.pipeline();
  pipeline.del(key);
  for (const p of alive) {
    pipeline.hset(key, p.sessionId, JSON.stringify(p));
  }
  pipeline.expire(key, PRESENCE_TTL_SECONDS);
  await pipeline.exec();

  await redis.publish(channel, JSON.stringify({ peers: alive }));
  return alive;
}

export async function listPresence(documentId: string): Promise<PresencePeer[]> {
  const key = presenceRoomKey(documentId);
  const ready = await ensureRedis(redis);
  if (!ready) return [];

  try {
    const all = await redis.hgetall(key);
    const cutoff = Date.now() - PRESENCE_TTL_SECONDS * 1000;
    const peers: PresencePeer[] = [];
    for (const raw of Object.values(all)) {
      try {
        const peer = JSON.parse(raw) as PresencePeer;
        if (peer.updatedAt >= cutoff) peers.push(peer);
      } catch {
        // skip bad rows
      }
    }
    return peers.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export function createPresenceSubscriber(): Redis {
  const url = process.env.VALKEY_URL ?? "redis://localhost:6379";
  return new Redis(url, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    enableOfflineQueue: false,
  });
}

export function parsePresencePeers(raw: unknown): PresencePeer[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (p): p is PresencePeer =>
      !!p &&
      typeof p === "object" &&
      typeof (p as PresencePeer).sessionId === "string" &&
      typeof (p as PresencePeer).userId === "string",
  );
}
