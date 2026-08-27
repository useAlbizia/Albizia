"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { chatAction } from "@/lib/chat";
import type { ChatMessage } from "@/lib/ai";

const GREETING =
  "Olá! Sou a assistente da ALBIZIA. Posso ajudar a escolher uma peça, tirar dúvidas de tamanho, frete ou trocas. Como posso ajudar?";

// Turns /produto/... and /colecoes/... paths inside the reply into clickable links.
function renderText(text: string, onNavigate: () => void) {
  const parts = text.split(/(\/(?:produto|colecoes)\/[a-z0-9-]+)/gi);
  return parts.map((p, i) =>
    /^\/(?:produto|colecoes)\/[a-z0-9-]+$/i.test(p) ? (
      <Link key={i} href={p} onClick={onNavigate} className="underline underline-offset-2 hover:opacity-80">
        {p}
      </Link>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending, open]);

  if (pathname?.startsWith("/admin")) return null;

  async function send() {
    const text = input.trim();
    if (!text || pending) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setPending(true);
    try {
      const r = await chatAction(next);
      const reply = "text" in r ? r.text : r.error;
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Tive um problema agora. Tente novamente." }]);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fechar atendimento" : "Falar com a ALBIZIA"}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-content text-surface shadow-lg transition-transform hover:scale-105"
      >
        {open ? (
          <span className="text-lg">✕</span>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.8A8 8 0 1 1 21 12z" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-5 z-40 flex h-[70vh] max-h-[520px] w-[calc(100vw-2.5rem)] max-w-sm flex-col border border-content/15 bg-surface shadow-2xl"
          >
            <div className="border-b border-content/10 px-5 py-4">
              <p className="text-[13px] uppercase tracking-[0.25em]">Atendimento</p>
              <p className="text-[11px] text-content/40">Assistente ALBIZIA · IA</p>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] whitespace-pre-line px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      m.role === "user"
                        ? "bg-content text-surface"
                        : "border border-content/10 bg-surface-soft text-content/80"
                    }`}
                  >
                    {m.role === "assistant" ? renderText(m.content, () => setOpen(false)) : m.content}
                  </div>
                </div>
              ))}
              {pending && (
                <div className="flex justify-start">
                  <div className="border border-content/10 bg-surface-soft px-3.5 py-2.5 text-[13px] text-content/40">
                    digitando…
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 border-t border-content/10 p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Escreva sua mensagem..."
                className="flex-1 border border-content/30 bg-transparent px-3 py-2 text-sm outline-none focus:border-content"
              />
              <button
                onClick={send}
                disabled={pending || !input.trim()}
                className="border border-content px-4 text-[12px] uppercase tracking-[0.15em] transition-colors hover:bg-content hover:text-surface disabled:opacity-40"
              >
                Enviar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
