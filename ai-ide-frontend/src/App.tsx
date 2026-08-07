import React, { useEffect, useState } from "react";
import TopBar from "./components/TopBar";
import LeftSidebar from "./components/LeftSidebar";
import CodeViewer from "./components/CodeViewer";
import ChatPanel from "./components/ChatPanel";
import DiffPanel from "./components/DiffPanel";
import Terminal from "./components/Terminal";
import { useStore } from "./store";
import {
  checkHealth,
  fetchModels,
  selectModel,
  fetchSessionMessages,
  fetchSessions,
} from "./api";

function App() {
  const [backendReachable, setBackendReachable] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    terminalVisible,
    toggleTerminal,
    providers,
    setProviders,
    selectedProvider,
    setSelectedProvider,
    sessions,
    setSessions,
    currentSessionId,
    setCurrentSessionId,
    setMessages,
  } = useStore();

  // Health check
  useEffect(() => {
    const ping = async () => {
      try {
        await checkHealth();
        setBackendReachable(true);
      } catch {
        setBackendReachable(false);
      }
    };
    ping();
    const interval = setInterval(ping, 5000);
    return () => clearInterval(interval);
  }, []);

  // Load models on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const data = await fetchModels();
        setProviders(data.providers);
        if (data.providers.length > 0) {
          setSelectedProvider(data.providers[0]);
        }
      } catch (e) {
        console.error("Failed to load models", e);
      }
    };
    loadModels();
  }, []);

  // Load sessions and set initial current session
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const data = await fetchSessions();
        setSessions(data);
        if (data.length > 0) {
          setCurrentSessionId(data[0].id);
        }
      } catch (e) {
        console.error("Failed to load sessions", e);
      }
    };
    loadSessions();
  }, []);

  // Load messages when current session changes
  useEffect(() => {
    if (currentSessionId) {
      fetchSessionMessages(currentSessionId)
        .then((msgs) => setMessages(msgs))
        .catch((e) => console.error("Failed to load messages", e));
    } else {
      setMessages([]);
    }
  }, [currentSessionId, setMessages]);

  // Handle model switch
  const handleModelChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [providerName, model] = e.target.value.split("|");
    if (!providerName || !model) return;
    setLoading(true);
    try {
      await selectModel(providerName, model);
      const newProvider = providers.find(
        (p) => p.name === providerName && p.model === model,
      );
      if (newProvider) setSelectedProvider(newProvider);
    } catch (err) {
      alert("Failed to switch model: " + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-base text-ink flex flex-col">
      {/* Top bar with hamburger menu and settings gear */}
      <TopBar backendReachable={backendReachable} />

      {/* Main layout with combined sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar (Workspace + Chat History) */}
        <LeftSidebar />

        {/* Code Viewer */}
        <div className="flex-1 bg-base overflow-hidden">
          <CodeViewer />
        </div>

        {/* Chat + Diffs */}
        <div className="w-96 bg-panel border-l border-line flex flex-col overflow-hidden flex-shrink-0">
          <div className="flex-1 overflow-y-auto p-2">
            <ChatPanel />
          </div>
          <div className="h-48 border-t border-line overflow-y-auto p-2">
            <DiffPanel />
          </div>
        </div>
      </div>

      {terminalVisible && (
        <div className="h-64 bg-base border-t border-line">
          <Terminal />
        </div>
      )}
    </div>
  );
}

export default App;
