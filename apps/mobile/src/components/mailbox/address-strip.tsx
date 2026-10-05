import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/design/text';
import * as Clipboard from 'expo-clipboard';
import { idnTokens } from '@/design/tokens';
import type { IdnTheme } from '@/design/tokens';
import { Icon } from '@/design/icons';
import type { MailAccount } from '@/data/mailbox';
import { iboiteFr } from '@/data/iboite-fr';
import { formatAddressLine } from '@/lib/iboite-adapter';

/**
 * Bandeau adresse compact, sous le sélecteur de compte.
 *
 * États :
 * - **Configuré** : icône `pinLoc` + ligne d'adresse + QR mono + bouton copier
 *   (l'ensemble est cliquable et rouvre le sheet de configuration pour
 *   modifier).
 * - **Non configuré** : CTA primary "Configurer mon adresse" avec sous-texte.
 *
 * Au Gabon les adresses formelles sont rares ; le citoyen configure la
 * sienne via géolocalisation native (`expo-location`) ou saisie manuelle.
 */
export function AddressStrip({
  acc,
  t,
  onConfigure,
}: {
  acc: MailAccount;
  t: IdnTheme;
  onConfigure: () => void;
}) {
  const line = formatAddressLine(acc.addr);

  if (!acc.addr.isConfigured || !line) {
    return (
      <Pressable
        onPress={onConfigure}
        style={{
          marginHorizontal: 22,
          marginTop: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingVertical: 10,
          paddingHorizontal: 12,
          backgroundColor: t.dark ? '#0F2A18' : idnTokens.greenSoft,
          borderWidth: 1,
          borderColor: t.dark ? '#1B3F2A' : '#C5E0CC',
          borderStyle: 'dashed',
          borderRadius: 10,
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 9999,
            backgroundColor: idnTokens.green,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="pinLoc" size={14} color="#fff" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 12, color: idnTokens.green, fontWeight: '600' }}>
            {iboiteFr.account.configurePrompt}
          </Text>
          <Text style={{ fontSize: 10, color: t.muted, marginTop: 1 }}>
            {iboiteFr.account.configureHint}
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View
      style={{
        marginHorizontal: 22,
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: t.surface,
        borderWidth: 1,
        borderColor: t.border,
        borderRadius: 10,
      }}
    >
      <Icon name="pinLoc" size={14} color={idnTokens.green} />
      <Pressable
        onPress={onConfigure}
        accessibilityLabel={iboiteFr.account.editAddress}
        style={{ flex: 1, minWidth: 0 }}
      >
        <Text numberOfLines={1} style={{ fontSize: 11, color: t.ink, fontWeight: '500' }}>
          {line}
        </Text>
        <Text style={{ fontSize: 10, color: t.muted, fontFamily: idnTokens.mono }}>{acc.addr.qr}</Text>
      </Pressable>
      <Pressable
        onPress={async () => {
          try {
            await Clipboard.setStringAsync(`${line}\n${acc.addr.qr}`);
          } catch {
            /* silent */
          }
        }}
        accessibilityLabel={iboiteFr.account.copyAddress}
        style={{
          width: 26,
          height: 26,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: t.borderSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="copy" size={14} color={t.muted} />
      </Pressable>
    </View>
  );
}
