import React, { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { Text } from '@/design/text';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from 'convex/react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIdnTheme } from '@/design/theme';
import { idnTokens } from '@/design/tokens';
import { NSheetHeader } from '@/components/chrome/sheet-header';
import { IdnButton } from '@/design/components/idn-button';
import { IdnInput } from '@/design/components/idn-input';
import { IdnDateInput } from '@/design/components/idn-date-input';
import { Icon } from '@/design/icons';
import { CardArtIcon } from '@/components/cards/card-art-icon';
import { CARD_GRADIENTS, CARD_TEMPLATES, type GradKey } from '@/data/cards';
import type { IconName } from '@/design/icons';
import { api } from '@/lib/api';
import { gradKeyToGradient } from '@/lib/wallet-adapter';

type FieldSpec = { key: string; label: string; placeholder?: string; type?: 'date' };
type TemplateSpec = {
  type: 'cni' | 'driving' | 'transport' | 'health' | 'bank' | 'business';
  defaultName: string;
  defaultSubtitle: string;
  grad: GradKey;
  icon: IconName;
  isOfficialStyle: boolean;
  data: FieldSpec[];
  backData: FieldSpec[];
};

const TEMPLATES: Record<TemplateSpec['type'], TemplateSpec> = {
  cni: {
    type: 'cni',
    defaultName: "Carte d'Identité",
    defaultSubtitle: 'République Gabonaise',
    grad: 'green',
    icon: 'seal',
    isOfficialStyle: false,
    data: [
      { key: 'nom', label: 'Nom complet', placeholder: 'DUPONT Jean' },
      { key: 'numero', label: 'Numéro CNI', placeholder: 'GA-XXXX-XXXX' },
      { key: 'validite', label: 'Validité', placeholder: 'MM/AAAA' },
    ],
    backData: [
      { key: 'naissance', label: 'Date de naissance', type: 'date' },
      { key: 'lieu', label: 'Lieu de naissance' },
    ],
  },
  driving: {
    type: 'driving',
    defaultName: 'Permis de Conduire',
    defaultSubtitle: 'Catégories',
    grad: 'orange',
    icon: 'car',
    isOfficialStyle: false,
    data: [
      { key: 'nom', label: 'Nom complet' },
      { key: 'numero', label: 'Numéro de permis' },
      { key: 'categories', label: 'Catégories', placeholder: 'A, B, C' },
    ],
    backData: [
      { key: 'delivrance', label: 'Date de délivrance', type: 'date' },
      { key: 'prefecture', label: 'Préfecture' },
    ],
  },
  transport: {
    type: 'transport',
    defaultName: 'Carte Transport',
    defaultSubtitle: 'STLG Libreville',
    grad: 'blue',
    icon: 'bus',
    isOfficialStyle: false,
    data: [
      { key: 'numero', label: 'Numéro de carte' },
      { key: 'zone', label: 'Zone', placeholder: 'Toutes zones' },
      { key: 'validite', label: 'Validité', placeholder: 'MM/AAAA' },
    ],
    backData: [
      { key: 'type', label: 'Type abonnement' },
      { key: 'solde', label: 'Solde' },
    ],
  },
  health: {
    type: 'health',
    defaultName: 'CNAMGS',
    defaultSubtitle: 'Assurance Maladie',
    grad: 'rose',
    icon: 'heart',
    isOfficialStyle: true,
    data: [
      { key: 'regime', label: 'Régime' },
      { key: 'numero', label: 'Numéro assuré' },
      { key: 'validite', label: 'Validité' },
    ],
    backData: [
      { key: 'employeur', label: 'Employeur' },
      { key: 'couverture', label: 'Couverture' },
    ],
  },
  bank: {
    type: 'bank',
    defaultName: 'Carte Bancaire',
    defaultSubtitle: '',
    grad: 'black',
    icon: 'cc',
    isOfficialStyle: false,
    data: [
      { key: 'titulaire', label: 'Titulaire' },
      { key: 'numero', label: 'Numéro (masqué)', placeholder: '•••• •••• •••• 1234' },
      { key: 'expiration', label: 'Expiration', placeholder: 'MM/AA' },
    ],
    backData: [],
  },
  business: {
    type: 'business',
    defaultName: 'Carte de Visite',
    defaultSubtitle: '',
    grad: 'purple',
    icon: 'briefcase',
    isOfficialStyle: false,
    data: [
      { key: 'titre', label: 'Titre' },
      { key: 'entreprise', label: 'Entreprise' },
    ],
    backData: [
      { key: 'email', label: 'Email' },
      { key: 'tel', label: 'Téléphone' },
      { key: 'site', label: 'Site web' },
    ],
  },
};

export default function ICarteAddForm() {
  const t = useIdnTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ template?: string }>();
  const createCard = useMutation(api.wallet.create);

  const templateId = (params.template as TemplateSpec['type']) || 'driving';
  const tpl = TEMPLATES[templateId] ?? TEMPLATES.driving;
  const tplVisual = useMemo(() => CARD_TEMPLATES.find((c) => c.id === templateId), [templateId]);

  const [name, setName] = useState(tpl.defaultName);
  const [subtitle, setSubtitle] = useState(tpl.defaultSubtitle);
  const [data, setData] = useState<Record<string, string>>(() =>
    Object.fromEntries(tpl.data.map((f) => [f.key, ''])),
  );
  const [backData, setBackData] = useState<Record<string, string>>(() =>
    Object.fromEntries(tpl.backData.map((f) => [f.key, ''])),
  );
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (submitting) return;
    if (!name.trim()) {
      Alert.alert('Nom requis', 'Donne un nom à ta carte.');
      return;
    }
    setSubmitting(true);
    try {
      await createCard({
        type: tpl.type,
        name: name.trim(),
        subtitle: subtitle.trim() || undefined,
        gradient: gradKeyToGradient(tpl.grad),
        iconKey: tpl.icon,
        isOfficialStyle: tpl.isOfficialStyle,
        data,
        backData: tpl.backData.length > 0 ? backData : undefined,
      });
      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Création impossible.';
      Alert.alert('Erreur', msg);
      setSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <NSheetHeader t={t} title="Ajouter une carte" onBack={() => router.back()} />
      <KeyboardAwareScrollView
        contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 20, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 12, marginBottom: 18 }}>
          <View style={{ width: 56, height: 36, borderRadius: 6, overflow: 'hidden' }}>
            <LinearGradient colors={CARD_GRADIENTS[tpl.grad] as unknown as readonly [string, string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <CardArtIcon name={tpl.icon} color="#fff" size={18} />
            </LinearGradient>
          </View>
          <View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: t.ink }}>{tplVisual?.label ?? tpl.defaultName}</Text>
            <Text style={{ fontSize: 11, color: t.muted }}>Type sélectionné</Text>
          </View>
        </View>
        <View style={{ gap: 14 }}>
          <IdnInput t={t} label="Nom de la carte" value={name} onChangeText={setName} />
          <IdnInput t={t} label="Sous-titre" value={subtitle} onChangeText={setSubtitle} />
          {tpl.data.map((f) =>
            f.type === 'date' ? (
              <IdnDateInput
                key={f.key}
                t={t}
                label={f.label}
                value={data[f.key] ?? ''}
                onChange={(v) => setData((d) => ({ ...d, [f.key]: v }))}
              />
            ) : (
              <IdnInput
                key={f.key}
                t={t}
                label={f.label}
                placeholder={f.placeholder}
                value={data[f.key] ?? ''}
                onChangeText={(v) => setData((d) => ({ ...d, [f.key]: v }))}
              />
            ),
          )}
          {tpl.backData.length > 0 ? (
            <Text style={{ fontSize: idnTokens.text.caption, color: t.muted, letterSpacing: 1.2, fontWeight: '600', marginTop: 6 }}>VERSO</Text>
          ) : null}
          {tpl.backData.map((f) =>
            f.type === 'date' ? (
              <IdnDateInput
                key={f.key}
                t={t}
                label={f.label}
                value={backData[f.key] ?? ''}
                onChange={(v) => setBackData((d) => ({ ...d, [f.key]: v }))}
              />
            ) : (
              <IdnInput
                key={f.key}
                t={t}
                label={f.label}
                placeholder={f.placeholder}
                value={backData[f.key] ?? ''}
                onChangeText={(v) => setBackData((d) => ({ ...d, [f.key]: v }))}
              />
            ),
          )}
        </View>
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
        <View style={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 22), borderTopWidth: 1, borderTopColor: t.borderSoft, backgroundColor: t.bg, flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <IdnButton t={t} variant="ghost" size="lg" full onPress={() => router.back()} disabled={submitting}>
              Annuler
            </IdnButton>
          </View>
          <View style={{ flex: 1 }}>
            <IdnButton
              t={t}
              variant="primary"
              size="lg"
              full
              leadIcon={<Icon name="plus" size={16} color="#fff" />}
              onPress={submit}
              disabled={submitting}
            >
              {submitting ? '…' : 'Créer'}
            </IdnButton>
          </View>
        </View>
      </KeyboardStickyView>
    </View>
  );
}
