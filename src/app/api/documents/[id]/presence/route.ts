import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, tenantDb } from "@/server/session";
import {
  colorForUserId,
  createPresenceSubscriber,
  listPresence,
  parsePresencePeers,
  presenceChannel,
  upsertPresence,
  type PresencePeer,
} from "@/server/presence";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const postSchema = z.object({
  sessionId: z.string().min(8).max(80),
  cursor: z
    .object({
      from: z.number().int().nonnegative(),
      to: z.number().int().nonnegative(),
    })
    .optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const document = await tenantDb(session).document.findFirst({ where: { id } });
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const peer: PresencePeer = {
    sessionId: parsed.data.sessionId,
    userId: session.userId,
    name: session.name || session.email || "User",
    email: session.email,
    color: colorForUserId(session.userId),
    cursor: parsed.data.cursor,
    updatedAt: Date.now(),
  };

  const peers = await upsertPresence(id, peer);
  return NextResponse.json({ peers });
}

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const document = await tenantDb(session).document.findFirst({ where: { id } });
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const encoder = new TextEncoder();
  const channel = presenceChannel(id);
  let subscriber: ReturnType<typeof createPresenceSubscriber> | null = null;
  let closed = false;
  let keepAlive: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      try {
        const snapshot = await listPresence(id);
        send("presence", { peers: snapshot });

        subscriber = createPresenceSubscriber();
        await subscriber.connect();
        await subscriber.subscribe(channel);

        subscriber.on("message", (_ch, message) => {
          try {
            const parsed = JSON.parse(message) as { peers?: unknown };
            send("presence", { peers: parsePresencePeers(parsed.peers) });
          } catch {
            // ignore bad messages
          }
        });

        keepAlive = setInterval(() => {
          if (closed) return;
          controller.enqueue(encoder.encode(`: ping\n\n`));
        }, 20000);

        request.signal.addEventListener("abort", () => {
          closed = true;
          if (keepAlive) clearInterval(keepAlive);
          void (async () => {
            try {
              if (subscriber) {
                await subscriber.unsubscribe(channel);
                subscriber.disconnect();
              }
            } catch {
              // ignore
            }
            try {
              controller.close();
            } catch {
              // ignore
            }
          })();
        });
      } catch {
        send("presence", { peers: [] });
        closed = true;
        controller.close();
      }
    },
    cancel() {
      closed = true;
      if (keepAlive) clearInterval(keepAlive);
      if (subscriber) {
        void subscriber.unsubscribe(channel).finally(() => {
          subscriber?.disconnect();
        });
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
