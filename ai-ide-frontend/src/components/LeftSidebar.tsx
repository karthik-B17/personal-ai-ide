// src/components/LeftSidebar.tsx
import React from "react";
import FileTree from "./FileTree";
import SessionList from "./SessionList";
import { useStore } from "../store";
import { createSession, fetchSessions } from "../api";

const LeftSidebar: React.FC = () => {
  const { setSessions, setCurrentSessionId, setMessages } = useStore();

  const handleNewChat = async () => {
    const newSession = await createSession();
    const sessions = await fetchSessions();
    setSessions(sessions);
    setCurrentSessionId(newSession.id);
    setMessages([]);
  };

  return (
    <div className="w-64 bg-panel border-r border-line flex flex-col h-full overflow-hidden">
      {/* Workspace Files (top) */}
      <div className="flex-1 overflow-auto p-2 border-b border-line">
        <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
          WORKSPACE
        </div>
        <FileTree />
      </div>

      {/* Chat History (bottom) */}
      <div className="h-48 overflow-auto p-2 flex-shrink-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            CHAT HISTORY
          </span>
          <button
            onClick={handleNewChat}
            className="text-xs bg-amber text-black px-2 py-0.5 rounded hover:bg-amber-hover font-medium"
          >
            + New
          </button>
        </div>
        <SessionList />
      </div>
    </div>
  );
};

export default LeftSidebar;
