import { create } from "zustand";

interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileNode[];
}

interface PendingDiff {
  id: string;
  path: string;
  action: "create" | "modify" | "delete";
  diff_text: string;
  new_content?: string;
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  tool_calls?: any[];
}

interface AppState {
  // Workspace
  tree: FileNode | null;
  selectedPath: string | null;
  fileContent: string | null;
  isDirty: boolean;
  workspaceRoot: string;
  // Chat
  messages: ChatMessage[];
  pendingDiffs: PendingDiff[];
  // Models
  providers: any[];
  selectedProvider: any | null;
  // Sessions
  sessions: any[];
  currentSessionId: string | null;
  // UI
  terminalVisible: boolean;

  // Actions
  setTree: (tree: FileNode) => void;
  setSelectedPath: (path: string) => void;
  setFileContent: (content: string | null) => void;
  setIsDirty: (dirty: boolean) => void;
  setWorkspaceRoot: (root: string) => void;
  addMessage: (msg: ChatMessage) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  setPendingDiffs: (diffs: PendingDiff[]) => void;
  clearPendingDiffs: () => void;
  setProviders: (providers: any[]) => void;
  setSelectedProvider: (provider: any) => void;
  setSessions: (sessions: any[]) => void;
  setCurrentSessionId: (id: string | null) => void;
  toggleTerminal: () => void;
}

export const useStore = create<AppState>((set) => ({
  tree: null,
  selectedPath: null,
  fileContent: null,
  isDirty: false,
  workspaceRoot: "",
  messages: [],
  pendingDiffs: [],
  providers: [],
  selectedProvider: null,
  sessions: [],
  currentSessionId: null,
  terminalVisible: false,

  setTree: (tree) => set({ tree }),
  setSelectedPath: (path) => set({ selectedPath: path }),
  setFileContent: (content) => set({ fileContent: content, isDirty: false }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),
  setWorkspaceRoot: (root) => set({ workspaceRoot: root }),
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  setMessages: (msgs) => set({ messages: msgs }),
  setPendingDiffs: (diffs) => set({ pendingDiffs: diffs }),
  clearPendingDiffs: () => set({ pendingDiffs: [] }),
  setProviders: (providers) => set({ providers }),
  setSelectedProvider: (provider) => set({ selectedProvider: provider }),
  setSessions: (sessions) => set({ sessions }),
  setCurrentSessionId: (id) => set({ currentSessionId: id }),
  toggleTerminal: () =>
    set((state) => ({ terminalVisible: !state.terminalVisible })),
}));
