const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

// "2001-03-12" -> "12 de março de 2001"
export function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return `${day} de ${MONTHS[month - 1]} de ${year}`;
}

// 226 -> "3:46"; 3662 -> "1 h 01 min"
export function formatDuration(totalSeconds: number | null | undefined) {
  if (!totalSeconds || totalSeconds <= 0) return null;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours} h ${String(minutes).padStart(2, '0')} min`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// 4112627 -> "4,1 mi"
export function formatCount(value: number | null | undefined) {
  if (value == null) return null;
  const compact = (n: number, suffix: string) => `${n.toFixed(1).replace('.', ',').replace(',0', '')} ${suffix}`;
  if (value >= 1_000_000) return compact(value / 1_000_000, 'mi');
  if (value >= 1_000) return compact(value / 1_000, 'mil');
  return String(value);
}

// "há 3 dias"
export function formatRelative(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return '';
  const diffSeconds = Math.max(0, Math.floor((now - Date.parse(iso)) / 1000));
  const units: [number, string, string][] = [
    [31536000, 'ano', 'anos'],
    [2592000, 'mês', 'meses'],
    [86400, 'dia', 'dias'],
    [3600, 'hora', 'horas'],
    [60, 'minuto', 'minutos'],
  ];
  for (const [size, singular, plural] of units) {
    const amount = Math.floor(diffSeconds / size);
    if (amount >= 1) return `há ${amount} ${amount === 1 ? singular : plural}`;
  }
  return 'agora';
}

export function formatRating(value: number | null | undefined) {
  if (value == null) return '–';
  return value.toFixed(1).replace('.', ',');
}
