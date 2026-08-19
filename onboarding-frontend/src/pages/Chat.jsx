import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { extractErrorMessage } from "../api/axios";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import ChatBubble, { TypingBubble } from "../components/ChatBubble";
import { IconSend, IconTrash, IconChat } from "../components/Icons";

export default function Chat() {
  const toast = useToast();
  const { user } = useAuth();
  const { messages, sending, sendMessage, appendAssistantError, clearChat } = useChat();

  const [input, setInput] = useState("");
  const [clearing, setClearing] = useState(false);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // If we arrived here via "Ask AI about this task" from the checklist,
  // prefill the input with the suggested question (and drop the state so
  // refreshing or navigating back doesn't re-trigger it).
  useEffect(() => {
    const prefill = location.state?.prefill;
    if (prefill) {
      setInput(prefill);
      navigate(location.pathname, { replace: true, state: null });
      // Let the textarea auto-grow to fit the prefilled text.
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) {
          el.style.height = "auto";
          el.style.height = Math.min(el.scrollHeight, 120) + "px";
          el.focus();
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // Jump to the bottom on mount (restoring a previous session) and whenever
  // new messages come in.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend(e) {
    e?.preventDefault();
    const question = input.trim();
    if (!question || sending) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      await sendMessage(question);
    } catch (err) {
      const msg = extractErrorMessage(err, "I couldn't get an answer just now.");
      appendAssistantError(`Sorry — ${msg}`);
      toast.error(msg);
    }
  }

  async function handleClear() {
    setClearing(true);
    try {
      await clearChat();
      toast.success("Conversation cleared.");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not clear the conversation."));
    } finally {
      setClearing(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInputChange(e) {
    setInput(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 16 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <h1><IconChat width={19} height={19} style={{ verticalAlign: -3, marginRight: 6 }} />AI Assistant</h1>
          <p>Answers are grounded in official onboarding documents. Chat memory covers your last few messages.</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleClear} disabled={clearing}>
          {clearing ? <span className="spinner spinner-dark" /> : <IconTrash width={14} height={14} />}
          Clear chat
        </button>
      </div>

      <div className="card card-pad chat-shell">
        <div className="chat-scroll" ref={scrollRef}>
          {messages.map((m, i) => (
            <ChatBubble key={i} role={m.role} text={m.text} sources={m.sources} userInitial={(user?.full_name || "U")[0]} />
          ))}
          {sending && <TypingBubble />}
        </div>

        <form className="chat-input-bar" onSubmit={handleSend}>
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Ask about leave policy, IT setup, benefits…"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={sending}
          />
          <button type="submit" className="btn btn-primary btn-icon" disabled={sending || !input.trim()} aria-label="Send">
            {sending ? <span className="spinner" /> : <IconSend width={16} height={16} />}
          </button>
        </form>
      </div>
    </div>
  );
}
