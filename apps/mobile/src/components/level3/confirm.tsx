import React from 'react';
import { View } from 'react-native';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { Card, DetailRow, IconTile, Note } from '@/design/components/list';

const TZ = 'Africa/Libreville';
const DATE = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const TIME = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Rendez-vous réservé (prototype « l3-confirm »). */
export function Level3Confirm({ scheduledAt, scheduledEndAt, controllerName, reference }: { scheduledAt: number; scheduledEndAt?: number; controllerName?: string; reference: string }) {
  const t = useIdnTheme();
  const minutes = scheduledEndAt ? Math.round((scheduledEndAt - scheduledAt) / 60_000) : undefined;
  return (
    <>
      <View style={{ alignItems: 'center', marginTop: 24 }}>
        <View style={{ width: 64, height: 64, borderRadius: 9999, backgroundColor: t.greenBadge, alignItems: 'center', justifyContent: 'center' }}>
          <IconTile icon="calendarCheck" tone="green" size={44} />
        </View>
        <Text accessibilityRole="header" style={{ marginTop: 12, fontSize: 20, fontWeight: '600', color: t.ink }}>Rendez-vous réservé</Text>
        <Text style={{ marginTop: 4, fontSize: 14, color: t.muted, textAlign: 'center' }}>
          {/* Le backend n'envoie le rappel que si le rendez-vous est à plus de 24 h. */}
          {scheduledAt - Date.now() > 24 * 3_600_000 + 60_000 ? 'Un rappel te sera envoyé la veille.' : 'Une confirmation t’a été envoyée par notification et e-mail.'}
        </Text>
      </View>
      <Card style={{ marginTop: 20 }}>
        <DetailRow label="Date" value={cap(DATE.format(scheduledAt))} />
        <DetailRow label="Heure" value={`${TIME.format(scheduledAt)}${minutes ? ` · ${minutes} min` : ''}`} />
        <DetailRow label="Format" value="Visio dans l’application" />
        <DetailRow label="Contrôleur" value={controllerName ?? 'Contrôleur IDN'} />
        <DetailRow label="Référence" value={reference} mono />
      </Card>
      <Note>La salle d’attente ouvre 15 min avant l’heure. Garde ta CNI à portée de main.</Note>
    </>
  );
}
