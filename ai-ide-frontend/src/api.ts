// src/api.ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

// ----- Health & Workspace -----
export const checkHealth = () => request<{ status: string }>("/health");
export const fetchTree = () => request<any>("/workspace/tree");
export const fetchFile = (path: string) =>
  request<{ path: string; content: string }>(
    `/workspace/file?path=${encodeURIComponent(path)}`,
  );

// ----- Workspace operations (context menu) -----
export const createFolder = (path: string) =>
  request("/workspace/mkdir", {
    method: "POST",
    body: JSON.stringify({ path }),
  });
export const createFile = (path: string) =>
  request("/workspace/touch", {
    method: "POST",
    body: JSON.stringify({ path }),
  });
export const renameItem = (oldPath: string, newPath: string) =>
  request("/workspace/rename", {
    method: "PATCH",
    body: JSON.stringify({ old_path: oldPath, new_path: newPath }),
  });
export const deleteItem = (path: string) =>
  request("/workspace/delete", {
    method: "DELETE",
    body: JSON.stringify({ path }),
  });

// ----- Run file -----
export const runFile = (path: string) =>
  request<{
    success: boolean;
    stdout?: string;
    stderr?: string;
    error?: string;
  }>("/workspace/run", { method: "POST", body: JSON.stringify({ path }) });

// ----- Chat & Diffs -----
export const sendChat = (message: string, history: any[], sessionId: string) =>
  request<any>("/chat", {
    method: "POST",
    body: JSON.stringify({ message, history, session_id: sessionId }),
  });
export const applyDiff = (diffId: string) =>
  request<any>("/diffs/apply", {
    method: "POST",
    body: JSON.stringify({ diff_id: diffId }),
  });
export const rejectDiff = (diffId: string) =>
  request<any>("/diffs/reject", {
    method: "POST",
    body: JSON.stringify({ diff_id: diffId }),
  });

// ----- Models & Provider -----
export const fetchModels = () => request<{ providers: any[] }>("/models");
export const selectModel = (providerName: string, model: string) =>
  request<any>("/models/select", {
    method: "POST",
    body: JSON.stringify({ provider_name: providerName, model }),
  });

// ----- Workspace root -----
export const setWorkspaceRoot = (path: string) =>
  request<any>("/workspace/set-root", {
    method: "POST",
    body: JSON.stringify({ path }),
  });

// ----- Save file (editable) -----
export const saveFile = (path: string, content: string) =>
  request<any>("/workspace/save", {
    method: "POST",
    body: JSON.stringify({ path, content }),
  });

// ----- Sessions -----
export const fetchSessions = () => request<any[]>("/sessions");
export const createSession = () =>
  request<{ id: string; title: string }>("/sessions", { method: "POST" });
export const deleteSession = (id: string) =>
  request("/sessions/" + id, { method: "DELETE" });
export const renameSession = (id: string, title: string) =>
  request("/sessions/" + id, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
export const fetchSessionMessages = (id: string) =>
  request<any[]>("/sessions/" + id + "/messages");

// ----- API Keys (new) -----
export const fetchApiKeys = () =>
  request<{ provider: string; has_key: boolean }[]>("/api-keys");
export const setApiKey = (provider: string, apiKey: string) =>
  request<any>("/api-keys", {
    method: "POST",
    body: JSON.stringify({ provider, api_key: apiKey }),
  });
export const deleteApiKey = (provider: string) =>
  request<any>(`/api-keys/${provider}`, { method: "DELETE" });

// ----- WebSocket terminal -----
export const getTerminalWebSocketUrl = () => {
  const wsBase = BASE_URL.replace(/^http/, "ws");
  return `${wsBase}/terminal/ws`;
};
