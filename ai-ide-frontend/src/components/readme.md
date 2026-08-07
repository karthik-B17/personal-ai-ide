# Frontend Components (`/src/components`)

This directory contains all the React components that make up the IDE's user interface. Each component has a single responsibility and communicates with the backend via the `api.ts` module.

## 📂 Component List & Purpose

| Component | Purpose |
|-----------|---------|
| **`ChatPanel.tsx`** | Main chat interface. Displays messages, handles user input, sends messages to the backend, and updates the store with responses. Renders assistant replies with markdown. |
| **`CodeViewer.tsx`** | Monaco-based code editor. Displays the selected file, allows inline editing, and provides **Save** and **Run** buttons. Tracks dirty state (unsaved changes). |
| **`DiffPanel.tsx`** | Displays pending file diffs staged by the agent. Each diff shows the changes (unified diff format) with **Accept** and **Reject** buttons. Polls the backend every 3 seconds for updates. |
| **`FileTree.tsx`** | Renders the workspace file tree. Supports right-click context menu for **New File**, **New Folder**, **Rename**, and **Delete**. Clicking a file opens it in the `CodeViewer`. |
| **`LeftSidebar.tsx`** | Combines `FileTree` (top) and `SessionList` (bottom) into a single sidebar panel. Also contains the **+ New** button for creating chat sessions. |
| **`SessionList.tsx`** | Displays all chat sessions from the database. Clicking a session loads its messages. Each session has a delete (✕) button. |
| **`SettingsModal.tsx`** | Modal for managing API keys. Allows users to enter, save, and delete keys for Groq, Gemini, and Hugging Face. Keys are stored in the backend SQLite database. |
| **`Terminal.tsx`** | Single terminal instance using xterm.js. Connects to the backend via WebSocket and provides an interactive shell (PowerShell on Windows, bash on Linux/macOS). |
| **`TerminalManager.tsx`** | Manages multiple terminal tabs (like VS Code). Each tab is a separate `Terminal` instance with its own WebSocket connection. Supports adding (+) and closing (×) terminals. |
| **`TopBar.tsx`** | Main navigation bar. Contains the hamburger menu (with Models and Settings), backend connectivity indicator, terminal toggle, and gear icon for opening the Settings modal. |

## 🔧 How to Modify

- **Add a new UI feature** → create a new component in this folder and import it into `App.tsx`.
- **Change component behaviour** → edit the component file; most components use `useStore()` from `../store` for state.
- **Update styling** → Tailwind classes are used; add custom styles to `../index.css` if needed.
- **Add a new API call** → define it in `../api.ts` and import it into the component.

## 📌 Dependencies

- **State Management**: Zustand (`../store.ts`)
- **API Calls**: `../api.ts`
- **Styling**: Tailwind CSS (`../index.css`)
- **UI Components**: 
  - `@monaco-editor/react` for `CodeViewer`
  - `@xterm/xterm` + `@xterm/addon-fit` for `Terminal`
  - `react-markdown` + `remark-gfm` for markdown rendering in `ChatPanel`
