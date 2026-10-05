import React from 'react';
import { Linking, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useConvexAuth, useQuery } from 'convex/react';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { IdnMark } from '@/design/mark';
import { Icon, type IconName } from '@/design/icons';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { IdnButton } from '@/design/components/idn-button';
import { Card, ErrorNote, Note, Overline, Row } from '@/design/components/list';
import { IdnLottie } from '@/design/components/lottie';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { consentRedirect, scopeLabel } from '@/lib/consent-scopes';

type Phase = 'ask' | 'sending' | 'granted' | 'denied';

/**
 * Consentement « Se connecter avec IDN » (prototype « consent »).
 *
 * Ouvert par lien profond `idn://consent?consent_code=…&client_id=…&scope=…`,
 * relais de la demande posée par /oauth2/authorize. La décision part vers
 * `/oauth2/consent` avec la session de l'app ; le fournisseur renvoie l'URL de
 * retour de l'application partenaire, qu'on ouvre ensuite.
 */
export default function Consent() {
  const t = useIdnTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ consent_code?: string; client_id?: string; clientId?: string; scope?: string }>();
  const consentCode = params.consent_code ?? null;
  const clientId = params.client_id ?? params.clientId ?? '';
  const { isAuthenticated } = useConvexAuth();
  const app = useQuery(api.oauthAuthorize.getAppForConsent, clientId ? { clientId } : 'skip');
  const me = useQuery(api.profile.getCurrentUser, isAuthenticated ? {} : 'skip');
  const [phase, setPhase] = React.useState<Phase>('ask');
  const [error, setError] = React.useState<string | null>(null);

  const scopes = (params.scope ? params.scope.split(' ') : app?.requestedScopes ?? []).filter(Boolean);
  const loa = me?.profile?.loa ?? 1;
  const tooLow = !!app && loa < app.requiredLoA;
  const host = (() => {
    try {
      return app?.redirectUris[0] ? new URL(app.redirectUris[0]).host : null;
    } catch {
      return null;
    }
  })();

  async function decide(accept: boolean) {
    setPhase('sending');
    setError(null);
    try {
      const res = await authClient.$fetch('/oauth2/consent', { method: 'POST', body: { accept, consent_code: consentCode } });
      const target = consentRedirect(res);
      if ((res as { error?: unknown })?.error || !target) {
        setPhase('ask');
        setError(
          consentCode
            ? 'La demande a expiré ou a déjà été traitée. Relance la connexion depuis l’application partenaire.'
            : 'Aucune demande d’autorisation en cours. Relance la connexion depuis l’application partenaire.',
        );
        return;
      }
      setPhase(accept ? 'granted' : 'denied');
      setTimeout(() => void Linking.openURL(target), 1200);
    } catch {
      setPhase('ask');
      setError('Décision non transmise. Vérifie ta connexion et réessaie.');
    }
  }

  const close = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'));
  const appName = app?.name ?? (app === null ? 'Application inconnue' : '…');

  if (phase === 'granted' || phase === 'denied' || phase === 'sending') {
    return (
      <Screen scroll={false} header={<AppBar title="Autorisation" />}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {phase === 'sending' ? (
            <IdnLottie name="loader" size={100} loop label="Envoi de ta décision" />
          ) : phase === 'granted' ? (
            <IdnLottie name="success" size={128} label="Accès autorisé" />
          ) : (
            <View style={{ width: 80, height: 80, borderRadius: 9999, backgroundColor: t.redBadge, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="close" size={36} color={t.redText} strokeWidth={2.5} />
            </View>
          )}
          <Text accessibilityLiveRegion="polite" style={{ marginTop: 16, fontSize: 20, fontWeight: '600', color: t.ink, textAlign: 'center' }}>
            {phase === 'sending' ? 'Transmission…' : phase === 'granted' ? 'Accès autorisé' : 'Accès refusé'}
          </Text>
          <Text style={{ marginTop: 6, fontSize: 14, color: t.muted, textAlign: 'center' }}>
            {phase === 'sending' ? '' : `Retour vers ${appName}…`}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      header={<AppBar title="Autorisation" onBack={close} backIcon="close" />}
      footer={
        !app ? undefined : tooLow ? (
          <>
            <IdnButton t={t} full onPress={() => router.push(app.requiredLoA >= 3 ? '/kyc/level3' : '/kyc/intro')}>Vérifier mon identité</IdnButton>
            <IdnButton t={t} variant="ghost" full onPress={() => void decide(false)}>Refuser</IdnButton>
          </>
        ) : (
          <>
            <IdnButton t={t} full onPress={() => void decide(true)} disabled={!app.userAllowed}>Autoriser</IdnButton>
            <IdnButton t={t} variant="ghost" full onPress={() => void decide(false)}>Refuser</IdnButton>
          </>
        )
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 24 }}>
        <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: t.blue, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {app?.icon ? (
            <Image source={{ uri: app.icon }} style={{ width: 48, height: 48 }} accessibilityLabel={`Logo de ${appName}`} />
          ) : (
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{appName.slice(0, 2).toUpperCase()}</Text>
          )}
        </View>
        <View style={{ width: 36, borderTopWidth: 2, borderStyle: 'dashed', borderColor: t.border }} />
        <IdnMark size={48} />
      </View>
      <Text accessibilityRole="header" style={{ marginTop: 16, fontSize: 20, fontWeight: '600', lineHeight: 26, color: t.ink, textAlign: 'center' }}>
        {appName} demande l’accès à ton identité IDN
      </Text>
      {app ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6 }}>
          <Icon name="shield" size={14} color={app.env === 'production' ? t.greenText : t.muted} />
          <Text style={{ fontSize: 13, color: app.env === 'production' ? t.greenText : t.muted }}>
            {[host, app.env === 'production' ? 'Partenaire vérifié par l’État' : 'Application en test'].filter(Boolean).join(' · ')}
          </Text>
        </View>
      ) : null}

      {app === null ? <ErrorNote>Cette application n’est pas enregistrée auprès d’IDN. Ne partage rien.</ErrorNote> : null}
      {app && !app.userAllowed ? <ErrorNote>Cette application de test n’est pas ouverte à ton compte.</ErrorNote> : null}
      {tooLow ? <ErrorNote>{`Cette application exige le Niveau ${app?.requiredLoA}. Ton compte est au Niveau ${loa}.`}</ErrorNote> : null}

      <Overline style={{ marginTop: 24, marginBottom: 10 }}>Données demandées</Overline>
      <Card>
        {scopes.map((s) => {
          const meta = scopeLabel(s, me?.email);
          return <Row key={s} icon={meta.icon as IconName} tone="green" title={meta.title} sub={meta.sub} />;
        })}
      </Card>
      <Note>
        {`Connecté en tant que ${me?.email ?? '…'}. Tu pourras révoquer cet accès dans Profil, rubrique Applications autorisées.`}
      </Note>
      <ErrorNote>{error}</ErrorNote>
    </Screen>
  );
}
