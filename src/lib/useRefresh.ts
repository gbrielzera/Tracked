import { useCallback, useState } from 'react';

// Estado do "puxar para atualizar": o indicador gira até a tarefa terminar, mesmo que falhe.
export function useRefresh(task: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await task();
    } catch {
      // cada tela já mostra o próprio erro; aqui só encerramos o indicador
    } finally {
      setRefreshing(false);
    }
  }, [task]);

  return { refreshing, onRefresh };
}
