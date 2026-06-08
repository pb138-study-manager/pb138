export function getReadingStats(text: string): { words: number; minutes: number } {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const minutes = Math.max(1, Math.round(words / 200));
  return { words, minutes };
}
