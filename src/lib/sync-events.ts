import { EventEmitter } from "events";

export type SyncEventType =
  | "snippets"
  | "collections"
  | "tags"
  | "tokens"
  | "users"
  | "all";

export interface SyncEventPayload {
  type: SyncEventType;
  userId?: string | null;
  action?: "created" | "updated" | "deleted" | "reassigned";
  timestamp: number;
  revision: number;
}

// Preserve EventEmitter and revision across hot reloads in Node runtime
const globalForSync = globalThis as unknown as {
  syncEmitter?: EventEmitter;
  syncRevision?: number;
};

export const syncEmitter: EventEmitter =
  globalForSync.syncEmitter || new EventEmitter();
syncEmitter.setMaxListeners(200);

if (process.env.NODE_ENV !== "production") {
  globalForSync.syncEmitter = syncEmitter;
}

let currentRevision = globalForSync.syncRevision || 1;

export function notifyDataChange(
  type: SyncEventType,
  details?: {
    userId?: string | null;
    action?: "created" | "updated" | "deleted" | "reassigned";
  }
) {
  currentRevision += 1;
  globalForSync.syncRevision = currentRevision;

  const payload: SyncEventPayload = {
    type,
    userId: details?.userId,
    action: details?.action || "updated",
    timestamp: Date.now(),
    revision: currentRevision,
  };

  syncEmitter.emit("change", payload);
}

export function getCurrentRevision(): number {
  return currentRevision;
}
