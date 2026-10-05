import React from 'react';
import { Pressable } from 'react-native';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { IconTile, useToneColors } from '@/design/components/list';
import type { DocFolder } from '@/data/documents';
import { plural } from './doc-format';

/** Tuile de dossier de la grille iDocument (prototype `.folder`). */
export function FolderCard({ f, count, hasExpiring, onPress }: { f: DocFolder; count: number; hasExpiring?: boolean; onPress?: () => void }) {
  const t = useIdnTheme();
  const yellow = useToneColors('yellow');
  const sub = plural(count, 'document', 'documents');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${f.label}, ${sub}${hasExpiring ? ', une expiration approche' : ''}`}
      style={({ pressed }) => ({
        flex: 1, alignItems: 'center', gap: 6, paddingVertical: 16, paddingHorizontal: 8,
        borderRadius: 14, borderWidth: 1, borderColor: t.border, backgroundColor: pressed ? t.surface2 : t.surface,
      })}
    >
      <IconTile icon={f.icon} tone={count > 0 ? 'green' : 'neutral'} size={40} />
      <Text style={{ fontSize: 14, fontWeight: '600', color: t.ink }}>{f.label}</Text>
      <Text numberOfLines={1} style={{ fontSize: 12, color: hasExpiring ? yellow.fg : t.muted, fontWeight: hasExpiring ? '600' : '400' }}>
        {hasExpiring ? 'Expiration proche' : sub}
      </Text>
    </Pressable>
  );
}
