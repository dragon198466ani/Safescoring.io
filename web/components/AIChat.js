"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/libs/i18n/LanguageProvider";

/**
 * AIChat — Floating chat assistant for crypto security questions.
 * Uses the SAFE methodology context to answer user queries.
 *
 * Props:
 *   products  — Array of product objects for context
 *   isOpen    — Boolean controlling panel visibility
 *   onToggle  — Callback to toggle open/closed
 */
export default function AIChat({ products = [], isOpen, onToggle }) {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (e) => {
      e?.preventDefault();
      const text = input.trim();
      if (!text || isLoading) return;

      const userMessage = { role: "user", content: text };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);

      try {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            history: messages.slice(-10),
            context: {
              productCount: products.length,
              topProducts: products.slice(0, 5).map((p) => ({
                name: p.name,
                score: p.scores?.total,
              })),
            },
          }),
        });

        if (!response.ok) throw new Error("Failed to get response");

        const data = await response.json();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message || t("aiChat.errorGeneric") },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: t("aiChat.errorMessage"),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, products]
  );

  const clearChat = () => {
    setMessages([]);
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-content shadow-lg hover:scale-110 transition-transform flex items-center justify-center"
        title={t("aiChat.title")}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
          />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 w-80 sm:w-96 max-h-[500px] flex flex-col bg-base-200 border border-base-300 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-base-300 bg-base-300/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4 text-primary"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              />
            </svg>
          </div>
          <div>
            <span className="font-semibold text-sm">{t("aiChat.title")}</span>
            <span className="block text-[10px] text-base-content/50">
              {t("aiChat.poweredBy")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button onClick={clearChat} className="btn btn-ghost btn-xs" title={t("aiChat.newConversation")}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          )}
          <button onClick={onToggle} className="btn btn-ghost btn-xs btn-circle">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[320px]">
        {messages.length === 0 && (
          <div className="text-center text-sm text-base-content/50 py-8">
            <p className="mb-2">{t("aiChat.placeholder")}</p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {[{ key: "suggestWallet", label: t("aiChat.suggestWallet") }, { key: "suggestScore", label: t("aiChat.suggestScore") }, { key: "suggestCompare", label: t("aiChat.suggestCompare") }].map(
                (suggestion) => (
                  <button
                    key={suggestion.key}
                    onClick={() => {
                      setInput(suggestion.label);
                    }}
                    className="px-2.5 py-1 text-xs rounded-full bg-base-300 hover:bg-primary/20 hover:text-primary transition-colors"
                  >
                    {suggestion.label}
                  </button>
                )
              )}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-content"
                  : "bg-base-300 text-base-content"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-base-300 rounded-xl px-3 py-2">
              <span className="loading loading-dots loading-sm text-primary"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-3 border-t border-base-300">
        {!session && (
          <p className="text-xs text-base-content/50 text-center mb-2">
            {t("aiChat.signInPrompt")}
          </p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("aiChat.placeholder")}
            className="input input-bordered input-sm flex-1 bg-base-100"
            disabled={isLoading || !session}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || !session}
            className="btn btn-primary btn-sm btn-square"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
