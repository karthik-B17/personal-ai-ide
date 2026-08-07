import React, { useState, useEffect } from "react";
import { fetchApiKeys, setApiKey, deleteApiKey } from "../api";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [keys, setKeys] = useState<{ provider: string; has_key: boolean }[]>(
    [],
  );
  const [newKeys, setNewKeys] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchApiKeys()
        .then((data) => {
          setKeys(data);
          // Initialize newKeys with empty strings for all providers
          const initial: Record<string, string> = {};
          data.forEach((k) => {
            initial[k.provider] = "";
          });
          setNewKeys(initial);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const handleSave = async (provider: string) => {
    const apiKey = newKeys[provider];
    if (!apiKey) return;
    try {
      await setApiKey(provider, apiKey);
      // Refresh list
      const updated = await fetchApiKeys();
      setKeys(updated);
      setNewKeys((prev) => ({ ...prev, [provider]: "" }));
    } catch (e) {
      alert(`Failed to save key: ${e}`);
    }
  };

  const handleDelete = async (provider: string) => {
    if (!confirm(`Delete API key for ${provider}?`)) return;
    try {
      await deleteApiKey(provider);
      const updated = await fetchApiKeys();
      setKeys(updated);
    } catch (e) {
      alert(`Failed to delete key: ${e}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-panel rounded-lg p-6 w-96 border border-line max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">API Keys Settings</h2>
        <p className="text-sm text-ink-muted mb-4">
          Enter your own API keys for each provider. These will be used instead
          of the default keys.
        </p>
        {loading ? (
          <div className="text-ink-muted">Loading...</div>
        ) : (
          keys.map(({ provider, has_key }) => (
            <div key={provider} className="mb-3">
              <label className="block text-sm font-medium text-ink mb-1 capitalize">
                {provider}
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  className="flex-1 bg-raised border border-line rounded px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-amber"
                  placeholder={
                    has_key ? "Change key (optional)" : "Enter API key"
                  }
                  value={newKeys[provider] || ""}
                  onChange={(e) =>
                    setNewKeys((prev) => ({
                      ...prev,
                      [provider]: e.target.value,
                    }))
                  }
                />
                <button
                  className="px-3 py-1 bg-amber text-black rounded text-sm hover:bg-amber-hover disabled:opacity-50"
                  onClick={() => handleSave(provider)}
                  disabled={!newKeys[provider]}
                >
                  Save
                </button>
                {has_key && (
                  <button
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                    onClick={() => handleDelete(provider)}
                  >
                    Delete
                  </button>
                )}
              </div>
              {has_key && (
                <p className="text-xs text-green-400 mt-1">✓ Key is set</p>
              )}
            </div>
          ))
        )}
        <div className="flex justify-end mt-4">
          <button
            className="px-4 py-2 bg-raised hover:bg-line rounded text-ink"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
