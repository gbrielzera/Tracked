// Filtro simples de palavrões, só para reviews e comentários. Não substitui a denúncia:
// o objetivo é barrar o óbvio no envio. Para ampliar, acrescente termos à lista.
const BLOCKED = [
  'puta', 'puto', 'caralho', 'porra', 'merda', 'bosta', 'foda-se', 'fodase', 'cacete',
  'viado', 'arrombado', 'desgraca', 'otario', 'babaca', 'idiota', 'imbecil', 'cuzao',
  'buceta', 'punheta', 'vagabunda', 'vagabundo', 'fdp', 'vsf', 'pqp',
];

// Tira acentos e troca números usados como letra (m3rda, p0rra).
function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's');
}

export function containsProfanity(text: string): boolean {
  const words = normalize(text).split(/[^a-z-]+/).filter(Boolean);
  return words.some((word) => BLOCKED.includes(word));
}

export const PROFANITY_MESSAGE = 'Seu texto tem palavras que não são permitidas no Tracked. Edite e tente de novo.';
