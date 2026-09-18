"use client";

import { MessageSquareText, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { MessageComposer } from "@/components/portal/message-composer";

type ChatMessage = {
  id: string;
  body: string;
  visibility: string;
  createdAt: string;
  sender: { id: string; name: string; role: string };
};

export function MatterChat({
  matterId,
  currentUserId,
  initialMessages,
  internalScope = "none",
}: {
  matterId: string;
  currentUserId: string;
  initialMessages: ChatMessage[];
  internalScope?: "none" | "staff" | "partner";
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(
    async (quiet = false) => {
      if (!quiet) setRefreshing(true);
      try {
        const response = await fetch(
          `/api/portal/asuntos/${matterId}/mensajes?limit=100`,
          { cache: "no-store" },
        );
        const payload = (await response.json()) as {
          data?: ChatMessage[];
          message?: string;
        };
        if (!response.ok) throw new Error(payload.message);
        setMessages(payload.data ?? []);
        setConnectionMessage("");
      } catch {
        if (!quiet)
          setConnectionMessage("No fue posible actualizar la conversación.");
      } finally {
        if (!quiet) setRefreshing(false);
      }
    },
    [matterId],
  );

  useEffect(() => {
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh(true);
    }, 3000);
    const focus = () => void refresh(true);
    window.addEventListener("focus", focus);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener("focus", focus);
    };
  }, [refresh]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <MessageSquareText
            className="size-4 text-paper-muted"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-semibold text-white/75">
              Conversación privada
            </p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-emerald-200/45">
              Actualización automática cada 3 segundos
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          className="grid size-9 place-items-center rounded-full border border-white/10 text-white/45 hover:text-white"
          aria-label="Actualizar conversación"
        >
          <RefreshCw
            className={`size-3.5 ${refreshing ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>
      <div
        className="max-h-[32rem] min-h-72 space-y-4 overflow-y-auto p-5 sm:p-6"
        aria-live="polite"
      >
        {messages.length ? (
          messages.map((message) => {
            const own = message.sender.id === currentUserId;
            const internal = !["CLIENT", "CLIENT_VISIBLE"].includes(
              message.visibility,
            );
            return (
              <article
                key={message.id}
                className={`flex ${own ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] sm:max-w-[72%] ${own ? "text-right" : ""}`}
                >
                  <div
                    className={`mb-1 flex flex-wrap gap-2 text-[9px] text-white/30 ${own ? "justify-end" : ""}`}
                  >
                    <span>{own ? "Tú" : message.sender.name}</span>
                    <time dateTime={message.createdAt}>
                      {new Intl.DateTimeFormat("es-MX", {
                        dateStyle: "short",
                        timeStyle: "short",
                        timeZone: "America/Mexico_City",
                      }).format(new Date(message.createdAt))}
                    </time>
                  </div>
                  <p
                    className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-left text-sm leading-6 ${
                      own
                        ? "rounded-br-sm bg-white text-black"
                        : "rounded-bl-sm bg-white/[0.07] text-white/70"
                    }`}
                  >
                    {message.body}
                  </p>
                  {internal ? (
                    <span className="mt-1 block text-[8px] uppercase tracking-[0.14em] text-amber-100/45">
                      {message.visibility === "INTERNAL_ONLY"
                        ? "Reservado"
                        : "Interno"}
                    </span>
                  ) : null}
                </div>
              </article>
            );
          })
        ) : (
          <p className="grid min-h-64 place-items-center text-sm text-white/35">
            Inicia la conversación sobre este asunto.
          </p>
        )}
        <div ref={endRef} />
      </div>
      {connectionMessage ? (
        <p className="px-5 pb-2 text-xs text-amber-100/60" role="status">
          {connectionMessage}
        </p>
      ) : null}
      <MessageComposer
        matterId={matterId}
        internalScope={internalScope}
        onSent={() => void refresh(true)}
      />
    </div>
  );
}
