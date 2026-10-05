/**
 * Affichage du NIP (14 caractères alphanumériques) : groupes 4-4-4-2 pour
 * la lecture à voix haute, et version masquée qui ne laisse voir que les
 * six derniers caractères (prototype : « •••• •••• 0045 87 »).
 */
function compact(nip: string): string {
  return nip.replace(/\s+/g, '').toUpperCase();
}

export function formatNip(nip: string): string {
  return compact(nip).match(/.{1,4}/g)?.join(' ') ?? '';
}

export function maskNip(nip: string): string {
  const c = compact(nip);
  if (c.length <= 6) return '•'.repeat(c.length);
  const groups = formatNip(c).split(' ');
  let hidden = c.length - 6;
  return groups
    .map((g) => {
      const n = Math.min(hidden, g.length);
      hidden -= n;
      return '•'.repeat(n) + g.slice(n);
    })
    .join(' ');
}
