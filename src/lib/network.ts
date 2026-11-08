// O expo-network é nativo: um APK gerado antes dele não tem o módulo, e importá-lo direto
// derrubaria o app ao abrir. Aqui ele é carregado com segurança; sem ele, a conexão fica "não se sabe".
type NetworkSnapshot = { isConnected?: boolean; isInternetReachable?: boolean };

let useNetworkState: () => NetworkSnapshot = () => ({});
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useNetworkState = (require('expo-network') as typeof import('expo-network')).useNetworkState;
} catch {
  // APK sem o módulo: segue sem saber se há internet.
}

// true = com internet, false = sem internet, null = não se sabe.
export function useOnline(): boolean | null {
  const state = useNetworkState();
  return state.isInternetReachable ?? state.isConnected ?? null;
}
