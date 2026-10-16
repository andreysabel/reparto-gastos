"use client";

import { useEffect, useRef, useState } from "react";
import {
  GROUP_EVENT_TYPES,
  type GroupEvent,
} from "@/lib/realtime/events";

export type ConnectionStatus = "connecting" | "open" | "reconnecting";

/**
 * Se suscribe al stream SSE de un grupo y llama a `onEvent` por cada
 * evento recibido. EventSource reconecta solo si la conexión se cae.
 *
 * `onEvent` se guarda en un ref para que cambiar el callback no cierre
 * y reabra la conexión en cada render.
 */
export function useGroupEvents(
  slug: string,
  onEvent: (event: GroupEvent) => void,
): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  });

  useEffect(() => {
    const source = new EventSource(
      `/api/groups/${encodeURIComponent(slug)}/events`,
    );

    const handleMessage = (message: MessageEvent<string>) => {
      try {
        onEventRef.current(JSON.parse(message.data) as GroupEvent);
      } catch (error) {
        console.error("[sse] evento inválido", error);
      }
    };

    source.addEventListener("open", () => setStatus("open"));
    source.addEventListener("error", () => setStatus("reconnecting"));
    for (const type of GROUP_EVENT_TYPES) {
      source.addEventListener(type, handleMessage);
    }

    return () => source.close();
  }, [slug]);

  return status;
}
