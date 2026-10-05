import React from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAction, useConvexAuth, useMutation, useQuery } from 'convex/react';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { Icon } from '@/design/icons';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { Stepper } from '@/design/components/stepper';
import { IdnButton } from '@/design/components/idn-button';
import { ErrorNote } from '@/design/components/list';
import { NativeLiveKitRoom } from '@/components/native-livekit-room';
import { Level3Intro } from '@/components/level3/intro';
import { Level3Slots, slotSummary, type AvailableSlot } from '@/components/level3/slots';
import { Level3Confirm } from '@/components/level3/confirm';
import { Level3Waiting } from '@/components/level3/waiting';
import { Level3Result } from '@/components/level3/result';
import { api } from '@/lib/api';
import { formatLevel3Time } from '@/lib/level3';
import { level3Ref, level3View } from '@/lib/level3-view';

type Credentials = { serverUrl: string; token: string; roomName: string };

const L3_STEPS = ['Créneau', 'Confirmation', 'Équipement', 'Entretien'];

function errorMessage(err: unknown, fallback: string): string {
  const data = (err as { data?: { message?: string } })?.data;
  return data?.message ?? (err instanceof Error ? err.message : fallback);
}

/** Parcours Niveau 3 : présentation, créneau, confirmation, salle d'attente, visio, résultat. */
export default function LevelThree() {
  const t = useIdnTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useConvexAuth();
  const q = isAuthenticated ? {} : 'skip';
  const me = useQuery(api.profile.getCurrentUser, q);
  const verification = useQuery(api.level3.getMine, q);
  const request = useMutation(api.verification.request);
  const cancel = useMutation(api.level3.cancel);
  const book = useMutation(api.level3.scheduling.book);
  const issueJoinToken = useAction(api.level3.livekit.issueJoinToken);

  const [choosingSlot, setChoosingSlot] = React.useState(false);
  const [selected, setSelected] = React.useState<AvailableSlot | null>(null);
  const [pending, setPending] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);
  const [credentials, setCredentials] = React.useState<Credentials | null>(null);
  const [callStart, setCallStart] = React.useState(0);
  const [now, setNow] = React.useState(Date.now());

  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), credentials ? 1_000 : 15_000);
    return () => clearInterval(timer);
  }, [credentials]);

  const loa = me?.profile?.loa ?? 1;
  const view = me === undefined || verification === undefined ? null : level3View({ loa, verification, now, choosingSlot });
  const slots = useQuery(api.level3.scheduling.listAvailable, view === 'slots' || view === 'intro' ? {} : 'skip');
  const shortestMin = slots?.length ? Math.min(...slots.map((s) => Math.round((s.endsAt - s.startsAt) / 60_000))) : undefined;

  async function run(key: string, fn: () => Promise<void>, fallback: string) {
    setPending(key);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err, fallback));
    } finally {
      setPending(null);
    }
  }

  const startRequest = () =>
    run('start', async () => {
      await request({ targetLoa: 3 });
      setChoosingSlot(true);
    }, 'Impossible d’ouvrir la demande.');

  const bookSelected = () =>
    run('book', async () => {
      if (!verification || !selected) return;
      await book({ verificationId: verification._id, slotId: selected._id });
      setChoosingSlot(false);
      setSelected(null);
    }, 'Ce créneau n’est plus disponible.');

  function confirmCancel() {
    if (!verification) return;
    Alert.alert('Annuler ta demande ?', 'Le créneau sera libéré. Tu pourras refaire une demande plus tard.', [
      { text: 'Conserver', style: 'cancel' },
      { text: 'Annuler la demande', style: 'destructive', onPress: () => void run('cancel', async () => { await cancel({ verificationId: verification._id }); }, 'Annulation impossible.') },
    ]);
  }

  const addToCalendar = () =>
    run('calendar', async () => {
      if (!verification?.scheduledAt || !verification.scheduledEndAt) return;
      // Éditeur d'évènement du système : l'utilisateur valide lui-même l'ajout.
      // Chargé à la demande : le module natif n'est sollicité qu'à l'appui.
      const Calendar = await import('expo-calendar');
      await Calendar.createEventInCalendarAsync({
        title: 'Entretien Niveau 3 · Identité Numérique',
        startDate: new Date(verification.scheduledAt),
        endDate: new Date(verification.scheduledEndAt),
        notes: `Entretien vidéo dans l’application IDN${verification.controllerName ? ` avec ${verification.controllerName}` : ''}. Garde ta CNI à portée de main. Référence ${level3Ref(verification._id)}.`,
        alarms: [{ relativeOffset: -15 }],
      });
    }, 'Impossible de préparer l’évènement.');

  const join = () =>
    run('join', async () => {
      if (!verification) return;
      setCredentials(await issueJoinToken({ verificationId: verification._id }));
      setCallStart(Date.now());
    }, 'Connexion à l’entretien impossible.');

  // ── Visio : plein écran sombre ───────────────────────────────────────────
  if (credentials && verification && (verification.status === 'claimed' || verification.status === 'in_interview')) {
    const elapsed = Math.max(0, Math.floor((now - callStart) / 1000));
    const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
    return (
      <View style={{ flex: 1, backgroundColor: '#0E110D', paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 12) }}>
        <StatusBar style="light" />
        <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>Entretien Niveau 3</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Icon name="lock" size={12} color="rgba(255,255,255,0.7)" />
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Chiffré · {mmss}</Text>
          </View>
        </View>
        <NativeLiveKitRoom
          credentials={credentials}
          controllerName={verification.controllerName}
          onLeave={() => setCredentials(null)}
          onError={(message) => {
            // Une fin de salle (raccrocher, décision du contrôleur) n'est pas une erreur.
            if (/disconnect/i.test(message)) return;
            setCredentials(null);
            setError(`L’entretien vidéo s’est interrompu : ${message}`);
          }}
        />
      </View>
    );
  }

  if (!view) return <Screen header={<AppBar title="Niveau 3 · Élevé" onBack={() => router.back()} />}>{null}</Screen>;

  const back = () => (choosingSlot && verification?.scheduledAt ? setChoosingSlot(false) : router.back());
  const stepIndex = view === 'slots' ? 0 : view === 'confirm' ? 1 : view === 'waiting' ? 2 : -1;
  const title = view === 'slots' ? 'Choisir un créneau' : view === 'confirm' ? 'Rendez-vous' : view === 'waiting' ? 'Salle d’attente' : 'Niveau 3 · Élevé';
  const joinOpensAt = verification?.joinOpensAt ?? (verification?.scheduledAt ? verification.scheduledAt - 15 * 60_000 : undefined);

  let footer: React.ReactNode = null;
  if (view === 'needs-level2') {
    footer = <IdnButton t={t} full onPress={() => router.replace('/kyc/intro?target=3' as never)}>Vérifier d’abord mon identité</IdnButton>;
  } else if (view === 'intro' || view === 'rejected') {
    footer = <IdnButton t={t} full onPress={startRequest} loading={pending === 'start'}>{view === 'rejected' ? 'Refaire une demande' : 'Choisir un créneau'}</IdnButton>;
  } else if (view === 'slots') {
    footer = (
      <>
        {selected ? <Text style={{ textAlign: 'center', fontSize: 14, fontWeight: '600', color: t.ink }}>{slotSummary(selected)}</Text> : null}
        <IdnButton t={t} full onPress={bookSelected} disabled={!selected} loading={pending === 'book'}>Réserver ce créneau</IdnButton>
        {verification && !verification.scheduledAt ? (
          <Pressable onPress={confirmCancel} accessibilityRole="button" style={{ alignSelf: 'center', padding: 6 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: t.redText }}>Annuler ma demande</Text>
          </Pressable>
        ) : null}
      </>
    );
  } else if (view === 'confirm') {
    footer = (
      <>
        <IdnButton t={t} full disabled>{joinOpensAt ? `Salle d’attente à partir de ${formatLevel3Time(joinOpensAt)}` : 'Rejoindre la salle d’attente'}</IdnButton>
        <IdnButton t={t} variant="ghost" full onPress={() => setChoosingSlot(true)}>Modifier le créneau</IdnButton>
      </>
    );
  } else if (view === 'waiting') {
    footer = (
      <IdnButton t={t} full onPress={join} disabled={!ready} loading={pending === 'join'} leadIcon={<Icon name="video" size={18} color="#fff" />}>
        Entrer en visio
      </IdnButton>
    );
  } else if (view === 'approved') {
    footer = (
      <>
        <IdnButton t={t} full onPress={() => router.replace('/(tabs)/home')}>Retour à l’accueil</IdnButton>
        <IdnButton t={t} variant="ghost" full onPress={() => router.replace('/id-card')}>Voir ma carte</IdnButton>
      </>
    );
  }

  return (
    <Screen
      header={<AppBar title={title} onBack={back} />}
      subHeader={stepIndex >= 0 ? <Stepper steps={L3_STEPS} current={stepIndex} /> : undefined}
      footer={footer}
    >
      {view === 'intro' || view === 'needs-level2' ? <Level3Intro needsLevel2={view === 'needs-level2'} durationMin={shortestMin} /> : null}
      {view === 'slots' ? <Level3Slots slots={slots} selected={selected} onSelect={setSelected} /> : null}
      {view === 'confirm' && verification?.scheduledAt ? (
        <>
          <Level3Confirm scheduledAt={verification.scheduledAt} scheduledEndAt={verification.scheduledEndAt} controllerName={verification.controllerName} reference={level3Ref(verification._id)} />
          <IdnButton t={t} variant="secondary" full style={{ marginTop: 16 }} onPress={addToCalendar} loading={pending === 'calendar'} leadIcon={<Icon name="calendarPlus" size={16} color={t.ink} />}>
            Ajouter au calendrier
          </IdnButton>
          <Pressable onPress={confirmCancel} accessibilityRole="button" style={{ alignSelf: 'center', padding: 10, marginTop: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: t.redText }}>Annuler le rendez-vous</Text>
          </Pressable>
        </>
      ) : null}
      {view === 'waiting' ? <Level3Waiting onReadyChange={setReady} /> : null}
      {view === 'approved' ? <Level3Result approved controllerName={verification?.controllerName} /> : null}
      {view === 'rejected' ? <Level3Result approved={false} reason={verification?.rejectionReason} /> : null}
      <ErrorNote>{error}</ErrorNote>
    </Screen>
  );
}
