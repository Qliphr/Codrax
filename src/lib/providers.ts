export interface KnownProvider {
  name: string;
  cli: string;
}

export const KNOWN_PROVIDERS: KnownProvider[] = [
  { name: "Claude Code", cli: "claude" },
  { name: "Codex", cli: "codex" },
  { name: "Gemini", cli: "gemini" },
  { name: "Grok", cli: "grok" },
  { name: "Mistral", cli: "mistral" },
  { name: "Deepseek", cli: "deepseek" },
  { name: "OpenRouter", cli: "openrouter" },
  { name: "Ollama", cli: "ollama" },
  { name: "LM Studio", cli: "lmstudio" },
];
