import { uploadToStorage } from '@/lib/storage-upload';

/**
 * Pièce jointe choisie avant l'envoi. Sur iOS/Android le fichier local est
 * envoyé depuis son URI (React Native ne construit pas de Blob à partir
 * d'octets) ; sur le web, les octets lus par le navigateur.
 */
export type PickedAttachment = { name: string; size: number; mime: string; uri?: string; bytes?: Uint8Array };

export async function uploadAttachment(uploadUrl: string, att: PickedAttachment): Promise<string> {
  if (att.uri) return uploadToStorage(uploadUrl, att.uri, att.mime);
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': att.mime },
    body: new Blob([(att.bytes ?? new Uint8Array()) as unknown as BlobPart], { type: att.mime }),
  });
  if (!res.ok) throw new Error(`Envoi de la pièce jointe impossible (${res.status}).`);
  return ((await res.json()) as { storageId: string }).storageId;
}
