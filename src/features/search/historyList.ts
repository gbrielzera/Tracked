export const MAX_HISTORY = 10;

// Mais recente primeiro, sem repetir (ignora maiúsculas/minúsculas), no máximo MAX_HISTORY.
export function pushHistory(items: string[], term: string): string[] {
  const value = term.trim();
  if (value.length < 2) return items;
  return [value, ...items.filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, MAX_HISTORY);
}
