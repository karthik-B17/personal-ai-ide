// src/components/SessionList.tsx
import React, { useEffect } from "react";
import { useStore } from "../store";
import {
  fetchSessions,
  deleteSession,
  fetchSessionMessages,
  createSession,
} from "../api";

const SessionList: React.FC = () => {
  const {
    sessions,
    setSessions,
    currentSessionId,
    setCurrentSessionId,
    setMessages,
  } = useStore();

  useEffect(() => {
    const load = async () => {
      const data = await fetchSessions();
      setSessions(data);
    };
    load();
  }, []);

  const handleDelete = async (id: string) => {
    await deleteSession(id);
    const newSessions = sessions.filter((s) => s.id !== id);
    setSessions(newSessions);
    if (currentSessionId === id) {
      if (newSessions.length > 0) {
        setCurrentSessionId(newSessions[0].id);
        const msgs = await fetchSessionMessages(newSessions[0].id);
        setMessages(msgs);
      } else {
        setCurrentSessionId(null);
        setMessages([]);
      }
    }
  };

  const switchSession = async (id: string) => {
    setCurrentSessionId(id);
    const msgs = await fetchSessionMessages(id);
    setMessages(msgs);
  };

  const handleNewChat = async () => {
    const newSession = await createSession();
    const updatedSessions = await fetchSessions();
    setSessions(updatedSessions);
    setCurrentSessionId(newSession.id);
    setMessages([]);
  };

  if (sessions.length === 0) {
    return (
      <div className="text-ink-muted text-xs">
        No chats yet.{" "}
        <button onClick={handleNewChat} className="text-amber hover:underline">
          Start a new one!
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {sessions.map((s) => (
        <div
          key={s.id}
          className={`flex justify-between items-center p-1 rounded cursor-pointer hover:bg-raised ${
            s.id === currentSessionId ? "bg-raised text-amber" : ""
          }`}
          onClick={() => switchSession(s.id)}
        >
          <span className="text-sm truncate">{s.title}</span>
          <button
            className="text-ink-muted hover:text-red-400 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(s.id);
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default SessionList;
