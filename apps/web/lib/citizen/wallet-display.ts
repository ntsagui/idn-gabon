// Copie de apps/mobile/src/lib/wallet-display.ts : même logique sur web et mobile.
// À extraire dans un paquet partagé (voir apps/web/CITIZEN_REDESIGN.md).
/**
 * Affichage des champs libres d'une carte iCarte (`walletCard.data`) :
 * numéro masqué sauf les 4 derniers caractères, validité ou expiration.
 */
export function cardNumberLabel(data: Record<string, string> | undefined): string | null {
  const raw = data?.numero?.trim();
  if (!raw) return null;
  // Déjà masqué à la saisie (« •••• 1234 ») : affiché tel quel.
  if (raw.includes('•')) return raw;
  const compact = raw.replace(/\s+/g, '');
  if (compact.length <= 4) return compact;
  return `•••• ${compact.slice(-4)}`;
}

export function cardValidity(data: Record<string, string> | undefined): string | null {
  return data?.validite?.trim() || data?.expiration?.trim() || null;
}
