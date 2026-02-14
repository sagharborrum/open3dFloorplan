/**
 * AI API key management — stored in localStorage (browser-only, never sent to server).
 */

const GEMINI_KEY = 'o3d_gemini_key';
const OPENAI_KEY = 'o3d_openai_key';

export function getGeminiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(GEMINI_KEY);
}

export function hasGeminiKey(): boolean {
  return !!getGeminiKey();
}

export function getOpenAIKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(OPENAI_KEY);
}

export function hasOpenAIKey(): boolean {
  return !!getOpenAIKey();
}

export function setOpenAIKey(key: string): void {
  localStorage.setItem(OPENAI_KEY, key);
}

export function removeOpenAIKey(): void {
  localStorage.removeItem(OPENAI_KEY);
}
