import { NextRequest } from "next/server";
import { syncEmitter, SyncEventPayload, getCurrentRevision } from "@/lib/sync-events";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event with current revision
      const initMessage = `data: ${JSON.stringify({
        type: "connected",
        revision: getCurrentRevision(),
        timestamp: Date.now(),
      })}\n\n`;
      controller.enqueue(encoder.encode(initMessage));

      const onDataChange = (payload: SyncEventPayload) => {
        // If event is scoped to a specific user, ensure it matches or user is admin
        if (payload.userId && payload.userId !== user.id && user.role !== "ADMIN") {
          return;
        }

        try {
          const chunk = `data: ${JSON.stringify(payload)}\n\n`;
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Stream might be closed
        }
      };

      syncEmitter.on("change", onDataChange);

      // Heartbeat ping every 15 seconds to keep connection alive through proxies
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`data: {"type":"ping"}\n\n`));
        } catch {
          clearInterval(pingInterval);
        }
      }, 15000);

      // Clean up when client disconnects
      request.signal.addEventListener("abort", () => {
        clearInterval(pingInterval);
        syncEmitter.off("change", onDataChange);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform, no-store",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
