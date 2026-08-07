const EXT_TO_LANGUAGE: Record<string, string> = {
  py: "python", js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
  json: "json", md: "markdown", css: "css", html: "html", yml: "yaml", yaml: "yaml",
  sh: "shell", sql: "sql", go: "go", rs: "rust", java: "java", rb: "ruby",
  toml: "toml", txt: "plaintext",
};

export function languageFor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_LANGUAGE[ext] ?? "plaintext";
}
