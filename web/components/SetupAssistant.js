"use client";

import { useState, useRef, useEffect } from "react";

/**
 * SetupAssistant - AI-powered chat assistant for building crypto stacks
 * Uses real OpenAI LLM via /api/ai/chat endpoint
 */

const INITIAL_MESSAGE = {
  role: "assistant",
  content: "Hi! 👋 I'm your SAFE Security Advisor, powered by AI. I can help you build a secure crypto setup based on your needs.\n\nFor example, you can ask:\n• \"I'm new to crypto, what do I need?\"\n• \"What's the best hardware wallet for Bitcoin?\"\n• \"I have $50k, how should I secure it?\"\n• \"Compare Ledger vs Trezor\"",
};

export default function SetupAssistant({ products, onAddProduct, isOpen, onToggle }) {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [usage, setUsage] = useState(null);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsTyping(true);
    setError(null);

    try {
      // Send to real AI API
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.filter((m) => m.role !== "system"),
        }),
      });

      if (res.status === 429) {
        const data = await res.json();
        setUsage(data.usage);
        setError("daily_limit");
        setIsTyping(false);
        return;
      }

      if (!res.ok) {
        throw new Error("AI service unavailable");
      }

      const data = await res.json();

      const assistantMessage = {
        role: "assistant",
        content: data.content,
        recommendations: data.recommendations || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setUsage(data.usage);
    } catch (err) {
      console.error("AI chat error:", err);
      // Fallback: use local response
      const fallbackResponse = getFallbackResponse(input, products);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: fallbackResponse.text,
          recommendations: fallbackResponse.recommendations,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 btn btn-primary btn-circle btn-lg shadow-lg z-50"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)] bg-base-200 rounded-2xl border border-base-300 shadow-2xl z-50 flex flex-col max-h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-base-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold">SAFE AI Advisor</h3>
            <p className="text-xs text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
              Powered by AI
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {usage && (
            <span className="text-xs text-base-content/40">{usage.used}/{usage.limit}</span>
          )}
          <button onClick={onToggle} className="btn btn-ghost btn-sm btn-circle">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] ${msg.role === "user" ? "order-1" : ""}`}>
              <div
                className={`p-3 rounded-2xl ${
                  msg.role === "user"
                    ? "bg-primary text-primary-content rounded-br-md"
                    : "bg-base-300 rounded-bl-md"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>

              {/* Product recommendations */}
              {msg.recommendations?.length > 0 && (
                <div className="mt-2 space-y-2">
                  {msg.recommendations.map(product => (
                    <button
                      key={product.id || product.slug}
                      onClick={() => onAddProduct(product)}
                      className="w-full flex items-center gap-2 p-2 rounded-lg bg-base-300 hover:bg-primary/20 transition-all text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-base-100 flex items-center justify-center text-xs font-bold">
                        {product.name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-base-content/50">{product.type_name}</p>
                      </div>
                      <span className={`text-sm font-bold ${
                        product.score >= 80 ? "text-green-400" :
                        product.score >= 60 ? "text-amber-400" : "text-red-400"
                      }`}>
                        {product.score}
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-primary">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Rate limit error */}
        {error === "daily_limit" && (
          <div className="text-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <p className="text-sm text-amber-400 font-medium">Daily message limit reached</p>
            <p className="text-xs text-base-content/50 mt-1">
              {usage?.used || 0}/{usage?.limit || 5} messages used today
            </p>
            <a href="/pricing" className="btn btn-primary btn-xs mt-2">Upgrade for more</a>
          </div>
        )}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-base-300 p-3 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-base-content/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-base-content/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-base-content/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-base-300">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            className="input input-bordered flex-1 bg-base-100"
            disabled={error === "daily_limit"}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping || error === "daily_limit"}
            className="btn btn-primary btn-square"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-base-content/40 mt-2 text-center">
          AI-powered by SAFE methodology &bull; {usage ? `${usage.used}/${usage.limit} msgs today` : ""}
        </p>
      </div>
    </div>
  );
}

// Fallback responses when AI API is unavailable
function getFallbackResponse(message, products) {
  const lowerMsg = message.toLowerCase();
  const topProducts = (products || []).filter((p) => p.score >= 70).slice(0, 3);

  if (lowerMsg.includes("beginner") || lowerMsg.includes("new")) {
    return { text: "For beginners, I recommend starting with a software wallet for learning, then upgrading to a hardware wallet. Here are some options:", recommendations: topProducts };
  }
  if (lowerMsg.includes("hardware") || lowerMsg.includes("cold")) {
    const hw = (products || []).filter((p) => p.type_code?.includes("hardware")).slice(0, 3);
    return { text: "Hardware wallets are the gold standard for crypto security. Top options:", recommendations: hw.length ? hw : topProducts };
  }
  return { text: "Based on SAFE scores, here are some top-rated products. Ask me more specific questions for better recommendations!", recommendations: topProducts };
}
