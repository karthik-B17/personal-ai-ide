import React, { useState } from "react";
import Terminal from "./Terminal";

interface TerminalTab {
  id: string;
  name: string;
}

const TerminalManager: React.FC = () => {
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: "1", name: "Terminal 1" },
  ]);
  const [activeTabId, setActiveTabId] = useState("1");

  const addTerminal = () => {
    const newId = (tabs.length + 1).toString();
    const newTab = { id: newId, name: `Terminal ${tabs.length + 1}` };
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
  };

  const closeTerminal = (id: string) => {
    if (tabs.length === 1) {
      alert("Cannot close the last terminal.");
      return;
    }
    const newTabs = tabs.filter((t) => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[0].id);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex bg-panel border-b border-line items-center">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`flex items-center px-3 py-1 text-sm cursor-pointer border-r border-line ${
              activeTabId === tab.id
                ? "bg-base text-ink"
                : "text-ink-muted hover:bg-raised"
            }`}
            onClick={() => setActiveTabId(tab.id)}
          >
            <span>{tab.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTerminal(tab.id);
              }}
              className="ml-2 text-ink-muted hover:text-ink"
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={addTerminal}
          className="px-3 py-1 text-ink-muted hover:text-ink text-lg"
        >
          +
        </button>
      </div>
      <div className="flex-1">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            style={{
              display: activeTabId === tab.id ? "block" : "none",
              height: "100%",
            }}
          >
            <Terminal key={tab.id} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default TerminalManager;
