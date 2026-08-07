import React, { useEffect, useState } from "react";
import { useStore } from "../store";
import { applyDiff, rejectDiff } from "../api";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const DiffPanel: React.FC = () => {
  const { pendingDiffs, setPendingDiffs } = useStore();
  const [loading, setLoading] = useState(false);

  const fetchDiffs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/diffs`);
      if (res.ok) {
        const data = await res.json();
        console.log("[DiffPanel] Fetched diffs:", data);
        setPendingDiffs(data);
      }
    } catch (e) {
      console.error("[DiffPanel] Failed to fetch diffs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiffs();
    const interval = setInterval(fetchDiffs, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleApply = async (id: string) => {
    await applyDiff(id);
    setPendingDiffs(pendingDiffs.filter((d) => d.id !== id));
  };

  const handleReject = async (id: string) => {
    await rejectDiff(id);
    setPendingDiffs(pendingDiffs.filter((d) => d.id !== id));
  };

  if (pendingDiffs.length === 0) {
    return (
      <div className="text-ink-muted text-sm">
        No changes staged yet.
        <button
          onClick={fetchDiffs}
          className="ml-2 text-amber text-xs hover:underline"
          disabled={loading}
        >
          {loading ? "⏳" : "↻ Refresh"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs text-ink-muted">
          {pendingDiffs.length} change(s) staged
        </span>
        <button
          onClick={fetchDiffs}
          className="text-xs text-amber hover:underline"
          disabled={loading}
        >
          {loading ? "⏳" : "↻ Refresh"}
        </button>
      </div>
      {pendingDiffs.map((diff) => (
        <div key={diff.id} className="bg-raised p-2 rounded border border-line">
          <div className="flex justify-between items-center">
            <span className="text-sm font-mono">{diff.path}</span>
            <div className="flex gap-2">
              <button
                className="text-xs text-green-400 hover:text-green-300"
                onClick={() => handleApply(diff.id)}
              >
                Accept
              </button>
              <button
                className="text-xs text-red-400 hover:text-red-300"
                onClick={() => handleReject(diff.id)}
              >
                Reject
              </button>
            </div>
          </div>
          <pre className="text-xs text-ink-muted mt-1 whitespace-pre-wrap overflow-auto max-h-32">
            {diff.diff_text}
          </pre>
        </div>
      ))}
    </div>
  );
};

export default DiffPanel;
