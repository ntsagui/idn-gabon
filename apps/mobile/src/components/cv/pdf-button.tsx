import React, { useState } from 'react';
import { Alert, Linking } from 'react-native';
import { useAction } from 'convex/react';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

import { api } from '@/lib/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { useIdnTheme } from '@/design/theme';
import { IconButton } from '@/design/components/app-bar';

function pdfError(e: unknown) {
  const msg = (e as Error).message ?? '';
  Alert.alert(
    'PDF indisponible',
    msg.includes('cvExport') || msg.includes('RATE_LIMIT')
      ? 'Tu as atteint la limite d’exports pour aujourd’hui. Réessaie demain.'
      : 'La génération du PDF a échoué. Réessaie dans un instant.',
  );
}

function safeFileName(name: string | undefined) {
  const base = (name ?? 'CV').replace(/[^\p{L}\p{N} _-]+/gu, '').trim().replace(/\s+/g, '-');
  return `${base || 'CV'}.pdf`;
}

/**
 * Export PDF du CV via `cv.export.renderPdf` (URL signée du stockage Convex).
 * - `open` : ouvre le PDF dans le lecteur du système ;
 * - `share` : télécharge le PDF dans le cache puis ouvre la feuille de partage
 *   du système (messagerie, e-mail, Fichiers…). Il n'existe pas de lien public
 *   de CV côté backend : on partage le document lui-même.
 */
export function useCvPdf(cvId: Id<'citizenCv'> | null | undefined, fileName?: string) {
  const renderPdf = useAction(api.cv.export.renderPdf);
  const [pending, setPending] = useState<'open' | 'share' | null>(null);

  async function run(mode: 'open' | 'share') {
    if (!cvId || pending) return;
    setPending(mode);
    try {
      const { url } = await renderPdf({ cvId });
      if (mode === 'share' && (await Sharing.isAvailableAsync())) {
        const file = await File.downloadFileAsync(url, new File(Paths.cache, safeFileName(fileName)), { idempotent: true });
        await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Partager mon CV' });
        return;
      }
      if (!(await Linking.canOpenURL(url))) {
        Alert.alert('PDF indisponible', 'Impossible d’ouvrir le PDF sur cet appareil.');
        return;
      }
      await Linking.openURL(url);
    } catch (e) {
      pdfError(e);
    } finally {
      setPending(null);
    }
  }

  return { pending, open: () => run('open'), share: () => run('share') };
}

/** Bouton icône « Ouvrir le PDF » pour la barre d'application. */
export function PdfButton({ cvId, fileName }: { cvId: Id<'citizenCv'>; fileName?: string }) {
  const t = useIdnTheme();
  const { pending, open } = useCvPdf(cvId, fileName);
  return (
    <IconButton
      icon={pending ? 'clock' : 'download'}
      label={pending ? 'Préparation du PDF' : 'Ouvrir le PDF'}
      onPress={open}
      color={pending ? t.muted : t.ink}
    />
  );
}
