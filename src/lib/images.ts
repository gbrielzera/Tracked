// As imagens do Deezer trazem o tamanho no endereço (".../250x250-000000-80-0-0.jpg").
// Troca pelo tamanho pedido; endereços de outro formato voltam como estão.
export function deezerImageAt(url: string | null | undefined, size: number): string | null {
  if (!url) return null;
  return url.replace(/\/(\d+)x\1-(\d{6}-\d+-\d+-\d+\.(?:jpg|png))$/, `/${size}x${size}-$2`);
}
