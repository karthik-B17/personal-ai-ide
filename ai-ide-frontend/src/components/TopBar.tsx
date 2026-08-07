import React, { useState, useEffect } from "react";
import { useStore } from "../store";
import { fetchModels, selectModel } from "../api";
import SettingsModal from "./SettingsModal";

interface TopBarProps {
  backendReachable: boolean;
}

const TopBar: React.FC<TopBarProps> = ({ backendReachable }) => {
  const {
    providers,
    selectedProvider,
    setProviders,
    setSelectedProvider,
    workspaceRoot,
    terminalVisible,
    toggleTerminal,
  } = useStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const [modelsSubmenuOpen, setModelsSubmenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  const handleSelectModel = async (provider: any) => {
    try {
      await selectModel(provider.name, provider.model);
      setSelectedProvider(provider);
      setMenuOpen(false);
    } catch (e) {
      alert(`Failed to switch model: ${e}`);
    }
  };

  return (
    <>
      <header className="bg-panel border-b border-line px-4 py-2 flex justify-between items-center relative">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-ink hover:text-amber p-1"
            aria-label="Menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <h1 className="text-lg font-ui font-semibold">Personal AI IDE</h1>
          {selectedProvider && (
            <span className="text-xs text-ink-muted bg-raised px-2 py-1 rounded">
              {selectedProvider.name}: {selectedProvider.model}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span
            className={`text-sm ${backendReachable ? "text-green-400" : "text-red-400"}`}
          >
            {backendReachable ? "● Backend connected" : "● Backend unreachable"}
          </span>
          <button
            onClick={toggleTerminal}
            className="text-xs bg-raised px-3 py-1 rounded hover:bg-line"
          >
            {terminalVisible ? "Hide Terminal" : "Show Terminal"}
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-ink hover:text-amber p-1 text-lg"
            aria-label="Settings"
          >
            ⚙️
          </button>
        </div>

        {menuOpen && (
          <div className="absolute left-2 top-12 bg-raised border border-line rounded shadow-lg z-50 w-64">
            <div className="py-1">
              <div className="relative">
                <div
                  className="px-4 py-2 hover:bg-line cursor-pointer flex justify-between items-center"
                  onClick={() => setModelsSubmenuOpen(!modelsSubmenuOpen)}
                >
                  <span>Models</span>
                  <span className="text-xs">▶</span>
                </div>
                {modelsSubmenuOpen && (
                  <div className="absolute left-full top-0 ml-1 bg-raised border border-line rounded shadow-lg w-64 max-h-96 overflow-y-auto">
                    {providers.map((p) => (
                      <div
                        key={`${p.name}-${p.model}`}
                        className={`px-4 py-2 hover:bg-line cursor-pointer text-sm ${
                          selectedProvider?.name === p.name &&
                          selectedProvider?.model === p.model
                            ? "bg-amber-dim text-amber"
                            : ""
                        }`}
                        onClick={() => handleSelectModel(p)}
                      >
                        {p.name}: {p.model}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div
                className="px-4 py-2 hover:bg-line cursor-pointer"
                onClick={() => {
                  setSettingsOpen(true);
                  setMenuOpen(false);
                }}
              >
                Settings
              </div>
              <hr className="border-line" />
              <div className="px-4 py-2 text-xs text-ink-muted">
                Workspace: {workspaceRoot || "Not set"}
              </div>
            </div>
          </div>
        )}
      </header>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
};

export default TopBar;
