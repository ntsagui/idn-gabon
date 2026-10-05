import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, View } from 'react-native';
import { Text } from '@/design/text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIdnTheme } from '@/design/theme';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { Card, ErrorNote, Row, SectionTitle } from '@/design/components/list';
import { IdnButton } from '@/design/components/idn-button';
import { IdnInput } from '@/design/components/idn-input';
import { api } from '@/lib/api';

function DeleteAccountModal({ visible, onClose, currentEmail }: { visible: boolean; onClose: () => void; currentEmail: string }) {
  const t = useIdnTheme();
  const insets = useSafeAreaInsets();
  const requestDeletion = useMutation(api.privacy.requestAccountDeletion);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (confirmEmail.trim().toLowerCase() !== currentEmail.toLowerCase()) {
      setError('Cette adresse ne correspond pas à ton compte.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await requestDeletion({ confirmEmail: confirmEmail.trim().toLowerCase() });
      Alert.alert(
        'Demande enregistrée',
        'Ton compte sera supprimé dans 30 jours. Tu peux annuler d’ici là depuis Confidentialité et données.',
      );
      setConfirmEmail('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demande impossible.');
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.bg, paddingBottom: Math.max(insets.bottom, 12) }}>
        <AppBar title="Supprimer mon compte" onBack={onClose} backIcon="close" />
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
          <Card padded style={{ backgroundColor: t.redBadge, borderColor: t.redBadge }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: t.redText }}>Action définitive après 30 jours</Text>
            <Text style={{ fontSize: 13, lineHeight: 19, color: t.ink2, marginTop: 6 }}>
              Ton identité numérique, tes cartes, ton iBoîte et tes documents seront supprimés au bout de 30 jours. Tu peux annuler pendant ce délai en te reconnectant. Le journal de sécurité est conservé 5 ans (obligation légale).
            </Text>
          </Card>
          <IdnInput
            t={t}
            label="Pour confirmer, saisis ton adresse IDN"
            hint={currentEmail}
            value={confirmEmail}
            onChangeText={setConfirmEmail}
            type="email"
            mono
            autoFocus
            error={error ?? undefined}
          />
          <IdnButton t={t} variant="danger" full onPress={submit} loading={submitting} disabled={confirmEmail.trim().toLowerCase() !== currentEmail.toLowerCase()}>
            Programmer la suppression
          </IdnButton>
          <IdnButton t={t} variant="ghost" full onPress={() => void WebBrowser.openBrowserAsync('https://identite.ga/legal/delete-account')}>
            En savoir plus sur la suppression
          </IdnButton>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function SettingsPrivacy() {
  const t = useIdnTheme();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(api.profile.getCurrentUser, isAuthenticated ? {} : 'skip');
  const deletionStatus = useQuery(api.privacy.getDeletionStatus, isAuthenticated ? {} : 'skip');
  const requestExport = useMutation(api.privacy.requestDataExport);
  const cancelDeletion = useMutation(api.privacy.cancelAccountDeletion);
  // « Supprimer mon compte » depuis le Profil ouvre directement la confirmation.
  const { action } = useLocalSearchParams<{ action?: string }>();
  const [deleteOpen, setDeleteOpen] = useState(action === 'delete');
  const [exporting, setExporting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancelDeletion() {
    setCancelling(true);
    setError(null);
    try {
      await cancelDeletion({});
      Alert.alert('Suppression annulée', 'Ton compte n’est plus programmé pour la suppression.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Annulation impossible.');
    } finally {
      setCancelling(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      await requestExport({});
      Alert.alert('Export demandé', 'Tu recevras dans ton iBoîte un e-mail avec le lien de ton archive, valable 24 h.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demande impossible.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <Screen header={<AppBar title="Confidentialité et données" onBack={() => router.back()} />}>
      <Text style={{ marginTop: 16, fontSize: 14, lineHeight: 20, color: t.muted }}>Consulte, exporte ou supprime les données de ton compte IDN.</Text>
      <SectionTitle>Tes données</SectionTitle>
      <Card>
        <Row icon="download" title="Télécharger une copie" sub="Archive envoyée par e-mail dans ton iBoîte, lien valable 24 h" chevron={!exporting} right={exporting ? <ActivityIndicator color={t.green} /> : null} onPress={exporting ? undefined : handleExport} />
        <Row icon="keyRound" title="Partages actifs" sub="Applications autorisées à lire tes informations" chevron onPress={() => router.push('/consents' as never)} />
        <Row icon="activity" title="Journal d’activité" sub="Connexions et opérations sur ton compte" chevron onPress={() => router.push('/activity')} />
      </Card>
      <ErrorNote>{error}</ErrorNote>

      <SectionTitle>Suppression du compte</SectionTitle>
      {deletionStatus ? (
        <Card padded style={{ backgroundColor: t.redBadge, borderColor: t.redBadge }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: t.redText }}>Suppression programmée</Text>
          <Text style={{ fontSize: 13, lineHeight: 19, color: t.ink2, marginTop: 4 }}>
            {`Ton compte sera supprimé dans ${deletionStatus.daysRemaining} jour${deletionStatus.daysRemaining > 1 ? 's' : ''}. Tu peux encore changer d’avis.`}
          </Text>
          <IdnButton t={t} full onPress={handleCancelDeletion} loading={cancelling} style={{ marginTop: 12 }}>Annuler la suppression</IdnButton>
        </Card>
      ) : (
        <Card padded>
          <Text style={{ fontSize: 13, lineHeight: 19, color: t.muted }}>
            Supprime définitivement ton compte IDN après un délai de réflexion de 30 jours.
          </Text>
          <IdnButton t={t} variant="dangerGhost" full onPress={() => setDeleteOpen(true)} style={{ marginTop: 12 }}>Supprimer mon compte</IdnButton>
        </Card>
      )}
      <DeleteAccountModal visible={deleteOpen} onClose={() => setDeleteOpen(false)} currentEmail={user?.email ?? ''} />
    </Screen>
  );
}
