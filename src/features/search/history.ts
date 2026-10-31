import { useCallback, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { pushHistory } from './historyList';

// Histórico fica no aparelho (não na conta). Usa o SecureStore, que já vem no app:
// um armazenamento novo exigiria gerar outro APK.
const KEY = 'tracked.search-history';

async function read(): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

async function write(items: string[]) {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(items));
  } catch {
    // histórico é um conforto: se não salvar, a busca segue funcionando
  }
}

export function useSearchHistory() {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    void read().then((saved) => active && setItems(saved));
    return () => {
      active = false;
    };
  }, []);

  const update = useCallback((change: (current: string[]) => string[]) => {
    setItems((current) => {
      const next = change(current);
      void write(next);
      return next;
    });
  }, []);

  const add = useCallback((term: string) => update((current) => pushHistory(current, term)), [update]);
  const remove = useCallback(
    (term: string) => update((current) => current.filter((item) => item !== term)),
    [update],
  );
  const clear = useCallback(() => update(() => []), [update]);

  return { items, add, remove, clear };
}
