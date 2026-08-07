// src/components/CodeViewer.tsx
import React, { useEffect, useState } from "react";
import MonacoEditor from "@monaco-editor/react";
import { useStore } from "../store";
import { fetchFile, runFile, saveFile } from "../api";

const CodeViewer: React.FC = () => {
  const { selectedPath, fileContent, setFileContent, isDirty, setIsDirty } =
    useStore();
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedPath) {
      setFileContent(null);
      return;
    }
    const load = async () => {
      try {
        const data = await fetchFile(selectedPath);
        setFileContent(data.content);
      } catch (e) {
        console.error("Failed to load file", e);
        setFileContent("Error loading file");
      }
    };
    load();
  }, [selectedPath]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setFileContent(value);
      setIsDirty(true);
    }
  };

  const handleSave = async () => {
    if (!selectedPath || fileContent === null) return;
    setSaving(true);
    try {
      await saveFile(selectedPath, fileContent);
      setIsDirty(false);
      alert("File saved successfully");
    } catch (e: any) {
      alert(`Failed to save: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    if (!selectedPath) return;
    setRunning(true);
    try {
      const result = await runFile(selectedPath);
      if (result.error) {
        alert(`Error: ${result.error}`);
      } else {
        const output = result.stdout || result.stderr || "Done";
        alert(`Output:\n${output}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setRunning(false);
    }
  };

  const getLanguage = (path: string) => {
    const ext = path.split(".").pop();
    switch (ext) {
      case "py":
        return "python";
      case "js":
        return "javascript";
      case "ts":
        return "typescript";
      case "html":
        return "html";
      case "css":
        return "css";
      case "json":
        return "json";
      case "md":
        return "markdown";
      case "sh":
        return "shell";
      default:
        return "plaintext";
    }
  };

  if (!selectedPath) {
    return (
      <div className="flex items-center justify-center h-full text-ink-muted">
        Pick a file from the workspace to view it here.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-2 bg-panel border-b border-line">
        <span className="text-sm font-mono text-ink">
          {selectedPath}
          {isDirty && <span className="ml-2 text-amber">●</span>}
        </span>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "💾 Save"}
          </button>
          <button
            onClick={handleRun}
            disabled={running}
            className="px-3 py-1 bg-amber text-black text-sm font-medium rounded hover:bg-amber-hover disabled:opacity-50"
          >
            {running ? "Running..." : "▶ Run"}
          </button>
        </div>
      </div>
      <div className="flex-1">
        <MonacoEditor
          height="100%"
          language={getLanguage(selectedPath)}
          value={fileContent || ""}
          theme="vs-dark"
          onChange={handleEditorChange} // handle changes
          options={{
            readOnly: false,
            minimap: { enabled: false },
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
};

export default CodeViewer;
