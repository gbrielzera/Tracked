// Geometria da partitura animada do MusicLoader. Tudo em pixels, multiplicado pela escala `s`
// (1 = tamanho de tela cheia). Fica separado do componente para dar para testar as contas.

// Posição de uma nota na pauta: 0 = linha de baixo, 8 = linha de cima; cada passo é meio espaçamento
// (então 1 é o espaço entre a 1ª e a 2ª linha, 2 é a 2ª linha, e assim por diante).
export const MAX_STEP = 8;

export function staffGeometry(s: number) {
  const gap = 12 * s;
  const headW = 13 * s;
  const headH = 9 * s;
  const stemW = 2 * s;
  const stemH = 30 * s;
  const beamH = 4 * s;
  const pairGap = 20 * s;
  const padTop = 8 * s;
  const padBottom = 10 * s;

  // y do centro da linha i (0 = linha de cima, 4 = linha de baixo)
  const lineY = (i: number) => padTop + i * gap;
  // y do centro da cabeça de uma nota
  const headY = (step: number) => padTop + 4 * gap - (step * gap) / 2;

  return {
    gap, headW, headH, stemW, stemH, beamH, pairGap,
    height: padTop + 4 * gap + padBottom,
    noteWidth: pairGap + headW,
    lineY,
    headY,
  };
}

// Pela convenção, a haste sobe nas notas abaixo da linha do meio e desce nas de cima.
export const stemsUp = (steps: number[]) => steps.reduce((sum, step) => sum + step, 0) / steps.length < MAX_STEP / 2;
