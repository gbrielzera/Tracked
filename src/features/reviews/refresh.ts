import { useQueryClient } from '@tanstack/react-query';
import type { MediaKind } from '@/services/music';

// "Puxar para atualizar" das telas de detalhe: recarrega o catálogo da própria tela
// e tudo que é nosso (média, minha review, reviews das pessoas).
export function useRefreshItem(kind: MediaKind, externalId: string, refetchCatalog: () => Promise<unknown>) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      refetchCatalog(),
      queryClient.invalidateQueries({ queryKey: ['media-item', kind, externalId] }),
      queryClient.invalidateQueries({ queryKey: ['review', 'mine'] }),
      queryClient.invalidateQueries({ queryKey: ['reviews'] }),
    ]);
}
