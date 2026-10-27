"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type RealtimeChangeType = "snippets" | "collections" | "tags" | "tokens" | "users" | "all";
export type SyncStatus = "connected" | "reconnecting" | "disconnected";

let globalBroadcastChannel: BroadcastChannel | null = null;

if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    globalBroadcastChannel = new BroadcastChannel("snippetvault_sync");
  } catch {
    // Channel not supported or blocked
  }
}

export function broadcastLocalChange(type: RealtimeChangeType = "snippets") {
  if (globalBroadcastChannel) {
    try {
      globalBroadcastChannel.postMessage({ type, timestamp: Date.now() });
    } catch {}
  }
}

interface UseRealtimeSyncOptions {
  onSnippetsChange?: () => void;
  onCollectionsChange?: () => void;
  enabled?: boolean;
}

export interface UseRealtimeSyncReturn {
  isLiveConnected: boolean;
  syncStatus: SyncStatus;
}

export function useRealtimeSync({
  onSnippetsChange,
  onCollectionsChange,
  enabled = true,
}: UseRealtimeSyncOptions): UseRealtimeSyncReturn {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("reconnecting");

  // Stable references for callbacks to avoid re-triggering effects
  const onSnippetsRef = useRef(onSnippetsChange);
  const onCollectionsRef = useRef(onCollectionsChange);

  useEffect(() => {
    onSnippetsRef.current = onSnippetsChange;
    onCollectionsRef.current = onCollectionsChange;
  }, [onSnippetsChange, onCollectionsChange]);

  const triggerChange = useCallback((type: RealtimeChangeType) => {
    if (type === "snippets" || type === "all") {
      onSnippetsRef.current?.();
    }
    if (type === "collections" || type === "all") {
      onCollectionsRef.current?.();
    }
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      setSyncStatus("disconnected");
      return;
    }

    let isCleanedUp = false;
    let eventSource: EventSource | null = null;
    let reconnectTimer: any = null;
    let heartbeatChecker: any = null;
    let retryCount = 0;
    let lastActivityTime = Date.now();

    // 1. Cross-tab BroadcastChannel listener
    const handleBroadcastMessage = (event: MessageEvent) => {
      const type = event.data?.type as RealtimeChangeType;
      if (type) {
        triggerChange(type);
      }
    };

    if (globalBroadcastChannel) {
      globalBroadcastChannel.addEventListener("message", handleBroadcastMessage);
    }

    // 2. Window Focus & Visibility Change revalidation
    let lastFocusTime = Date.now();
    const handleFocusOrVisible = () => {
      const now = Date.now();
      // Debounce focus checks to at least 2.5s apart
      if (now - lastFocusTime > 2500) {
        lastFocusTime = now;
        triggerChange("all");
      }
    };

    window.addEventListener("focus", handleFocusOrVisible);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        handleFocusOrVisible();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // 3. Online/Offline detection
    const handleOnline = () => {
      setSyncStatus("reconnecting");
      retryCount = 0;
      scheduleReconnect(100);
    };

    const handleOffline = () => {
      setSyncStatus("disconnected");
      if (eventSource) {
        try {
          eventSource.close();
        } catch {}
        eventSource = null;
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 4. Server-Sent Events (SSE) connection
    const scheduleReconnect = (delayMs = 3500) => {
      if (isCleanedUp || reconnectTimer) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connectSSE();
      }, delayMs);
    };

    const connectSSE = () => {
      if (isCleanedUp) return;

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setSyncStatus("disconnected");
        return;
      }

      // Cleanup existing instance before new attempt
      if (eventSource) {
        try {
          eventSource.close();
        } catch {}
        eventSource = null;
      }

      try {
        eventSource = new EventSource("/api/sync");
        lastActivityTime = Date.now();

        eventSource.onopen = () => {
          retryCount = 0;
          lastActivityTime = Date.now();
          setSyncStatus("connected");
        };

        eventSource.onmessage = (event) => {
          lastActivityTime = Date.now();
          setSyncStatus("connected");
          try {
            const data = JSON.parse(event.data);
            if (data.type && data.type !== "connected" && data.type !== "ping") {
              triggerChange(data.type);
            }
          } catch {}
        };

        eventSource.onerror = () => {
          if (eventSource) {
            try {
              eventSource.close();
            } catch {}
            eventSource = null;
          }

          retryCount += 1;

          // If offline or multiple failed retries -> disconnected (red)
          // On initial glitch or first retry -> reconnecting (yellow)
          if (typeof navigator !== "undefined" && !navigator.onLine) {
            setSyncStatus("disconnected");
          } else if (retryCount >= 2) {
            setSyncStatus("disconnected");
          } else {
            setSyncStatus("reconnecting");
          }

          scheduleReconnect(3500);
        };
      } catch (e) {
        console.warn("SSE connection error:", e);
        setSyncStatus("disconnected");
        scheduleReconnect(4000);
      }
    };

    // Initial connection attempt
    connectSSE();

    // 5. Watchdog for stale connection (SSE heartbeat timeout)
    heartbeatChecker = setInterval(() => {
      if (document.visibilityState === "visible") {
        const timeSinceActivity = Date.now() - lastActivityTime;
        // If no message or ping received for > 35s, consider connection degraded
        if (timeSinceActivity > 35000 && eventSource) {
          console.warn("Real-time sync heartbeat timeout, reconnecting...");
          setSyncStatus("reconnecting");
          try {
            eventSource.close();
          } catch {}
          eventSource = null;
          connectSSE();
        }
      }
    }, 15000);

    // 6. Background silent polling fallback every 12s if visible
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        triggerChange("snippets");
      }
    }, 12000);

    return () => {
      isCleanedUp = true;
      clearInterval(interval);
      clearInterval(heartbeatChecker);
      clearTimeout(reconnectTimer);
      window.removeEventListener("focus", handleFocusOrVisible);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (globalBroadcastChannel) {
        globalBroadcastChannel.removeEventListener("message", handleBroadcastMessage);
      }
      if (eventSource) {
        try {
          eventSource.close();
        } catch {}
      }
    };
  }, [enabled, triggerChange]);

  return {
    isLiveConnected: syncStatus === "connected",
    syncStatus,
  };
}
