import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { askAi, clearAiHistory } from "../api/ai";
import { useAuth } from "./AuthContext";

const ChatContext = createContext(null);

const WELCOME = {
  role: "assistant",
  text: "Hi! I'm your onboarding assistant. Ask me anything about company policy, benefits, IT setup, or how to use this checklist.",
  sources: [],
};

function storageKey(userId) {
  return `onboarding_chat_history:${userId ?? "anon"}`;
}

function loadFromStorage(userId) {
  try {
    const raw = sessionStorage.getItem(storageKey(userId));
    if (!raw) return [WELCOME];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : [WELCOME];
  } catch {
    return [WELCOME];
  }
}

/**
 * Holds the visible chat transcript above the router so it survives
 * navigating away from /chat and back. Also mirrors it to sessionStorage
 * (scoped per user id) so a page refresh doesn't lose it either.
 *
 * Note: this is purely a *display* convenience. The backend's own short
 * conversational memory (last ~4 messages / ~30 min window) is independent
 * of this — clearing it via "Clear chat" resets both.
 */
export function ChatProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;

  const [messages, setMessages] = useState(() => loadFromStorage(userId));
  const [sending, setSending] = useState(false);

  // Re-hydrate (or reset) the transcript whenever the logged-in user changes,
  // e.g. after logout/login as someone else.
  useEffect(() => {
    setMessages(loadFromStorage(userId));
  }, [userId]);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey(userId), JSON.stringify(messages));
    } catch {
      // sessionStorage can throw in private-browsing edge cases — safe to ignore,
      // the chat still works for the current tab session via state.
    }
  }, [messages, userId]);

  const sendMessage = useCallback(async (question) => {
    const trimmed = question.trim();
    if (!trimmed) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setSending(true);
    try {
      const { data } = await askAi(trimmed);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.answer, sources: data.sources || [] },
      ]);
    } finally {
      setSending(false);
    }
    // Errors propagate to the caller (Chat.jsx) so it can toast + append
    // a visible assistant-error bubble.
  }, []);

  const appendAssistantError = useCallback((text) => {
    setMessages((prev) => [...prev, { role: "assistant", text, sources: [] }]);
  }, []);

  const clearChat = useCallback(async () => {
    await clearAiHistory();
    setMessages([WELCOME]);
  }, []);

  const value = { messages, sending, sendMessage, appendAssistantError, clearChat };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
