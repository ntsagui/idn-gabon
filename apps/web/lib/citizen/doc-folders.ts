// Copie de apps/mobile/src/data/documents.ts : même logique sur web et mobile.
// À extraire dans un paquet partagé (voir apps/web/CITIZEN_REDESIGN.md).
import type { IconName } from '@/app/_components/idn/icons';

/** Dossiers iDocument : miroir de `VAULT_FOLDERS` (packages/backend/convex/schema.ts). */
export type DocFolderId =
  | 'identity' | 'civil_status' | 'residence' | 'education'
  | 'work' | 'health' | 'vehicle' | 'other';

export type DocFolder = {
  id: DocFolderId;
  label: string;
  desc: string;
  icon: IconName;
};

export const DOC_FOLDERS: DocFolder[] = [
  { id: 'identity',     label: 'Identité',  desc: 'CNI, passeport, carte de séjour', icon: 'user' },
  { id: 'civil_status', label: 'État civil', desc: 'Naissance, mariage, divorce',    icon: 'baby' },
  { id: 'residence',    label: 'Domicile',  desc: 'Justificatifs, factures',          icon: 'home' },
  { id: 'education',    label: 'Diplômes',  desc: 'Certificats, attestations',        icon: 'cap' },
  { id: 'work',         label: 'Travail',   desc: 'Contrats, bulletins',              icon: 'briefcase' },
  { id: 'health',       label: 'Santé',     desc: 'CNAMGS, ordonnances',              icon: 'heart' },
  { id: 'vehicle',      label: 'Véhicule',  desc: 'Permis, carte grise',              icon: 'car' },
  { id: 'other',        label: 'Autres',    desc: 'Documents divers',                 icon: 'folder' },
];

export function findDocFolder(id: string | undefined): DocFolder | undefined {
  return DOC_FOLDERS.find((f) => f.id === id);
}
