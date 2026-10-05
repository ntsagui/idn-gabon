import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { Card, Overline, ScreenTitle } from '@/design/components/list';
import { slotsByDay } from '@/lib/level3-view';
import type { Id } from '@repo/backend/convex/_generated/dataModel';

export type AvailableSlot = { _id: Id<'level3AppointmentSlot'>; startsAt: number; endsAt: number; controllerName: string };

const TZ = 'Africa/Libreville';
const WEEKDAY = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, weekday: 'short' });
const DAYNUM = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: 'numeric' });
const LONG = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
const TIME = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });

export function slotSummary(slot: AvailableSlot): string {
  const d = LONG.format(slot.startsAt);
  return `${d.charAt(0).toUpperCase()}${d.slice(1)} à ${TIME.format(slot.startsAt)}`;
}

/** Choix du créneau (prototype « l3-slot ») : jours puis horaires disponibles. */
export function Level3Slots({ slots, selected, onSelect }: { slots: AvailableSlot[] | undefined; selected: AvailableSlot | null; onSelect: (s: AvailableSlot) => void }) {
  const t = useIdnTheme();
  const days = React.useMemo(() => slotsByDay(slots ?? []), [slots]);
  const [day, setDay] = React.useState<string | null>(null);
  const activeDay = days.find((d) => d.day === day) ?? days[0];
  const durations = [...new Set((slots ?? []).map((s) => Math.round((s.endsAt - s.startsAt) / 60_000)))];

  return (
    <>
      <ScreenTitle
        title="Quand es-tu disponible ?"
        lead={`Entretien de ${durations.length === 1 ? `${durations[0]} min` : 'quelques minutes'} · heure de Libreville`}
      />
      {slots === undefined ? (
        <Text style={{ marginTop: 24, color: t.muted }}>Chargement des créneaux…</Text>
      ) : days.length === 0 ? (
        <Card padded style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: t.ink }}>Aucun créneau disponible pour le moment</Text>
          <Text style={{ marginTop: 4, fontSize: 13, lineHeight: 19, color: t.muted }}>
            Les contrôleurs publient régulièrement de nouveaux créneaux. Ta demande reste ouverte : reviens plus tard ou active les notifications.
          </Text>
        </Card>
      ) : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 20 }} accessibilityRole="tablist">
            {days.slice(0, 14).map((d) => {
              const sel = d.day === activeDay?.day;
              const ts = d.slots[0]!.startsAt;
              return (
                <Pressable
                  key={d.day}
                  onPress={() => setDay(d.day)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: sel }}
                  accessibilityLabel={LONG.format(ts)}
                  style={{ width: 46, paddingVertical: 8, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: sel ? t.green : t.border, backgroundColor: sel ? t.green : t.surface }}
                >
                  <Text style={{ fontSize: 11, color: sel ? '#D9EADF' : t.muted }}>{WEEKDAY.format(ts)}</Text>
                  <Text style={{ fontSize: 17, fontWeight: '600', color: sel ? '#fff' : t.ink }}>{DAYNUM.format(ts)}</Text>
                </Pressable>
              );
            })}
          </View>
          {activeDay ? (
            <>
              <Overline style={{ marginTop: 20, marginBottom: 10 }}>{LONG.format(activeDay.slots[0]!.startsAt)}</Overline>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
                {activeDay.slots.map((s) => {
                  const sel = selected?._id === s._id;
                  return (
                    <View key={s._id} style={{ width: '33.333%', padding: 4 }}>
                      <Pressable
                        onPress={() => onSelect(s)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: sel }}
                        accessibilityLabel={`${TIME.format(s.startsAt)}, avec ${s.controllerName}`}
                        style={{ height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: sel ? 2 : 1, borderColor: sel ? t.green : t.border, backgroundColor: sel ? t.greenBadge : t.surface }}
                      >
                        <Text style={{ fontSize: 15, fontWeight: sel ? '600' : '400', color: sel ? t.greenText : t.ink }}>{TIME.format(s.startsAt)}</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}
        </>
      )}
    </>
  );
}
