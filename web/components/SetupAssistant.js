"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "@/libs/i18n/LanguageProvider";

/**
 * SetupAssistant - AI-powered chat assistant for building crypto stacks
 */

// Pre-defined responses based on keywords (local AI simulation)
function getAIResponse(message, products, t) {
  const lowerMsg = message.toLowerCase();

  // Beginner questions
  if (lowerMsg.includes("beginner") || lowerMsg.includes("new to crypto") || lowerMsg.includes("getting started")) {
    const softwareWallets = products.filter(p => p.type_code?.includes("software")).slice(0, 2);
    return {
      text: t("setupAssistant.responseBeginner"),
      recommendations: softwareWallets,
    };
  }

  // Hardware wallet questions
  if (lowerMsg.includes("hardware wallet") || lowerMsg.includes("cold storage") || lowerMsg.includes("ledger") || lowerMsg.includes("trezor")) {
    const hardwareWallets = products.filter(p => p.type_code?.includes("hardware")).slice(0, 3);
    return {
      text: t("setupAssistant.responseHardware"),
      recommendations: hardwareWallets,
    };
  }

  // Amount-based recommendations
  if (lowerMsg.includes("$") || lowerMsg.includes("secure") || lowerMsg.includes("protect")) {
    const amount = parseInt(lowerMsg.match(/\d+/)?.[0] || "0");
    if (amount >= 10000) {
      const hardware = products.filter(p => p.type_code?.includes("hardware") && p.score >= 80).slice(0, 2);
      return {
        text: t("setupAssistant.responseHighAmount"),
        recommendations: hardware,
      };
    }
  }

  // DeFi questions
  if (lowerMsg.includes("defi") || lowerMsg.includes("yield") || lowerMsg.includes("staking")) {
    const defiProducts = products.filter(p => p.type_code === "defi" || p.name?.toLowerCase().includes("metamask")).slice(0, 3);
    return {
      text: t("setupAssistant.responseDefi"),
      recommendations: defiProducts,
    };
  }

  // Bitcoin-specific
  if (lowerMsg.includes("bitcoin") || lowerMsg.includes("btc")) {
    const btcWallets = products.filter(p =>
      p.name?.toLowerCase().includes("bitcoin") ||
      p.name?.toLowerCase().includes("coldcard") ||
      p.type_code?.includes("hardware")
    ).slice(0, 3);
    return {
      text: t("setupAssistant.responseBitcoin"),
      recommendations: btcWallets,
    };
  }

  // Exchange questions
  if (lowerMsg.includes("exchange") || lowerMsg.includes("trading") || lowerMsg.includes("buy")) {
    const exchanges = products.filter(p => p.type_code === "exchange").slice(0, 3);
    return {
      text: t("setupAssistant.responseExchange"),
      recommendations: exchanges,
    };
  }

  // Compare products
  if (lowerMsg.includes("compare") || lowerMsg.includes("vs") || lowerMsg.includes("versus")) {
    return {
      text: t("setupAssistant.responseCompare"),
      recommendations: [],
    };
  }

  // Default response
  const topProducts = products.filter(p => p.score >= 80).slice(0, 3);
  return {
    text: t("setupAssistant.responseDefault"),
    recommendations: topProducts,
  };
}

export default function SetupAssistant({ products, onAddProduct, isOpen, onToggle }) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState(() => [{
    role: "assistant",
    content: t("setupAssistant.initialMessage"),
  }]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate AI thinking
    setTimeout(() => {
      const response = getAIResponse(input, products, t);
      const assistantMessage = {
        role: "assistant",
        content: response.text,
        recommendations: response.recommendations,
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 800);
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
            <h3 className="font-semibold">{t("setupAssistant.title")}</h3>
            <p className="text-xs text-green-400">{t("setupAssistant.online")}</p>
          </div>
        </div>
        <button onClick={onToggle} className="btn btn-ghost btn-sm btn-circle">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
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
                      key={product.id}
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
            placeholder={t("setupAssistant.placeholder")}
            className="input input-bordered flex-1 bg-base-100"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="btn btn-primary btn-square"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-base-content/40 mt-2 text-center">
          {t("setupAssistant.disclaimer")}
        </p>
      </div>
    </div>
  );
}
