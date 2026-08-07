export interface ChatMessage {
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: unknown[];
}

export interface ToolCallLog {
  name: string;
  arguments: Record<string, unknown>;
  result_summary: string;
}

export interface PendingDiff {
  id: string;
  path: string;
  action: "create" | "modify" | "delete";
  diff_text: string;
  old_content: string | null;
  new_content: string | null;
}

export interface ChatResponse {
  reply: string;
  history: ChatMessage[];
  pending_diffs: PendingDiff[];
  tool_calls: ToolCallLog[];
}

export interface DirectoryEntry {
  name: string;
  path: string;
  is_dir: boolean;
  children?: DirectoryEntry[] | null;
}

export interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallLog[];
  pending?: boolean;
}
