// Geometria da partitura animada do MusicLoader. Tudo em pixels, multiplicado pela escala `s`
// (1 = tamanho de tela cheia). Fica separado do componente para dar para testar as contas.

// Posição de uma nota na pauta: 0 = linha de baixo, 8 = linha de cima; cada passo é meio espaçamento
// (então 1 é o espaço entre a 1ª e a 2ª linha, 2 é a 2ª linha, e assim por diante).
export const MAX_STEP = 8;

// Pulinhos da nota pelo percurso. O progresso vai de 0 (entrando) a 1 (saindo); no meio (PLAY_AT)
// ela é "tocada": acende com a cor dela e dá o pulo maior. Alturas em px com escala 1.
export const PLAY_AT = 0.5;
export const HOPS = [
  { from: 0.14, to: 0.26, height: 6 },
  { from: 0.26, to: 0.38, height: 6 },
  { from: 0.42, to: 0.58, height: 14 }, // o pulo da nota tocada, centrado no meio da pauta
  { from: 0.62, to: 0.74, height: 6 },
  { from: 0.74, to: 0.86, height: 6 },
];
export const HOP_ROOM = Math.max(...HOPS.map((hop) => hop.height));

export function staffGeometry(s: number) {
  const gap = 12 * s;
  const headW = 13 * s;
  const headH = 9 * s;
  const stemW = 2 * s;
  const stemH = 30 * s;
  const beamH = 4 * s;
  const pairGap = 20 * s;
  // Espaço no topo para os pulinhos: a nota sobe até HOP_ROOM acima do lugar dela, e a haste vai junto.
  const padTop = (8 + HOP_ROOM) * s;
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

// Pontos para interpolar a posição vertical da nota (negativo = para cima) em função do progresso.
// Cada pulo é um arco de parábola: y = -altura * 4t(1 - t), com t de 0 a 1 dentro do pulo.
export function hopKeyframes(s: number) {
  const input = [0];
  const output = [0];
  for (const hop of HOPS) {
    for (let i = 0; i <= 4; i++) {
      const t = i / 4;
      const x = hop.from + (hop.to - hop.from) * t;
      // O fim de um pulo é o começo do seguinte (mesmo ponto): não repete.
      if (x <= input[input.length - 1] + 1e-9) continue;
      input.push(x);
      output.push(-hop.height * s * 4 * t * (1 - t));
    }
  }
  input.push(1);
  output.push(0);
  return { input, output };
}
