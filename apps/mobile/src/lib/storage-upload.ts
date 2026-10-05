import type { Id } from '@repo/backend/convex/_generated/dataModel';

/**
 * Envoie un fichier local (photo, PDF) vers une URL d'upload Convex Storage
 * et renvoie l'identifiant de stockage à rattacher par mutation.
 */
export async function uploadToStorage(uploadUrl: string, uri: string, mimeType: string): Promise<Id<'_storage'>> {
  const blob = await (await fetch(uri)).blob();
  const res = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': mimeType }, body: blob });
  if (!res.ok) throw new Error('Envoi du fichier impossible. Vérifie ta connexion et réessaie.');
  const { storageId } = (await res.json()) as { storageId: string };
  return storageId as Id<'_storage'>;
}
