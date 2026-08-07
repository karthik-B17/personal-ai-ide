import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useStore } from "../store";
import { sendChat, fetchSessions } from "../api";

const ChatPanel: React.FC = () => {
  const {
    messages,
    addMessage,
    setPendingDiffs,
    currentSessionId,
    setMessages,
    setSessions,
  } = useStore();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const refreshSessions = async () => {
    try {
      const sessions = await fetchSessions();
      setSessions(sessions);
    } catch (e) {
      console.error("Failed to refresh sessions", e);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !currentSessionId) {
      console.warn("No session selected or empty input");
      return;
    }
    addMessage({ role: "user", content: input });
    setInput("");
    setLoading(true);
    try {
      const res = await sendChat(input, messages, currentSessionId);
      console.log("[ChatPanel] Full response:", res);

      addMessage({ role: "assistant", content: res.reply });

      const diffs = Array.isArray(res.pending_diffs) ? res.pending_diffs : [];
      console.log("[ChatPanel] Setting pending diffs:", diffs);
      setPendingDiffs(diffs);

      // Refresh session list to update the title
      await refreshSessions();
    } catch (e: any) {
      addMessage({ role: "assistant", content: `Error: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 ? (
          <div className="text-ink-muted text-sm">
            No messages yet. Ask for a change – e.g. "add input validation to
            the login function."
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`text-sm ${
                m.role === "user"
                  ? "text-amber bg-amber-dim p-2 rounded-lg"
                  : "text-ink p-2 rounded-lg bg-raised"
              }`}
            >
              <strong className="block text-xs text-ink-muted mb-1">
                {m.role === "user" ? "You" : "Assistant"}
              </strong>
              {m.role === "assistant" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {String(m.content)}
                </ReactMarkdown>
              ) : (
                <div className="whitespace-pre-wrap">{m.content}</div>
              )}
            </div>
          ))
        )}
        {loading && (
          <div className="text-ink-muted text-sm animate-pulse">
            Assistant is thinking...
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2 border-t border-line">
        <input
          className="flex-1 bg-raised text-sm px-3 py-1.5 rounded border border-line focus:outline-none focus:border-amber text-ink"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask for a change..."
          disabled={loading}
        />
        <button
          className="bg-amber text-base px-4 py-1.5 rounded hover:bg-amber-hover disabled:opacity-50 font-medium"
          onClick={handleSend}
          disabled={loading}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;
